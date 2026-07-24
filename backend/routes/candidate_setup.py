# routes/candidate_setup.py
# Migrated from wbl-backend/fapi/api/routes/candidate_setup.py
# Uses AI prep MySQL DB (raw queries) + WBL JWT auth (shared secret).

import json
import uuid
import logging
import requests
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request, Depends, status
from pydantic import BaseModel

from db.connection import get_db_connection
from utils.security import encrypt, decrypt
from utils.wbl_auth import get_wbl_user_email
from services.resume_source import save_resume_for_session, fetch_resume_dict
from utils.wbl_auth import get_wbl_user_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/candidate", tags=["Candidate Setup"])

# ─────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────

class ResumeCreate(BaseModel):
    resume_json: dict
    file_name: Optional[str] = None

class ResumeUpdate(BaseModel):
    resume_json: dict
    file_name: Optional[str] = None

class APIKeyCreate(BaseModel):
    model_config = {"protected_namespaces": ()}
    provider_name: str
    api_key: str
    model_name: Optional[str] = None
    voice_enabled: bool = False


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _mask_key(raw: str) -> str:
    if len(raw) > 4:
        return "*" * (len(raw) - 4) + raw[-4:]
    return "****"


def _detect_provider(api_key: str) -> str:
    if api_key.startswith("sk-ant"):
        return "claude"
    if api_key.startswith("sk-") or api_key.startswith("sk-proj-"):
        return "openai"
    if api_key.startswith("AIzaSy"):
        return "gemini"
    return "unknown"


def _validate_api_key(provider: str, api_key: str) -> tuple[bool, bool]:
    """Returns (is_valid, supports_voice). Raises HTTPException on invalid key."""
    is_valid = False
    supports_voice = False
    try:
        if provider == "openai":
            res = requests.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=5,
            )
            if res.status_code == 200:
                is_valid = True
                models = res.json().get("data", [])
                supports_voice = any(m["id"] == "whisper-1" for m in models)
        elif provider in ("claude", "anthropic"):
            res = requests.get(
                "https://api.anthropic.com/v1/models",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                timeout=5,
            )
            if res.status_code == 200:
                is_valid = True
                supports_voice = True
        elif provider in ("gemini", "google"):
            res = requests.get(
                f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}",
                timeout=5,
            )
            if res.status_code == 200:
                is_valid = True
                models = res.json().get("models", [])
                supports_voice = any("gemini-1.5" in m["name"] for m in models)
        else:
            # Unknown provider — skip validation
            is_valid = True
            supports_voice = True
    except Exception as e:
        logger.error(f"Error validating API key for {provider}: {e}")
    return is_valid, supports_voice


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

def _get_candidate_id(cursor, email: str) -> int:
    # Safely resolve candidate ID using the authuser uname (which is the email from JWT)
    cursor.execute(
        """
        SELECT c.id 
        FROM candidate c 
        JOIN authuser a ON c.email = a.uname 
        WHERE a.uname = %s
        """, 
        (email,)
    )
    row = cursor.fetchone()
    
    # Fallback if the join fails (sometimes email in candidate is different or null, but authuser matches candidate by other means, though usually email is used)
    if not row:
        cursor.execute("SELECT id FROM candidate WHERE email = %s", (email,))
        row = cursor.fetchone()
        
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate profile not found for email: {email}"
        )
    return row["id"]


@router.get("/me")
def get_current_user(user_email: str = Depends(get_wbl_user_email)):
    """Fetch the real WBL candidate ID and full name for the logged-in user."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            candidate_id = _get_candidate_id(cursor, user_email)
            cursor.execute("SELECT full_name FROM candidate WHERE id = %s", (candidate_id,))
            row = cursor.fetchone()
            name = row["full_name"] if row and row["full_name"] else "Candidate"
        
        return {
            "session_id": str(candidate_id),
            "candidate_name": name,
            "candidate_email": user_email
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_current_user error for {user_email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch candidate profile")
    finally:
        conn.close()


@router.get("/setup-status")
def get_setup_status(
    user_email: str = Depends(get_wbl_user_email),
):
    """Check whether resume and API keys are configured for this user."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            candidate_id = _get_candidate_id(cursor, user_email)

            cursor.execute(
                "SELECT id FROM candidate_marketing WHERE candidate_id = %s AND candidate_json IS NOT NULL", (candidate_id,)
            )
            resume_exists = cursor.fetchone() is not None

            cursor.execute(
                "SELECT id FROM candidate_llm_api_keys WHERE candidate_id = %s LIMIT 1",
                (candidate_id,),
            )
            keys_exist = cursor.fetchone() is not None

        return {
            "resume_uploaded": resume_exists,
            "api_keys_configured": keys_exist,
            "setup_complete": resume_exists and keys_exist,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"setup-status error for {user_email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch setup status")
    finally:
        conn.close()


@router.post("/resume", status_code=201)
def upload_resume(
    body: ResumeCreate,
    user_email: str = Depends(get_wbl_user_email),
):
    """Upload or replace the resume JSON for this user."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            candidate_id = _get_candidate_id(cursor, user_email)
        conn.close()

        save_resume_for_session(str(candidate_id), body.resume_json)
        updated_resume = fetch_resume_dict(str(candidate_id))
        
        return {"resume_json": updated_resume, "file_name": body.file_name}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"upload_resume error for {user_email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save resume")
    finally:
        conn.close()


@router.get("/resume")
def get_resume(user_email: str = Depends(get_wbl_user_email)):
    """Get the stored resume JSON for this user."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            candidate_id = _get_candidate_id(cursor, user_email)
        conn.close()

        resume_data = fetch_resume_dict(str(candidate_id))
        if not resume_data:
            raise HTTPException(status_code=404, detail="Resume not found")

        return {"resume_json": resume_data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_resume error for {user_email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch resume")
    finally:
        conn.close()


@router.put("/resume")
def update_resume(
    body: ResumeUpdate,
    user_email: str = Depends(get_wbl_user_email),
):
    """Update the resume JSON for this user."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            candidate_id = _get_candidate_id(cursor, user_email)
        conn.close()

        save_resume_for_session(str(candidate_id), body.resume_json)
        updated_resume = fetch_resume_dict(str(candidate_id))
        
        return {"resume_json": updated_resume, "file_name": body.file_name}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"update_resume error for {user_email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update resume")
    finally:
        conn.close()


@router.post("/api-keys", status_code=201)
def add_api_key(
    body: APIKeyCreate,
    user_email: str = Depends(get_wbl_user_email),
):
    """Add a new API key (validates with provider before storing)."""
    provider = body.provider_name.lower()
    is_valid, supports_voice = _validate_api_key(provider, body.api_key)

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid API Key")
    if body.voice_enabled and not supports_voice:
        raise HTTPException(
            status_code=400, detail="API key does not support voice processing"
        )

    encrypted_key = encrypt(body.api_key)

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            candidate_id = _get_candidate_id(cursor, user_email)
            # Check for exact duplicate (same user + provider + model + key)
            cursor.execute(
                """SELECT id FROM candidate_llm_api_keys
                   WHERE candidate_id = %s AND provider_name = %s AND model_name = %s AND api_key = %s""",
                (candidate_id, body.provider_name, body.model_name, encrypted_key),
            )
            dup = cursor.fetchone()
            if dup:
                cursor.execute(
                    "UPDATE candidate_llm_api_keys SET voice_enabled = %s WHERE id = %s",
                    (body.voice_enabled, dup["id"]),
                )
                conn.commit()
                cursor.execute(
                    "SELECT * FROM candidate_llm_api_keys WHERE id = %s", (dup["id"],)
                )
                row = cursor.fetchone()
            else:
                cursor.execute(
                    """INSERT INTO candidate_llm_api_keys
                       (candidate_id, provider_name, api_key, model_name, voice_enabled)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (
                        candidate_id,
                        body.provider_name,
                        encrypted_key,
                        body.model_name,
                        body.voice_enabled,
                    ),
                )
                conn.commit()
                cursor.execute(
                    "SELECT * FROM candidate_llm_api_keys WHERE id = %s",
                    (cursor.lastrowid,),
                )
                row = cursor.fetchone()

        # Mask the key before returning
        try:
            raw = decrypt(row["api_key"])
            row["masked_key"] = _mask_key(raw)
        except Exception:
            row["masked_key"] = "****"
        row.pop("api_key", None)
        return row
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"add_api_key error for {user_email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save API key")
    finally:
        conn.close()


@router.get("/api-keys")
def list_api_keys(user_email: str = Depends(get_wbl_user_email)):
    """List all API keys for this user (keys are masked)."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            candidate_id = _get_candidate_id(cursor, user_email)
            cursor.execute(
                "SELECT * FROM candidate_llm_api_keys WHERE candidate_id = %s", (candidate_id,)
            )
            rows = cursor.fetchall()

        result = []
        for row in rows:
            try:
                raw = decrypt(row["api_key"])
                row["masked_key"] = _mask_key(raw)
            except Exception:
                row["masked_key"] = "****"
            row.pop("api_key", None)
            result.append(row)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"list_api_keys error for {user_email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to list API keys")
    finally:
        conn.close()


@router.delete("/api-keys/{key_id}")
def delete_api_key(
    key_id: int,
    user_email: str = Depends(get_wbl_user_email),
):
    """Delete a specific API key by ID (only if it belongs to this user)."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            candidate_id = _get_candidate_id(cursor, user_email)
            cursor.execute(
                "SELECT id FROM candidate_llm_api_keys WHERE id = %s AND candidate_id = %s",
                (key_id, candidate_id),
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="API key not found")
            cursor.execute(
                "DELETE FROM candidate_llm_api_keys WHERE id = %s", (key_id,)
            )
        conn.commit()
        return {"message": "API key deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"delete_api_key error for {user_email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete API key")
    finally:
        conn.close()


@router.post("/generate-prep-token")
def generate_prep_token(user_email: str = Depends(get_wbl_user_email)):
    """
    Generate a one-time token (valid 5 mins) that the AI prep frontend
    can exchange via /sync-data to get resume + API keys.
    Stored in prep_tokens table (no Redis needed).
    """
    token = str(uuid.uuid4())
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Clean up any old tokens for this user first
            cursor.execute(
                "DELETE FROM prep_tokens WHERE user_id = %s", (user_email,)
            )
            cursor.execute(
                "INSERT INTO prep_tokens (token, user_id) VALUES (%s, %s)",
                (token, user_email),
            )
        conn.commit()
        return {"token": token}
    except Exception as e:
        logger.error(f"generate_prep_token error for {user_email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate prep token")
    finally:
        conn.close()


@router.get("/sync-data")
def sync_data(token: str):
    """
    Called by the AI prep frontend with a one-time prep token.
    Returns resume JSON + decrypted API keys + candidate name.
    Token expires after 5 minutes or first use.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT user_id, created_at FROM prep_tokens WHERE token = %s",
                (token,),
            )
            row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Check 5-minute TTL
        token_age_seconds = abs((datetime.now() - row["created_at"].replace(tzinfo=None)).total_seconds())
        if token_age_seconds > 300:
            with conn.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM prep_tokens WHERE token = %s", (token,)
                )
            conn.commit()
            raise HTTPException(status_code=401, detail="Token has expired")

        user_email = row["user_id"]

        # Delete token (one-time use)
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM prep_tokens WHERE token = %s", (token,))

        # Fetch candidate_id and resume/keys
        with conn.cursor() as cursor:
            candidate_id = _get_candidate_id(cursor, user_email)

            # Fetch resume
            cursor.execute(
                "SELECT candidate_json FROM candidate_marketing WHERE candidate_id = %s ORDER BY id DESC LIMIT 1",
                (candidate_id,),
            )
            resume_row = cursor.fetchone()

            # Fetch API keys
            cursor.execute(
                "SELECT provider_name, api_key, model_name, voice_enabled FROM candidate_llm_api_keys WHERE candidate_id = %s",
                (candidate_id,),
            )
            key_rows = cursor.fetchall()

        conn.commit()

        resume_json = None
        if resume_row:
            raw = resume_row["candidate_json"]
            if isinstance(raw, str):
                try:
                    resume_json = json.loads(raw)
                except:
                    pass
            else:
                resume_json = raw

        candidate_name = ""
        if resume_json:
            candidate_name = (
                resume_json.get("basics", {}).get("name")
                or resume_json.get("name", "")
                or ""
            )

        decrypted_keys = []
        for k in key_rows:
            try:
                raw = decrypt(k["api_key"])
                decrypted_keys.append({
                    "provider": k["provider_name"],
                    "key": raw,
                    "model": k["model_name"],
                    "voice_enabled": k["voice_enabled"],
                })
            except Exception as e:
                logger.error(f"Failed to decrypt key for {user_email}: {e}")

        return {
            "resume_json": resume_json,
            "api_keys": decrypted_keys,
            "candidate_name": candidate_name,
            "candidate_email": user_email,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"sync_data error: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync data")
    finally:
        conn.close()

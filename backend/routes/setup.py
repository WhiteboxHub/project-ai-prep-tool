import json
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from db.connection import get_db_connection
from utils.security import encrypt
import os
from openai import OpenAI

from services.resume_source import (
    fetch_resume_raw,
    fetch_resume_dict,
    save_resume_for_session,
    count_llm_keys_for_candidate,
    list_llm_keys_for_candidate,
    upsert_llm_api_key_row,
)

router = APIRouter(prefix="/api/setup", tags=["setup"])

EXTRACTION_STATUSES = {}


class ValidationRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    api_key: str
    api_provider: str
    session_id: str
    model_name: Optional[str] = None
    voice_enabled: bool = False

class SyncFromWblRequest(BaseModel):
    prep_token: str


# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────

def _get_candidate_marketing_id(cursor, candidate_id: int) -> int:
    """Get the candidate_marketing.id for a given candidate.id (numeric)."""
    cursor.execute(
        "SELECT id FROM candidate_marketing WHERE candidate_id = %s AND status = 'active' LIMIT 1",
        (candidate_id,),
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"No active candidate_marketing record found for candidate_id={candidate_id}"
        )
    return row["id"]


def _upsert_eval_login(conn, marketing_id: int):
    """Upsert aiprep_tool_evaluations row to track login count and last_login."""
    with conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO aiprep_tool_evaluations (candidate_id, login_count, last_login)
            VALUES (%s, 1, NOW())
            ON DUPLICATE KEY UPDATE
                login_count = login_count + 1,
                last_login  = NOW()
            """,
            (marketing_id,),
        )
    conn.commit()


# ─────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────

@router.post("/validate")
def validate_key(req: ValidationRequest):
    try:
        if req.api_provider.lower() == "openai":
            client = OpenAI(api_key=req.api_key)
            client.models.list()

        encrypted_key = encrypt(req.api_key)
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                marketing_id = int(req.session_id)
                cursor.execute(
                    "SELECT candidate_id FROM candidate_marketing WHERE id = %s",
                    (marketing_id,),
                )
                cm = cursor.fetchone()
                if not cm:
                    raise HTTPException(404, "Session/Candidate not found")
                candidate_id = cm["candidate_id"]
        finally:
            conn.close()

        upsert_llm_api_key_row(
            candidate_id,
            req.api_provider,
            encrypted_key,
            req.model_name,
            req.voice_enabled,
        )

        return {"message": "API Key validated and stored successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR:", str(e))
        raise HTTPException(400, "Invalid API Key")


class SetupInit(BaseModel):
    candidate_id: Optional[int] = None
    wbl_email: Optional[str] = None
    name: Optional[str] = None


def _resolve_or_create_session(cursor, data: SetupInit) -> int:
    """
    Resolves or creates a candidate_marketing record for the session.
    Returns the candidate_marketing.id.
    """
    if data.candidate_id is not None:
        # 1. candidate_id is directly provided
        cursor.execute("SELECT id FROM candidate WHERE id = %s", (data.candidate_id,))
        if not cursor.fetchone():
            raise HTTPException(404, "Candidate not found")
        
        # Check if candidate_marketing exists
        cursor.execute(
            "SELECT id FROM candidate_marketing WHERE candidate_id = %s AND status = 'active' LIMIT 1",
            (data.candidate_id,),
        )
        row = cursor.fetchone()
        if row:
            return row["id"]
        
        # If candidate exists but marketing doesn't, create a candidate_marketing row
        cursor.execute("SELECT email FROM candidate WHERE id = %s", (data.candidate_id,))
        c_row = cursor.fetchone()
        c_email = c_row["email"] if c_row else (data.wbl_email or "")
        
        cursor.execute(
            """
            INSERT INTO candidate_marketing (candidate_id, email, status, start_date)
            VALUES (%s, %s, 'active', CURRENT_DATE())
            """,
            (data.candidate_id, c_email),
        )
        return cursor.lastrowid

    # 2. candidate_id is NOT provided (fallback using wbl_email)
    if not data.wbl_email:
        raise HTTPException(400, "candidate_id or wbl_email is required")

    # Check candidate_marketing first
    cursor.execute(
        "SELECT id FROM candidate_marketing WHERE email = %s AND status = 'active' LIMIT 1",
        (data.wbl_email,),
    )
    row = cursor.fetchone()
    if row:
        return row["id"]

    # Check candidate by email
    cursor.execute("SELECT id FROM candidate WHERE email = %s LIMIT 1", (data.wbl_email,))
    row = cursor.fetchone()
    if row:
        cid = row["id"]
    else:
        # Create a new dummy candidate in candidate table
        cursor.execute("SELECT batchid FROM batch LIMIT 1")
        batch_row = cursor.fetchone()
        batch_id = batch_row["batchid"] if batch_row else 150
        
        cursor.execute(
            """
            INSERT INTO candidate (full_name, email, batchid, status)
            VALUES (%s, %s, %s, 'active')
            """,
            (data.name or "Candidate", data.wbl_email, batch_id),
        )
        cid = cursor.lastrowid

    # Create candidate_marketing row
    cursor.execute(
        """
        INSERT INTO candidate_marketing (candidate_id, email, status, start_date)
        VALUES (%s, %s, 'active', CURRENT_DATE())
        """,
        (cid, data.wbl_email),
    )
    return cursor.lastrowid


@router.post("/init")
def init_session(data: SetupInit):
    """
    Initialize a session for a candidate.
    session_id is always str(candidate_marketing.id).
    Tracks login in aiprep_tool_evaluations.
    """
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            marketing_id = _resolve_or_create_session(cursor, data)

        _upsert_eval_login(conn, marketing_id)

        return {"session_id": str(marketing_id)}
    except HTTPException:
        raise
    except Exception as e:
        print("ERROR init_session:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize session. Check database configuration: {e}",
        )
    finally:
        if conn:
            conn.close()


async def extract_latest_company_bg(session_id: str, resume_json: dict):
    from services.user_context import get_user_api_key
    from services.llm_service import call_llm_with_context
    from db.connection import get_db_connection
    import json as _json

    EXTRACTION_STATUSES[session_id] = "pending"
    api_key = get_user_api_key(session_id)
    if not api_key:
        EXTRACTION_STATUSES[session_id] = "failed"
        return

    prompt = f"""
    Extract the candidate's latest project details from the following resume JSON to populate an 18-field project explanation form.
    Return ONLY a JSON object with the following keys, populated with information if found in the resume, otherwise leave them as empty strings:
    - company_name
    - domain
    - background (1-2 sentences summarizing their experience)
    - skills (a list of strings)
    - product
    - architecture
    - business_value
    - role
    - business_problem
    - previous_system
    - key_problems
    - ai_techniques
    - agent_usage (must be exactly 'Agent', 'Hybrid', or 'None')
    - impact
    - evaluation_approach
    - challenges_learnings
    - learnings
    - future_roadmap

    Resume:
    {_json.dumps(resume_json)[:5000]}
    """

    try:
        res_str = await call_llm_with_context(
            user_id=session_id,
            prompt=prompt,
            system_prompt="You are an expert resume parser.",
            api_key=api_key,
            response_format="json_object",
        )

        res_str = res_str.strip()
        if res_str.startswith("```json"):
            res_str = res_str[7:]
        if res_str.startswith("```"):
            res_str = res_str[3:]
        if res_str.endswith("```"):
            res_str = res_str[:-3]

        data = json.loads(res_str)
        company_name     = data.get("company_name", "")
        domain           = data.get("domain", "")
        background       = data.get("background", "")
        skills           = data.get("skills", [])
        product          = data.get("product", "")
        architecture     = data.get("architecture", "")
        business_value   = data.get("business_value", "")
        role             = data.get("role", "")
        business_problem = data.get("business_problem", "")
        previous_system  = data.get("previous_system", "")
        key_problems     = data.get("key_problems", "")
        ai_techniques    = data.get("ai_techniques", "")
        agent_usage      = data.get("agent_usage", "None")
        impact           = data.get("impact", "")
        evaluation_approach   = data.get("evaluation_approach", "")
        challenges_learnings  = data.get("challenges_learnings", "")
        learnings        = data.get("learnings", "")
        future_roadmap   = data.get("future_roadmap", "")

        if company_name or domain or product:
            conn = get_db_connection()
            try:
                with conn.cursor() as cursor:
                    # session_id is str(candidate_marketing.id)
                    marketing_id = int(session_id)
                    cursor.execute(
                        """
                        INSERT INTO aiprep_tool_project_context (
                            candidate_id, company_name, domain, product, business_problem, previous_system,
                            key_problems, ai_techniques, agent_usage, impact, evaluation_approach,
                            challenges_learnings, learnings, future_roadmap,
                            background, skills, architecture, business_value, role
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            company_name = COALESCE(VALUES(company_name), company_name),
                            domain = COALESCE(VALUES(domain), domain),
                            product = COALESCE(VALUES(product), product),
                            business_problem = COALESCE(VALUES(business_problem), business_problem),
                            previous_system = COALESCE(VALUES(previous_system), previous_system),
                            key_problems = COALESCE(VALUES(key_problems), key_problems),
                            ai_techniques = COALESCE(VALUES(ai_techniques), ai_techniques),
                            agent_usage = COALESCE(VALUES(agent_usage), agent_usage),
                            impact = COALESCE(VALUES(impact), impact),
                            evaluation_approach = COALESCE(VALUES(evaluation_approach), evaluation_approach),
                            challenges_learnings = COALESCE(VALUES(challenges_learnings), challenges_learnings),
                            learnings = COALESCE(VALUES(learnings), learnings),
                            future_roadmap = COALESCE(VALUES(future_roadmap), future_roadmap),
                            background = COALESCE(VALUES(background), background),
                            skills = COALESCE(VALUES(skills), skills),
                            architecture = COALESCE(VALUES(architecture), architecture),
                            business_value = COALESCE(VALUES(business_value), business_value),
                            role = COALESCE(VALUES(role), role)
                    """,
                        (
                            marketing_id,
                            company_name, domain, product, business_problem, previous_system,
                            key_problems, ai_techniques, agent_usage, impact, evaluation_approach,
                            challenges_learnings, learnings, future_roadmap,
                            background, json.dumps(skills), architecture, business_value, role,
                        ),
                    )
                conn.commit()
                EXTRACTION_STATUSES[session_id] = "completed"
            finally:
                conn.close()
    except Exception as e:
        print("Background extraction failed:", str(e))
        EXTRACTION_STATUSES[session_id] = "failed"


@router.post("/resume")
async def upload_resume(
    background_tasks: BackgroundTasks,
    session_id: str = Form(...),
    file: UploadFile = File(...),
):
    conn = None

    try:
        conn = get_db_connection()
        content = await file.read()
        resume_data = json.loads(content)
        resume_data["_meta_filename"] = file.filename

        save_resume_for_session(session_id, resume_data)
        EXTRACTION_STATUSES[session_id] = "pending"
        background_tasks.add_task(extract_latest_company_bg, session_id, resume_data)

        return {"message": "Resume uploaded"}

    except Exception as e:
        print("ERROR:", str(e))
        raise HTTPException(500, "Resume upload failed")

    finally:
        if conn:
            conn.close()


@router.get("/summary")
def get_resume_summary(session_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # session_id = str(candidate_marketing.id)
            marketing_id = int(session_id)

            # Get candidate name via candidate_marketing -> candidate
            cursor.execute(
                """
                SELECT c.full_name AS name, cm.email
                FROM candidate_marketing cm
                JOIN candidate c ON c.id = cm.candidate_id
                WHERE cm.id = %s
                """,
                (marketing_id,),
            )
            cand_row = cursor.fetchone()
            candidate_name = cand_row["name"] if cand_row and cand_row.get("name") else ""

            # Get resume from candidate_resume (primary) or candidate_marketing.candidate_json
            raw_resume = fetch_resume_raw(session_id)
            has_resume = raw_resume is not None

            # Get LLM API keys via candidate_marketing -> candidate_id -> candidate_llm_api_keys
            cursor.execute(
                "SELECT candidate_id FROM candidate_marketing WHERE id = %s",
                (marketing_id,),
            )
            cm_row = cursor.fetchone()
            cid = cm_row["candidate_id"] if cm_row else None

            llm_keys = []
            has_api_key = False
            if cid:
                cursor.execute(
                    "SELECT id, provider_name, model_name, voice_enabled, created_at FROM candidate_llm_api_keys WHERE candidate_id = %s ORDER BY id ASC",
                    (cid,),
                )
                llm_keys = list(cursor.fetchall() or [])
                has_api_key = len(llm_keys) > 0

            # Parse resume JSON
            resume_json_out = None
            resume_filename = ""
            if has_resume and raw_resume is not None:
                if isinstance(raw_resume, str):
                    try:
                        resume_json_out = json.loads(raw_resume)
                    except Exception:
                        resume_json_out = None
                else:
                    resume_json_out = raw_resume

                if isinstance(resume_json_out, dict):
                    resume_filename = resume_json_out.get("_meta_filename", "")

            if has_resume and not candidate_name and isinstance(resume_json_out, dict):
                basics = resume_json_out.get("basics") or {}
                if isinstance(basics, dict):
                    candidate_name = basics.get("name") or resume_json_out.get("name") or ""
                else:
                    candidate_name = resume_json_out.get("name") or ""

            return {
                "resume_text": "Exists" if has_resume else None,
                "candidate_name": candidate_name,
                "has_api_key": has_api_key,
                "resume_json": resume_json_out,
                "resume_filename": resume_filename,
                "llm_keys": llm_keys,
            }
    except Exception as e:
        print("ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.post("/sync-from-wbl")
async def sync_from_wbl(data: SyncFromWblRequest):
    """
    Called by AI Prep Dashboard when a user clicks 'Manage' in WBL.
    prep_token is str(candidate_marketing.id).
    """
    session_id = data.prep_token
    resume = fetch_resume_dict(session_id)
    if not resume:
        raise HTTPException(status_code=400, detail="Setup not completed yet")

    needs_extraction = False
    name = "Candidate"
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            marketing_id = int(session_id)
            cursor.execute(
                "SELECT id FROM aiprep_tool_project_context WHERE candidate_id = %s",
                (marketing_id,),
            )
            needs_extraction = not cursor.fetchone()

            cursor.execute(
                """
                SELECT c.full_name AS name
                FROM candidate_marketing cm
                JOIN candidate c ON c.id = cm.candidate_id
                WHERE cm.id = %s
                """,
                (marketing_id,),
            )
            row = cursor.fetchone()
            if row and row["name"]:
                name = row["name"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    if needs_extraction:
        try:
            await extract_latest_company_bg(session_id, resume)
        except Exception as e:
            print(f"Extraction failed during sync: {e}")

    return {"session_id": session_id, "candidate_name": name}


@router.post("/init-and-summary")
def init_and_summary(data: SetupInit):
    """Combined endpoint to initialize a session and fetch the summary."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            marketing_id = _resolve_or_create_session(cursor, data)

        _upsert_eval_login(conn, marketing_id)
        session_id = str(marketing_id)

        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT c.full_name AS name, cm.candidate_id
                FROM candidate_marketing cm
                JOIN candidate c ON c.id = cm.candidate_id
                WHERE cm.id = %s
                """,
                (marketing_id,),
            )
            cand_row = cursor.fetchone()
            candidate_name = cand_row["name"] if cand_row and cand_row.get("name") else ""
            cid = cand_row["candidate_id"] if cand_row else None

            raw_resume = fetch_resume_raw(session_id)
            has_resume = raw_resume is not None

            llm_keys = []
            has_api_key = False
            if cid:
                cursor.execute(
                    "SELECT id, provider_name, model_name, voice_enabled, created_at FROM candidate_llm_api_keys WHERE candidate_id = %s ORDER BY id ASC",
                    (cid,),
                )
                llm_keys = list(cursor.fetchall() or [])
                has_api_key = len(llm_keys) > 0

            resume_json_out = None
            resume_filename = ""
            if has_resume and raw_resume is not None:
                if isinstance(raw_resume, str):
                    try:
                        resume_json_out = json.loads(raw_resume)
                    except Exception:
                        resume_json_out = None
                else:
                    resume_json_out = raw_resume

                if isinstance(resume_json_out, dict):
                    resume_filename = resume_json_out.get("_meta_filename", "")

            if has_resume and not candidate_name and isinstance(resume_json_out, dict):
                basics = resume_json_out.get("basics") or {}
                if isinstance(basics, dict):
                    candidate_name = basics.get("name") or resume_json_out.get("name") or ""
                else:
                    candidate_name = resume_json_out.get("name") or ""

            return {
                "session_id": session_id,
                "summary": {
                    "resume_text": "Exists" if has_resume else None,
                    "candidate_name": candidate_name,
                    "has_api_key": has_api_key,
                    "resume_json": resume_json_out,
                    "resume_filename": resume_filename,
                    "llm_keys": llm_keys,
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        print("ERROR init_and_summary:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize session. Check database configuration: {e}",
        )
    finally:
        if conn:
            conn.close()


@router.delete("/llm-key/{key_id}")
def delete_llm_key(key_id: int, session_id: str):
    """Remove a row from candidate_llm_api_keys by key_id."""
    conn = None
    try:
        conn = get_db_connection()
        marketing_id = int(session_id)
        with conn.cursor() as cursor:
            # Verify the key belongs to this candidate_marketing entry
            cursor.execute(
                "SELECT candidate_id FROM candidate_marketing WHERE id = %s",
                (marketing_id,),
            )
            cm = cursor.fetchone()
            if not cm:
                raise HTTPException(status_code=404, detail="Session not found")

            cid = cm["candidate_id"]
            cursor.execute(
                "DELETE FROM candidate_llm_api_keys WHERE id = %s AND candidate_id = %s",
                (key_id, cid),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Key not found")
        conn.commit()
        return {"ok": True, "message": "API key deleted"}
    except HTTPException:
        raise
    except Exception as e:
        print("ERROR delete_llm_key:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get("/extraction-status")
def get_extraction_status(session_id: str):
    """Check whether the project context extraction is done for this candidate."""
    # 1. Check in-memory status
    in_memory = EXTRACTION_STATUSES.get(session_id)
    if in_memory:
        return {"status": in_memory}

    # 2. Fallback to DB check
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            marketing_id = int(session_id)
            cursor.execute(
                "SELECT id FROM aiprep_tool_project_context WHERE candidate_id = %s",
                (marketing_id,),
            )
            row = cursor.fetchone()
            return {"status": "completed" if row else "pending"}
    except Exception as e:
        print("ERROR GETTING STATUS:", str(e))
        return {"status": "completed"}
    finally:
        if conn:
            conn.close()

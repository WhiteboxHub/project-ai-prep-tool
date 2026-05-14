import json
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from db.connection import get_db_connection
from utils.security import encrypt
import uuid
import os
from openai import OpenAI

from services.resume_source import (
    fetch_resume_raw,
    fetch_resume_dict,
    save_resume_for_session,
    is_wbl_candidate_session,
    count_llm_keys_for_candidate,
    list_llm_keys_for_candidate,
    upsert_llm_api_key_row,
)

router = APIRouter(prefix="/api/setup", tags=["setup"])


class ValidationRequest(BaseModel):
    api_key: str
    api_provider: str
    session_id: str
    model_name: Optional[str] = None
    voice_enabled: bool = False

class SyncFromWblRequest(BaseModel):
    prep_token: str


@router.post("/validate")
def validate_key(req: ValidationRequest):
    try:
        if req.api_provider.lower() == "openai":
            client = OpenAI(api_key=req.api_key)
            client.models.list()

        encrypted_key = encrypt(req.api_key)

        if is_wbl_candidate_session(req.session_id):
            cid = int(req.session_id)
            upsert_llm_api_key_row(
                cid,
                req.api_provider,
                encrypted_key,
                req.model_name,
                req.voice_enabled,
            )
        else:
            conn = get_db_connection()
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE aiprep_tool_candidates
                        SET api_key_encrypted = %s
                        WHERE user_id = %s
                        """,
                        (encrypted_key, req.session_id),
                    )
                    if cursor.rowcount == 0:
                        cursor.execute(
                            """
                            INSERT INTO aiprep_tool_candidates (user_id, api_key_encrypted)
                            VALUES (%s, %s)
                            """,
                            (req.session_id, encrypted_key),
                        )
                conn.commit()
            finally:
                conn.close()

        return {"message": "API Key validated and stored successfully"}

    except Exception as e:
        print("ERROR:", str(e))
        raise HTTPException(400, "Invalid API Key")


class SetupInit(BaseModel):
    wbl_email: Optional[str] = None
    name: Optional[str] = None
    candidate_id: Optional[int] = None


@router.post("/init")
def init_session(data: SetupInit):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if data.candidate_id is not None:
                cid = data.candidate_id
                cursor.execute("SELECT id FROM candidate WHERE id = %s", (cid,))
                if not cursor.fetchone():
                    raise HTTPException(404, "Candidate not found")

                session_id = str(cid)
                cursor.execute(
                    """
                    INSERT INTO aiprep_tool_candidates (user_id, wbl_email, name)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        name = %s,
                        wbl_email = %s
                    """,
                    (session_id, data.wbl_email or "", data.name or "", data.name or "", data.wbl_email or ""),
                )
                conn.commit()
                return {"session_id": session_id}

            if not data.wbl_email:
                raise HTTPException(400, "wbl_email or candidate_id is required")

            cursor.execute(
                "SELECT user_id FROM aiprep_tool_candidates WHERE wbl_email = %s",
                (data.wbl_email,),
            )
            row = cursor.fetchone()

            if row:
                session_id = row["user_id"]
                cursor.execute(
                    "UPDATE aiprep_tool_candidates SET name = %s WHERE wbl_email = %s",
                    (data.name or "", data.wbl_email),
                )
            else:
                session_id = str(uuid.uuid4())
                cursor.execute(
                    """
                    INSERT INTO aiprep_tool_candidates (user_id, wbl_email, name)
                    VALUES (%s, %s, %s)
                    """,
                    (session_id, data.wbl_email, data.name or ""),
                )

        conn.commit()
        return {"session_id": session_id}
    except HTTPException:
        raise
    except Exception as e:
        print("ERROR:", str(e))
        raise HTTPException(500, "Failed to initialize session")
    finally:
        conn.close()


def extract_latest_company_bg(user_id: str, resume_json: dict):
    from services.user_context import get_user_api_key
    from services.llm_service import call_llm_with_context
    from db.connection import get_db_connection
    import json as _json

    api_key = get_user_api_key(user_id)
    if not api_key:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE aiprep_tool_candidates SET extraction_status = 'failed' WHERE user_id = %s",
                    (user_id,),
                )
            conn.commit()
        except Exception:
            pass
        finally:
            conn.close()
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
        res_str = call_llm_with_context(
            user_id=user_id,
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
        company_name = data.get("company_name", "")
        domain = data.get("domain", "")
        background = data.get("background", "")
        skills = data.get("skills", [])
        product = data.get("product", "")
        architecture = data.get("architecture", "")
        business_value = data.get("business_value", "")
        role = data.get("role", "")
        business_problem = data.get("business_problem", "")
        previous_system = data.get("previous_system", "")
        key_problems = data.get("key_problems", "")
        ai_techniques = data.get("ai_techniques", "")
        agent_usage = data.get("agent_usage", "None")
        impact = data.get("impact", "")
        evaluation_approach = data.get("evaluation_approach", "")
        challenges_learnings = data.get("challenges_learnings", "")
        learnings = data.get("learnings", "")
        future_roadmap = data.get("future_roadmap", "")

        if company_name or domain or product:
            conn = get_db_connection()
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO aiprep_tool_project_context (
                            user_id, company_name, domain, product, business_problem, previous_system,
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
                            user_id,
                            company_name,
                            domain,
                            product,
                            business_problem,
                            previous_system,
                            key_problems,
                            ai_techniques,
                            agent_usage,
                            impact,
                            evaluation_approach,
                            challenges_learnings,
                            learnings,
                            future_roadmap,
                            background,
                            json.dumps(skills),
                            architecture,
                            business_value,
                            role,
                        ),
                    )
                    cursor.execute(
                        "UPDATE aiprep_tool_candidates SET extraction_status = 'completed' WHERE user_id = %s",
                        (user_id,),
                    )
                conn.commit()
            finally:
                conn.close()
    except Exception as e:
        print("Background extraction failed:", str(e))
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE aiprep_tool_candidates SET extraction_status = 'failed' WHERE user_id = %s",
                    (user_id,),
                )
            conn.commit()
        except Exception:
            pass
        finally:
            conn.close()


@router.post("/resume")
async def upload_resume(
    background_tasks: BackgroundTasks,
    session_id: str = Form(...),
    file: UploadFile = File(...),
):
    conn = get_db_connection()

    try:
        content = await file.read()
        resume_data = json.loads(content)
        resume_data["_meta_filename"] = file.filename

        save_resume_for_session(session_id, resume_data)

        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE aiprep_tool_candidates SET extraction_status = 'pending' WHERE user_id = %s",
                (session_id,),
            )
        conn.commit()

        background_tasks.add_task(extract_latest_company_bg, session_id, resume_data)

        return {"message": "Resume uploaded"}

    except Exception as e:
        print("ERROR:", str(e))
        raise HTTPException(500, "Resume upload failed")

    finally:
        conn.close()


@router.get("/summary")
def get_resume_summary(session_id: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 1. Get candidate name
            cursor.execute(
                "SELECT name FROM aiprep_tool_candidates WHERE user_id = %s",
                (session_id,),
            )
            candidate_res = cursor.fetchone()
            candidate_name = candidate_res["name"] if candidate_res and candidate_res.get("name") else ""

            # 2. Get raw resume
            if is_wbl_candidate_session(session_id):
                cid = int(session_id)
                cursor.execute(
                    "SELECT candidate_json FROM candidate_marketing WHERE candidate_id = %s AND candidate_json IS NOT NULL ORDER BY id DESC LIMIT 1",
                    (cid,)
                )
                row = cursor.fetchone()
                raw_resume = row["candidate_json"] if row else None
            else:
                cursor.execute("SELECT resume_json FROM aiprep_tool_resumes WHERE user_id = %s", (session_id,))
                row = cursor.fetchone()
                raw_resume = row["resume_json"] if row else None

            has_resume = raw_resume is not None

            # 3. Get LLM Keys
            if is_wbl_candidate_session(session_id):
                cid = int(session_id)
                cursor.execute("SELECT id, provider_name, model_name, voice_enabled FROM candidate_llm_api_keys WHERE candidate_id = %s ORDER BY id ASC", (cid,))
                llm_keys = list(cursor.fetchall() or [])
                has_api_key = len(llm_keys) > 0
            else:
                cursor.execute("SELECT api_key_encrypted FROM aiprep_tool_candidates WHERE user_id = %s", (session_id,))
                key_res = cursor.fetchone()
                has_api_key = bool(key_res and key_res.get("api_key_encrypted"))
                llm_keys = []

            # Process resume JSON
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
        conn.close()

@router.post("/sync-from-wbl")
def sync_from_wbl(data: SyncFromWblRequest):
    """
    Called by AI Prep Dashboard when a user clicks 'Manage' in WBL.
    We just return the session_id and candidate name so they bypass the setup wizard.
    Only succeeds if the candidate has actually completed setup (i.e. has a resume).
    """
    session_id = data.prep_token
    resume = fetch_resume_dict(session_id)
    if not resume:
        raise HTTPException(status_code=400, detail="Setup not completed yet")

    session_id = data.prep_token
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if is_wbl_candidate_session(session_id):
                cursor.execute("SELECT full_name as name FROM candidate WHERE id = %s", (session_id,))
            else:
                cursor.execute("SELECT name FROM aiprep_tool_candidates WHERE user_id = %s", (session_id,))
            
            row = cursor.fetchone()
            name = row["name"] if row and row["name"] else "Candidate"
            return {"session_id": session_id, "candidate_name": name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/init-and-summary")
def init_and_summary(data: SetupInit):
    """Combined endpoint to initialize a session and fetch the summary in one DB connection round-trip."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # ── 1. Init Session ──
            if data.candidate_id is not None:
                cid = data.candidate_id
                session_id = str(cid)
                # DO NOT insert into aiprep_tool_candidates. They belong to WBL's `candidate` table.
            else:
                if not data.wbl_email:
                    raise HTTPException(400, "wbl_email or candidate_id is required")

                cursor.execute("SELECT user_id FROM aiprep_tool_candidates WHERE wbl_email = %s", (data.wbl_email,))
                row = cursor.fetchone()

                if row:
                    session_id = row["user_id"]
                    cursor.execute("UPDATE aiprep_tool_candidates SET name = %s WHERE wbl_email = %s", (data.name or "", data.wbl_email))
                else:
                    session_id = str(uuid.uuid4())
                    cursor.execute(
                        "INSERT INTO aiprep_tool_candidates (user_id, wbl_email, name) VALUES (%s, %s, %s)",
                        (session_id, data.wbl_email, data.name or ""),
                    )
            
            conn.commit()

            # ── 2. Get Summary ──
            if is_wbl_candidate_session(session_id):
                cursor.execute("SELECT full_name as name FROM candidate WHERE id = %s", (session_id,))
            else:
                cursor.execute("SELECT name FROM aiprep_tool_candidates WHERE user_id = %s", (session_id,))
            candidate_res = cursor.fetchone()
            candidate_name = candidate_res["name"] if candidate_res and candidate_res.get("name") else ""

            if is_wbl_candidate_session(session_id):
                cid = int(session_id)
                cursor.execute(
                    "SELECT candidate_json FROM candidate_marketing WHERE candidate_id = %s AND candidate_json IS NOT NULL ORDER BY id DESC LIMIT 1",
                    (cid,)
                )
                row = cursor.fetchone()
                raw_resume = row["candidate_json"] if row else None
            else:
                cursor.execute("SELECT resume_json FROM aiprep_tool_resumes WHERE user_id = %s", (session_id,))
                row = cursor.fetchone()
                raw_resume = row["resume_json"] if row else None

            has_resume = raw_resume is not None

            if is_wbl_candidate_session(session_id):
                cid = int(session_id)
                cursor.execute("SELECT id, provider_name, model_name, voice_enabled FROM candidate_llm_api_keys WHERE candidate_id = %s ORDER BY id ASC", (cid,))
                llm_keys = list(cursor.fetchall() or [])
                has_api_key = len(llm_keys) > 0
            else:
                cursor.execute("SELECT api_key_encrypted FROM aiprep_tool_candidates WHERE user_id = %s", (session_id,))
                key_res = cursor.fetchone()
                has_api_key = bool(key_res and key_res.get("api_key_encrypted"))
                llm_keys = []

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
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"detail": err_msg})
    finally:
        conn.close()


@router.delete("/llm-key/{key_id}")
def delete_llm_key(key_id: int, session_id: str):
    """
    Remove a row from candidate_llm_api_keys (WBL numeric session_id),
    or clear the single encrypted key on aiprep_tool_candidates (legacy UUID session).
    """
    conn = get_db_connection()
    try:
        if is_wbl_candidate_session(session_id):
            cid = int(session_id)
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    DELETE FROM candidate_llm_api_keys
                    WHERE id = %s AND candidate_id = %s
                    """,
                    (key_id, cid),
                )
                if cursor.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Key not found")
            conn.commit()
            return {"ok": True, "message": "API key deleted"}

        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE aiprep_tool_candidates SET api_key_encrypted = NULL WHERE user_id = %s",
                (session_id,),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Session not found")
        conn.commit()
        return {"ok": True, "message": "API key cleared"}
    except HTTPException:
        raise
    except Exception as e:
        print("ERROR delete_llm_key:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/extraction-status")
def get_extraction_status(session_id: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT extraction_status FROM aiprep_tool_candidates WHERE user_id = %s",
                (session_id,),
            )
            res = cursor.fetchone()
            if res and "extraction_status" in res:
                return {"status": res["extraction_status"] or "completed"}
            return {"status": "completed"}
    except Exception as e:
        print("ERROR GETTING STATUS:", str(e))
        return {"status": "completed"}
    finally:
        conn.close()

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.connection import get_db_connection
from services.resume_source import fetch_resume_raw
import json

router = APIRouter(prefix="/api/report", tags=["report"])

@router.get("/")
def get_final_report(session_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Resolve real_candidate_id from session_id (which is marketing_id)
            marketing_id = int(session_id)
            cursor.execute("SELECT candidate_id FROM candidate_marketing WHERE id = %s", (marketing_id,))
            cm_row = cursor.fetchone()
            real_candidate_id = cm_row["candidate_id"] if cm_row else marketing_id

            # Aggregate setup/resume (WBL or legacy)
            resume_raw = fetch_resume_raw(session_id)
            resume = {"resume_json": resume_raw} if resume_raw else None

            # Aggregate project
            cursor.execute("SELECT domain, background, skills, product, architecture, role, impact FROM aiprep_tool_project_context WHERE candidate_id = %s", (real_candidate_id,))
            project = cursor.fetchone()

            # Aggregate latest intro evaluation for this candidate/session.
            cursor.execute("""
                SELECT score, passed, feedback, raw_response, video_url, created_at
                FROM aiprep_tool_evaluations
                WHERE user_id = %s AND type = 'intro'
                ORDER BY created_at DESC
                LIMIT 1
            """, (session_id,))
            intro_row = cursor.fetchone()
            intro_evals = [intro_row] if (intro_row and intro_row["score"] is not None) else []

            # Aggregate interview answers/evals
            interview_evals = []
            
            # Check if all completed
            cursor.execute("SELECT attempt_count FROM aiprep_tool_attempts WHERE candidate_id = %s AND attempt_type = 'interview_complete'", (real_candidate_id,))
            comp_row = cursor.fetchone()
            interview_complete = comp_row is not None
            final_analysis = None

            # Parse JSON fields where needed
            for e in intro_evals:
                if e.get("feedback"):
                    try: e["feedback"] = json.loads(e["feedback"])
                    except: pass
                if e.get("raw_response"):
                    try: e["raw_response"] = json.loads(e["raw_response"])
                    except: pass
            
            for e in interview_evals:
                if e.get("feedback"):
                    try: e["feedback"] = json.loads(e["feedback"])
                    except: pass
                if e.get("raw_response"):
                    try: e["raw_response"] = json.loads(e["raw_response"])
                    except: pass

        return {
            "resume": True if resume else False,
            "project": project,
            "intro_evals": intro_evals,
            "interview_evals": interview_evals,
            "interview_complete": interview_complete,
            "final_analysis": final_analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

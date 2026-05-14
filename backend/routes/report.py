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
            # Aggregate setup/resume (WBL or legacy)
            resume_raw = fetch_resume_raw(session_id)
            resume = {"resume_json": resume_raw} if resume_raw else None

            # Aggregate project
            cursor.execute("SELECT domain, background, skills, product, architecture, role, impact FROM aiprep_tool_project_context WHERE user_id = %s", (session_id,))
            project = cursor.fetchone()

            # Aggregate intro aiprep_tool_evaluations
            cursor.execute("SELECT score, feedback, raw_response FROM aiprep_tool_evaluations WHERE user_id = %s AND type = %s ORDER BY created_at DESC", (session_id, "intro"))
            intro_evals = cursor.fetchall()

            # Aggregate interview answers/evals
            cursor.execute("SELECT score, feedback, raw_response FROM aiprep_tool_evaluations WHERE user_id = %s AND type = %s ORDER BY created_at DESC", (session_id, "interview_answer"))
            interview_evals = cursor.fetchall()
            
            # Check if all completed
            cursor.execute("SELECT id FROM aiprep_tool_evaluations WHERE user_id = %s AND type = %s", (session_id, "interview_complete"))
            interview_complete = cursor.fetchone() is not None

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
            "interview_complete": interview_complete
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

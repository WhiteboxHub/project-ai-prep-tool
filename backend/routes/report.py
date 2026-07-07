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
            cursor.execute("SELECT domain, background, skills, product, architecture, role, impact FROM aiprep_tool_project_context WHERE candidate_id = %s", (int(session_id),))
            project = cursor.fetchone()

            # Aggregate intro evaluation
            cursor.execute("SELECT intro_score AS score FROM aiprep_tool_evaluations WHERE candidate_id = %s", (int(session_id),))
            intro_row = cursor.fetchone()
            intro_evals = [{"score": intro_row["score"], "feedback": {}, "raw_response": {}}] if (intro_row and intro_row["score"] is not None) else []

            # Aggregate interview answers/evals
            interview_evals = []
            
            # Check if all completed
            cursor.execute("SELECT attempt_count FROM aiprep_tool_attempts WHERE candidate_id = %s AND attempt_type = 'interview_complete'", (int(session_id),))
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

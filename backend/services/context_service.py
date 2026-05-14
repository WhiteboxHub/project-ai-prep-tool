import json
from db.connection import get_db_connection
from services.resume_source import fetch_resume_dict

def get_candidate_context(user_id: str):
    """
    Fetches full context: resume_json, aiprep_tool_project_context, intro evaluation.
    This context MUST be used in ALL AI calls.
    """
    context = {
        "resume": {},
        "project": {},
        "intro_eval": {}
    }
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 1. Fetch Resume (WBL candidate_marketing or legacy aiprep_tool_resumes)
            resume_obj = fetch_resume_dict(user_id)
            if resume_obj:
                context["resume"] = resume_obj

            # 2. Fetch Project Context
            cursor.execute("SELECT product, architecture, business_value, role, impact FROM aiprep_tool_project_context WHERE user_id = %s", (user_id,))
            proj = cursor.fetchone()
            if proj:
                context["project"] = proj
                
            # 3. Fetch Intro Eval 
            cursor.execute("SELECT score, passed, feedback FROM aiprep_tool_evaluations WHERE user_id = %s AND type = 'intro' ORDER BY id DESC LIMIT 1", (user_id,))
            intro = cursor.fetchone()
            if intro:
                if 'feedback' in intro and isinstance(intro['feedback'], str):
                    try:
                        intro['feedback'] = json.loads(intro['feedback'])
                    except:
                        pass
                context["intro_eval"] = intro
                
        conn.close()
    except Exception as e:
        print("Error fetching context:", e)
        
    return context

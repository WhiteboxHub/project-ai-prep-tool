# # backend\routes\project.py
# import json
# from fastapi import APIRouter, HTTPException
# from pydantic import BaseModel
# from db.connection import get_db_connection
# from models.candidate import ProjectContextData
# from services.evaluator import evaluate_project, generate_case_study

# router = APIRouter(prefix="/api/project", tags=["project"])

# @router.post("/")
# def save_and_evaluate_project(data: ProjectContextData):
#     conn = None
#     try:
#         conn = get_db_connection()
#         with conn.cursor() as cursor:
#             # 1. UPSERT Project Context
#             cursor.execute("SELECT id FROM project_context WHERE user_id = %s", (data.user_id,))
#             if cursor.fetchone():
#                 cursor.execute("""
#                     UPDATE project_context 
#                     SET product=%s, architecture=%s, business_value=%s, role=%s, impact=%s
#                     WHERE user_id=%s
#                 """, (data.product, data.architecture, data.business_value, data.role, data.impact, data.user_id))
#             else:
#                 cursor.execute("""
#                     INSERT INTO project_context (user_id, product, architecture, business_value, role, impact)
#                     VALUES (%s, %s, %s, %s, %s, %s)
#                 """, (data.user_id, data.product, data.architecture, data.business_value, data.role, data.impact))
                
#             conn.commit()

#         # 2. Evaluate using LLM
#         answers = f"Product: {data.product}\nArch: {data.architecture}\nValue: {data.business_value}\nRole: {data.role}\nImpact: {data.impact}"
#         eval_result = evaluate_project(data.user_id, answers, api_key=data.api_key)
        
#         # 3. Store Evaluation
#         with conn.cursor() as cursor:
#             cursor.execute("""
#                 INSERT INTO evaluations (user_id, type, score, passed, feedback, raw_response)
#                 VALUES (%s, %s, %s, %s, %s, %s)
#             """, (
#                 data.user_id, 
#                 "project", 
#                 int(eval_result.get("overall_score", 0) * 10) if eval_result.get("overall_score") and eval_result.get("overall_score") <= 10 else eval_result.get("overall_score", 0), 
#                 eval_result.get("overall_score", 0) >= 7.0, 
#                 json.dumps(eval_result.get("feedback", [])), 
#                 json.dumps(eval_result)
#             ))
#             conn.commit()
            
#         # 4. Generate Case Study
#         case_study_markdown = generate_case_study(data.user_id, answers, api_key=data.api_key)
        
#         return {
#             "evaluation": eval_result,
#             "case_study": case_study_markdown
#         }
#     except Exception as e:
#         print("Project Error:", str(e))
#         raise HTTPException(status_code=500, detail=str(e))
#     finally:
#         if conn:
#             conn.close()

# @router.get("/history")
# def get_project_history(session_id: str):
#     """"
#     Check if the user has completed the case study for the dashboard progression.
#     """
#     conn = None
#     try:
#         conn = get_db_connection()
#         with conn.cursor() as cursor:
#             cursor.execute("SELECT id FROM project_context WHERE user_id = %s", (session_id,))
#             if cursor.fetchone():
#                 return {"case_studies": [{"id": 1}]} # Mock format for dashboard
#         return {"case_studies": []}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
#     finally:
#         if conn:
#             conn.close()


import json
from fastapi import APIRouter, HTTPException
from db.connection import get_db_connection
from models.candidate import ProjectContextData
from services.evaluator import evaluate_project, generate_case_study
from services.user_context import get_user_api_key  # ✅ NEW

router = APIRouter(prefix="/api/project", tags=["project"])


@router.post("/")
def save_and_evaluate_project(data: ProjectContextData):
    conn = None
    try:
        conn = get_db_connection()

        # 1. Atomic UPSERT Project Context
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO project_context (user_id, product, architecture, business_value, role, impact)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                    product = VALUES(product),
                    architecture = VALUES(architecture),
                    business_value = VALUES(business_value),
                    role = VALUES(role),
                    impact = VALUES(impact)
            """, (data.user_id, data.product, data.architecture, data.business_value, data.role, data.impact))

        conn.commit()

        # 🔥 2. GET API KEY FROM DB (FIX)
        api_key = get_user_api_key(data.user_id)

        if not api_key:
            raise Exception("API key not found. Please setup again.")

        # 3. Prepare input
        skills_str = ", ".join(data.skills) if data.skills else ""
        answers = f"""
Domain: {data.domain}
Background: {data.background}
Skills: {skills_str}
Product: {data.product}
Architecture: {data.architecture}
Business Value: {data.business_value}
Role: {data.role}
Impact: {data.impact}
"""

        # 4. Evaluate
        eval_result = evaluate_project(
            data.user_id,
            answers,
            api_key=api_key
        )

        # 5. Store evaluation
        with conn.cursor() as cursor:
            raw_score = eval_result.get("overall_score", 0)
            try:
                score = float(raw_score)
            except (ValueError, TypeError):
                score = 0.0

            if score and score <= 10:
                db_score = int(score * 10)
            else:
                db_score = int(score)

            cursor.execute("""
                INSERT INTO evaluations (user_id, type, score, passed, feedback, raw_response)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                data.user_id,
                "project",
                db_score,
                score >= 7.0,
                json.dumps(eval_result.get("feedback", [])),
                json.dumps(eval_result)
            ))

        conn.commit()

        # 6. Generate case study
        case_study_markdown = generate_case_study(
            data.user_id,
            answers,
            api_key=api_key
        )

        return {
            "evaluation": eval_result,
            "case_study": case_study_markdown
        }

    except Exception as e:
        err_msg = str(e)
        print("Project Error:", err_msg)
        if isinstance(e, HTTPException): raise e
        
        # Check for common OpenAI errors
        if "insufficient_quota" in err_msg or "429" in err_msg or "quota" in err_msg.lower():
            raise HTTPException(429, detail="AI Provider Error: Your API Key has insufficient quota or is out of credits.")
        if "AuthenticationError" in err_msg or "invalid api key" in err_msg.lower() or "401" in err_msg:
            raise HTTPException(401, detail="AI Provider Error: Your API Key is invalid.")
            
        raise HTTPException(status_code=500, detail=f"Project evaluation failed. Reason: {err_msg}")

    finally:
        if conn:
            conn.close()


@router.get("/history")
def get_project_history(session_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM project_context WHERE user_id = %s", (session_id,))
            if cursor.fetchone():
                return {"case_studies": [{"id": 1}]}
        return {"case_studies": []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if conn:
            conn.close()
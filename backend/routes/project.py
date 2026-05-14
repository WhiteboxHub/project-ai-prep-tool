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
#             cursor.execute("SELECT id FROM aiprep_tool_project_context WHERE user_id = %s", (data.user_id,))
#             if cursor.fetchone():
#                 cursor.execute("""
#                     UPDATE aiprep_tool_project_context 
#                     SET product=%s, architecture=%s, business_value=%s, role=%s, impact=%s
#                     WHERE user_id=%s
#                 """, (data.product, data.architecture, data.business_value, data.role, data.impact, data.user_id))
#             else:
#                 cursor.execute("""
#                     INSERT INTO aiprep_tool_project_context (user_id, product, architecture, business_value, role, impact)
#                     VALUES (%s, %s, %s, %s, %s, %s)
#                 """, (data.user_id, data.product, data.architecture, data.business_value, data.role, data.impact))
                
#             conn.commit()

#         # 2. Evaluate using LLM
#         answers = f"Product: {data.product}\nArch: {data.architecture}\nValue: {data.business_value}\nRole: {data.role}\nImpact: {data.impact}"
#         eval_result = evaluate_project(data.user_id, answers, api_key=data.api_key)
        
#         # 3. Store Evaluation
#         with conn.cursor() as cursor:
#             cursor.execute("""
#                 INSERT INTO aiprep_tool_evaluations (user_id, type, score, passed, feedback, raw_response)
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
#             cursor.execute("SELECT id FROM aiprep_tool_project_context WHERE user_id = %s", (session_id,))
#             if cursor.fetchone():
#                 return {"aiprep_tool_case_studies": [{"id": 1}]} # Mock format for dashboard
#         return {"aiprep_tool_case_studies": []}
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
                INSERT INTO aiprep_tool_project_context (
                    user_id, product, architecture, business_value, role, impact,
                    business_problem, previous_system, key_objectives, users_scale,
                    agents_components, key_workflows, tools_integrations, tech_stack,
                    ai_techniques, evaluation_approach, challenges_learnings,
                    safety_guardrails, future_roadmap, company_name, key_problems,
                    agent_usage, learnings
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                    product = VALUES(product),
                    architecture = VALUES(architecture),
                    business_value = VALUES(business_value),
                    role = VALUES(role),
                    impact = VALUES(impact),
                    business_problem = VALUES(business_problem),
                    previous_system = VALUES(previous_system),
                    key_objectives = VALUES(key_objectives),
                    users_scale = VALUES(users_scale),
                    agents_components = VALUES(agents_components),
                    key_workflows = VALUES(key_workflows),
                    tools_integrations = VALUES(tools_integrations),
                    tech_stack = VALUES(tech_stack),
                    ai_techniques = VALUES(ai_techniques),
                    evaluation_approach = VALUES(evaluation_approach),
                    challenges_learnings = VALUES(challenges_learnings),
                    safety_guardrails = VALUES(safety_guardrails),
                    future_roadmap = VALUES(future_roadmap),
                    company_name = VALUES(company_name),
                    key_problems = VALUES(key_problems),
                    agent_usage = VALUES(agent_usage),
                    learnings = VALUES(learnings)
            """, (
                data.user_id, data.product, data.architecture, data.business_value, data.role, data.impact,
                data.business_problem, data.previous_system, data.key_objectives, data.users_scale,
                data.agents_components, data.key_workflows, data.tools_integrations, data.tech_stack,
                data.ai_techniques, data.evaluation_approach, data.challenges_learnings,
                data.safety_guardrails, data.future_roadmap, data.company_name, data.key_problems,
                data.agent_usage, data.learnings
            ))

        conn.commit()

        # 🔥 2. GET API KEY FROM DB (FIX)
        api_key = get_user_api_key(data.user_id)

        if not api_key:
            raise Exception("API key not found. Please setup again.")

        # 3. Prepare input
        skills_str = ", ".join(data.skills) if data.skills else ""
        answers = f"""
Company Name: {data.company_name}
Domain: {data.domain}
Product/System: {data.product}
Business Problem: {data.business_problem}
Previous System: {data.previous_system}
Key Problems: {data.key_problems}
LLM Techniques Used: {data.ai_techniques}
Agent Usage: {data.agent_usage}
Results & Impact: {data.impact}
Evaluation Approach: {data.evaluation_approach}
Challenges: {data.challenges_learnings}
Learnings: {data.learnings}
Future Scope: {data.future_roadmap}
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
                INSERT INTO aiprep_tool_evaluations (user_id, type, score, passed, feedback, raw_response)
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
            cursor.execute("SELECT id FROM aiprep_tool_project_context WHERE user_id = %s", (session_id,))
            if cursor.fetchone():
                return {"aiprep_tool_case_studies": [{"id": 1}]}
        return {"aiprep_tool_case_studies": []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if conn:
            conn.close()
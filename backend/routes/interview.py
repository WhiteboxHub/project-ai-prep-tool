from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.llm_service import call_llm_with_context
from services.evaluator import coach_answer
from services.user_context import get_user_api_key
from db.connection import get_db_connection
import json
from services.user_context import get_user_api_key

router = APIRouter(prefix="/api/interview", tags=["interview"])

@router.get("/stage-questions")
def get_stage_questions(session_id: str, stage_name: str = "General Mock", api_key: str = None, previous_context: str = ""):
    """
    Adapter for frontend: start the interview loop for a specific stage and return the first question.
    """
    try:
        if not api_key:
            api_key = get_user_api_key(session_id)
        
        prompt_text = f"Generate the very first interview question exclusively for a '{stage_name}' round. \nCRITICAL RULES:\n1. Your question MUST be hyper-specific and uniquely tailored to the candidate's actual projects, stack, and experience provided in the context.\n2. Do NOT ask generic behavioral questions without tying them directly to a specific company or project listed in their data.\n3. Ask exactly one question. Do NOT ask them to introduce themselves.\n\n"
        if previous_context:
            prompt_text += f"IMPORTANT: STRICT NON-REPETITION: You MUST NOT repeat any concept, topic, or question that were already asked in previous rounds. Ask about a completely different aspect. Here is the transcript of previous rounds:\n{previous_context}"

        q = call_llm_with_context(
            user_id=session_id,
            prompt=prompt_text,
            system_prompt=f"You are a strict and professional technical recruiter starting a mock interview for the {stage_name} round.",
            api_key=api_key,
            response_format="text"
        )
        return {"questions": [q]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class LiveEvalRequest(BaseModel):
    session_id: str
    current_question: str
    user_answer: str
    stage_name: str
    previous_context: str = ""
    api_key: str = None

@router.post("/evaluate-live")
def evaluate_live(data: LiveEvalRequest):
    """
    Adapter for frontend: send answer, get feedback and the next question combined.
    """
    try:
        if not data.api_key:
            data.api_key = get_user_api_key(data.session_id)
            
        # 1. Coach the answer
        eval_prompt = f"Question: {data.current_question}\nAnswer: {data.user_answer}\nIdentify flaws and explain how to improve."
        feedback = call_llm_with_context(
            user_id=data.session_id,
            prompt=eval_prompt,
            system_prompt="You are a strict technical evaluator.",
            api_key=data.api_key,
            response_format="text"
        )
        coaching = coach_answer(data.session_id, data.user_answer, feedback, api_key=data.api_key)
        
        # 2. Next question
        stage_context = f"You are actively conducting the '{data.stage_name}' stage of the interview."
        prompt_instruction = f"Previous Conversation Context:\n{data.previous_context}\n\nTask: Generate the NEXT interview question specifically tailored for the '{data.stage_name}' round. \nCRITICAL RULES:\n1. STRICT NON-REPETITION: You MUST NOT repeat any concept, topic, or question present in the Previous Conversation Context. Ask about a completely different aspect of their experience or a new technical challenge.\n2. The question MUST be hyper-specific and uniquely rooted in the candidate's actual resume, companies, and project data provided in the system context. Avoid generic questions.\n3. Do NOT provide feedback in this response, ONLY ask the next question.\n4. Make it perfectly aligned with the {data.stage_name} format (e.g. if System Design, ask scaling architectures related to their past work. If Hiring Manager, ask behavioral questions tied to their past projects)."
        
        next_q = call_llm_with_context(
            user_id=data.session_id,
            prompt=prompt_instruction,
            system_prompt=f"You are a strict tech industry interviewer. {stage_context}",
            api_key=data.api_key,
            response_format="text"
        )
        
        # Save evaluation to DB for final report
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO aiprep_tool_evaluations (user_id, type, score, passed, feedback, raw_response)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    data.session_id,
                    "interview_answer",
                    coaching.get("score", 7),
                    coaching.get("score", 7) >= 7,
                    json.dumps(coaching.get("mistakes", [])),
                    json.dumps({
                        "question": data.current_question,
                        "answer": data.user_answer,
                        "improved": coaching.get("better_version", "")
                    })
                ))
            conn.commit()
            conn.close()
        except Exception as e:
            print("Failed to save interview evaluation:", e)
        
        
        return {
            "reply": next_q,
            "evaluation": {
                "overall_score": coaching.get("score", 7),
                "gap_analysis": coaching.get("mistakes", []),
                "improved_answer": coaching.get("better_version", "")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CompleteRequest(BaseModel):
    session_id: str

@router.post("/complete")
def complete_interview(data: CompleteRequest):
    """
    Marks the interview module as completed.
    """
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO aiprep_tool_evaluations (user_id, type, score, passed, feedback, raw_response)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                data.session_id,
                "interview_complete",
                10,
                True,
                "[]",
                "{}"
            ))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

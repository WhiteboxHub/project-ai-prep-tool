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
    Adapter for frontend: send answer, get feedback and the next question combined conversationally.
    """
    try:
        if not data.api_key:
            data.api_key = get_user_api_key(data.session_id)
            
        # 1. Fetch candidate project context for hyper-personalized interview flow
        conn = get_db_connection()
        proj = {}
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT product, architecture, role, company_name, domain, impact FROM aiprep_tool_project_context WHERE user_id = %s", (data.session_id,))
                res = cursor.fetchone()
                if res:
                    proj = res
        except Exception as e:
            print("Could not fetch project context:", e)
        finally:
            conn.close()
            
        cand_context = f"Company: {proj.get('company_name', 'Enterprise')} ({proj.get('domain', 'Tech')})\nRole: {proj.get('role', 'AI Engineer')}\nProduct: {proj.get('product', '')}\nArchitecture: {proj.get('architecture', '')}\nImpact: {proj.get('impact', '')}"
        
        prompt = f"""
        You are an elite Silicon Valley Technical Recruiter and Senior Engineering Interviewer conducting a mock interview round: '{data.stage_name}'.
        
        Candidate's Background & Project Data:
        {cand_context}
        
        Previous Conversation Transcript:
        {data.previous_context}
        
        Current Question Asked:
        {data.current_question}
        
        Candidate's Answer:
        {data.user_answer}
        
        CRITICAL ANTI-INFLATION RULES:
        1. PENALIZE SHORT/INCOMPLETE ANSWERS: If the candidate gives a 1-2 sentence vague answer or fails to answer the question deeply, their overall_score MUST be extremely low (1-4). Do not reward them just for talking.
        2. DO NOT ACCEPT FLUFF: Technical questions require technical depth. Behavioral questions require STAR format details. If they are missing, lower the score drastically.
        3. SCORING CALIBRATION (1-10 scale):
           - 1-4: Very weak, dodged the question, or extremely short/incomplete.
           - 5-6: Mediocre, answered the basics but lacked depth, architecture, or professional structure.
           - 7-8: Good, solid answer with structure and technical accuracy.
           - 9-10: Elite, Silicon Valley level answer with deep technical insights or excellent leadership signals.
           
        Your task is twofold:
        1. Evaluate the candidate's current answer STRICTLY using the calibration above. Provide an overall score (1-10), a gap analysis listing specific mistakes or missing details, and an elite, structured improved version of how the answer should have been delivered.
        2. Act conversationally and contextually as the interviewer to generate your reply and the next question. Do NOT follow a rigid static script.
           - If the candidate gave a shallow or brief answer -> Ask a sharp, probing follow-up demanding the missing details.
           - If the candidate mentioned a specific technology -> Ask an advanced scaling, latency, or architectural trade-off question.
           - If the candidate gave an exceptionally strong answer -> Acknowledge it professionally and progress naturally to the next topic.
        
        You MUST return valid JSON matching this exact structure:
        {{
            "evaluation": {{
                "overall_score": <number 1-10>,
                "gap_analysis": ["specific gap 1", "specific gap 2"],
                "improved_answer": "A polished, structured, professional version of the answer."
            }},
            "follow_up_type": "<one of: deeper_follow_up, architecture_scaling, problem_solving, next_topic>",
            "reply": "<The conversational response and next question you ask the candidate as the interviewer>"
        }}
        """
        
        res_str = call_llm_with_context(
            user_id=data.session_id,
            prompt=prompt,
            system_prompt="You are an expert technical interviewer and AI evaluator.",
            api_key=data.api_key,
            response_format="json_object"
        )
        
        from services.evaluator import safe_parse_json
        eval_data = safe_parse_json(res_str)
        if "error" in eval_data or "evaluation" not in eval_data:
            # fallback
            eval_data = {
                "evaluation": {
                    "overall_score": 7,
                    "gap_analysis": ["Answer could be more structured and detailed."],
                    "improved_answer": data.user_answer
                },
                "follow_up_type": "next_topic",
                "reply": "Thank you for that explanation. Let's move on to the next topic."
            }
            
        score = eval_data["evaluation"].get("overall_score", 7)
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO aiprep_tool_evaluations (user_id, type, score, passed, feedback, raw_response)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    data.session_id,
                    "interview_answer",
                    score,
                    score >= 7,
                    json.dumps(eval_data["evaluation"].get("gap_analysis", [])),
                    json.dumps({
                        "question": data.current_question,
                        "answer": data.user_answer,
                        "improved": eval_data["evaluation"].get("improved_answer", ""),
                        "follow_up_type": eval_data.get("follow_up_type", "next_topic"),
                        "stage_name": data.stage_name
                    })
                ))
            conn.commit()
            conn.close()
        except Exception as e:
            print("Failed to save interview evaluation:", e)
            
        return {
            "reply": eval_data.get("reply", "Let's move on to the next topic."),
            "follow_up_type": eval_data.get("follow_up_type", "next_topic"),
            "evaluation": eval_data.get("evaluation", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CompleteRequest(BaseModel):
    session_id: str

@router.post("/complete")
def complete_interview(data: CompleteRequest):
    """
    Marks the interview module as completed and generates a rigorous 11-dimension final executive report.
    """
    api_key = get_user_api_key(data.session_id)
    conn = get_db_connection()
    answers = []
    proj = {}
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT score, feedback, raw_response FROM aiprep_tool_evaluations WHERE user_id = %s AND type = 'interview_answer' ORDER BY created_at ASC", (data.session_id,))
            answers = cursor.fetchall()
            
            cursor.execute("SELECT product, architecture, role, company_name, domain FROM aiprep_tool_project_context WHERE user_id = %s", (data.session_id,))
            res = cursor.fetchone()
            if res:
                proj = res
    except Exception as e:
        print("Error fetching complete data:", e)
    finally:
        conn.close()
        
    transcript_history = ""
    total_score_sum = 0
    valid_count = 0
    for idx, ans in enumerate(answers):
        try:
            raw = json.loads(ans["raw_response"]) if isinstance(ans["raw_response"], str) else ans["raw_response"]
            q = raw.get("question", "")
            a = raw.get("answer", "")
            transcript_history += f"Q{idx+1} ({raw.get('stage_name', 'Stage')}): {q}\nCandidate Answer: {a}\n\n"
            total_score_sum += int(ans["score"])
            valid_count += 1
        except:
            pass
            
    avg_score = round((total_score_sum / valid_count) * 10) if valid_count > 0 else 75
    
    prompt = f"""
    Analyze the complete mock interview transcript and all answers delivered by this candidate across their interview sessions.
    
    Candidate Profile:
    Company/Domain: {proj.get('company_name', 'Enterprise')} ({proj.get('domain', 'Tech')})
    Role: {proj.get('role', 'AI Engineer')}
    Product/Architecture: {proj.get('product', '')} - {proj.get('architecture', '')}
    
    Complete Interview Transcript:
    {transcript_history}
    
    Perform a rigorous, comprehensive executive evaluation across all answers and complete transcript history.
    Score each numeric metric on a scale of 0 to 100.
    
    You MUST return valid JSON matching this exact structure:
    {{
        "overall_score": {avg_score},
        "communication_score": <number 0-100>,
        "technical_depth": <number 0-100>,
        "confidence_analysis": "<detailed string analysis of candidate confidence, phrasing, and delivery>",
        "problem_solving_ability": "<detailed string analysis of candidate problem solving methodology>",
        "leadership_behavioral": "<detailed string analysis of candidate behavioral signals and autonomy>",
        "answer_clarity": "<detailed string analysis of articulation and structure>",
        "ai_suggestions": ["actionable expert suggestion 1", "actionable expert suggestion 2"],
        "improvement_areas": ["specific area for improvement 1", "specific area for improvement 2"],
        "strengths": ["core strength 1", "core strength 2"],
        "weaknesses": ["core weakness 1", "core weakness 2"]
    }}
    """
    
    res_str = call_llm_with_context(
        user_id=data.session_id,
        prompt=prompt,
        system_prompt="You are a Principal AI Architect and Executive Recruiter generating a final interview performance report.",
        api_key=api_key,
        response_format="json_object"
    )
    
    from services.evaluator import safe_parse_json
    final_report = safe_parse_json(res_str)
    if "error" in final_report:
        final_report = {
            "overall_score": avg_score,
            "communication_score": 80,
            "technical_depth": 75,
            "confidence_analysis": "Candidate demonstrated solid composure and confidence.",
            "problem_solving_ability": "Demonstrated logical reasoning when discussing technical trade-offs.",
            "leadership_behavioral": "Showed ownership of project deliverables.",
            "answer_clarity": "Most responses were structured and easy to follow.",
            "ai_suggestions": ["Practice structuring multi-part answers using the STAR method.", "Deepen explanations of distributed scaling bottlenecks."],
            "improvement_areas": ["System scaling under high concurrency", "Conciseness in initial problem descriptions"],
            "strengths": ["Domain familiarity", "Clear communication of project architecture"],
            "weaknesses": ["Occasional lack of depth on low-level optimization"]
        }
        
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO aiprep_tool_evaluations (user_id, type, score, passed, feedback, raw_response)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                data.session_id,
                "interview_complete",
                final_report.get("overall_score", avg_score),
                final_report.get("overall_score", avg_score) >= 70,
                json.dumps(final_report.get("improvement_areas", [])),
                json.dumps(final_report)
            ))
        conn.commit()
        conn.close()
    except Exception as e:
        print("Failed to save final interview evaluation:", e)
        
    return {"success": True, "report": final_report}

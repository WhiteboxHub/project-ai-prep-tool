"""
Mock Interview Router:
POST /api/mock-interview/start           — Generate 10 questions
POST /api/mock-interview/evaluate-answer — Evaluate a single answer
GET  /api/mock-interview/session         — Get existing session with questions
GET  /api/mock-interview/answers         — Get all evaluated answers for a session
"""
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Candidate, ProjectExtraction, MockInterviewSession, InterviewAnswer
from services.mock_interview_agent import generate_interview_questions, evaluate_answer

router = APIRouter(prefix="/api/mock-interview", tags=["mock-interview"])


class StartRequest(BaseModel):
    session_id: str


class AnswerRequest(BaseModel):
    session_id: str
    mock_session_id: int
    question: str
    question_id: int
    answer: str


@router.post("/start")
async def start_mock_interview(request: StartRequest, db: Session = Depends(get_db)):
    """
    Generate 10 interview questions for the candidate based on resume + extracted project.
    """
    candidate = db.query(Candidate).filter(Candidate.session_id == request.session_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not candidate.resume_text:
        raise HTTPException(status_code=400, detail="No resume found. Please upload your resume first.")

    # Get latest extracted project (or use empty if not extracted yet)
    extraction = (
        db.query(ProjectExtraction)
        .filter(ProjectExtraction.session_id == request.session_id)
        .order_by(ProjectExtraction.created_at.desc())
        .first()
    )
    project_details = extraction.project_details if extraction else "No project extracted yet."

    try:
        questions = await generate_interview_questions(
            resume_text=candidate.resume_text,
            project_details=project_details,
            api_key=candidate.api_key,
            provider=candidate.api_provider,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")

    # Save session
    mock_session = MockInterviewSession(
        session_id=request.session_id,
        questions_json=json.dumps(questions),
    )
    db.add(mock_session)
    db.commit()
    db.refresh(mock_session)

    return {
        "session_id": request.session_id,
        "mock_session_id": mock_session.id,
        "questions": questions,
        "total_questions": len(questions),
    }


@router.post("/evaluate-answer")
async def evaluate_interview_answer(request: AnswerRequest, db: Session = Depends(get_db)):
    """
    Evaluate a single candidate answer and store the result.
    """
    candidate = db.query(Candidate).filter(Candidate.session_id == request.session_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Session not found.")

    if not request.answer or len(request.answer.strip()) < 10:
        raise HTTPException(status_code=400, detail="Answer too short. Please provide a detailed answer.")

    try:
        result = await evaluate_answer(
            question=request.question,
            answer=request.answer,
            api_key=candidate.api_key,
            provider=candidate.api_provider,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Answer evaluation failed: {str(e)}")

    # Save answer
    interview_answer = InterviewAnswer(
        session_id=request.session_id,
        mock_session_id=request.mock_session_id,
        question=request.question,
        answer=request.answer,
        overall_score=str(result.get("overall_score", 0)),
        scores_json=json.dumps(result.get("scores", {})),
        feedback=result.get("feedback", ""),
        ideal_answer=result.get("ideal_answer", ""),
    )
    db.add(interview_answer)
    db.commit()

    return {
        "session_id": request.session_id,
        "question_id": request.question_id,
        **result,
    }


@router.get("/session")
async def get_mock_session(session_id: str, db: Session = Depends(get_db)):
    """Get the latest mock interview session with questions."""
    mock_session = (
        db.query(MockInterviewSession)
        .filter(MockInterviewSession.session_id == session_id)
        .order_by(MockInterviewSession.created_at.desc())
        .first()
    )
    if not mock_session:
        return {"session_id": session_id, "mock_session_id": None, "questions": []}

    questions = json.loads(mock_session.questions_json) if mock_session.questions_json else []
    return {
        "session_id": session_id,
        "mock_session_id": mock_session.id,
        "questions": questions,
        "created_at": str(mock_session.created_at),
    }


@router.get("/answers")
async def get_interview_answers(session_id: str, mock_session_id: int, db: Session = Depends(get_db)):
    """Get all evaluated answers for a mock interview session."""
    answers = (
        db.query(InterviewAnswer)
        .filter(
            InterviewAnswer.session_id == session_id,
            InterviewAnswer.mock_session_id == mock_session_id,
        )
        .order_by(InterviewAnswer.created_at.asc())
        .all()
    )
    return {
        "session_id": session_id,
        "answers": [
            {
                "id": a.id,
                "question": a.question,
                "answer": a.answer,
                "overall_score": float(a.overall_score) if a.overall_score else 0,
                "scores": json.loads(a.scores_json) if a.scores_json else {},
                "feedback": a.feedback,
                "ideal_answer": a.ideal_answer,
            }
            for a in answers
        ],
        "average_score": (
            round(sum(float(a.overall_score or 0) for a in answers) / len(answers), 1)
            if answers else 0
        ),
    }

class EvaluateAnswerRequest(BaseModel):
    session_id: str
    current_question: str
    user_answer: str
    stage_name: str
    previous_context: str = ""

@router.post("/evaluate-live")
async def evaluate_answer_and_followup(request: EvaluateAnswerRequest, db: Session = Depends(get_db)):
    """Evaluate candidate answer structurally and provide 'Ideal Answer', Gap Analysis, and follow-up."""
    candidate = db.query(Candidate).filter(Candidate.session_id == request.session_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    from services.ai_client import generate_text_with_usage
    from services.template_loader import get_intro_template
    import json
    
    intro_template = get_intro_template() if request.stage_name == "AI Intro Test" else ""
    
    stage_rules = ""
    if request.stage_name == "AI Intro Test":
        stage_rules = """
    SPECIAL RULE FOR STAGE "AI Intro Test":
    This stage is strictly just an initial evaluation. Do NOT generate a conversational follow-up question acting as if the interview is continuing.
    If the overall score is strictly less than 8.0, set "retry_required" to true. In "follow_up_question", dynamically analyze EXACTLY what they missed compared to the Expected Intro Structure. Provide direct, highly specific feedback on what they need to add.
    If the overall score >= 8.0, set "retry_required" to false, and set "follow_up_question" to exactly: "Excellent introduction. You covered your background and projects perfectly."
        """
    else:
        stage_rules = """
    STAGE RULES:
    Set "retry_required" to false. Ensure your "follow_up_question" is unique, directly tailored to the candidate's resume, and dives deeper into their past experiences/projects. Do NOT repeat prior questions.
        """
    
    prompt = f"""
    You are a supportive but rigorous senior technical interviewer.
    Keep the tone constructive, specific, and professional (never robotic or harsh).
    
    Stage: {request.stage_name}
    Candidate Resume Context:
    {candidate.resume_text[:2000] if candidate.resume_text else "No resume provided."}
    
    {f"Expected Intro Structure/Template:\\n{intro_template}" if intro_template else ""}
    
    Previous Context: {request.previous_context}
    
    Current Question: "{request.current_question}"
    Candidate Answer: "{request.user_answer}"
    
    Evaluate the candidate's answer structurally. Generate a concise Ideal Answer first, then compare.
    {stage_rules}
    
    Return ONLY valid JSON matching this exact schema (no markdown formatting):
    {{
      "scores": {{
        "clarity": <0-10>,
        "technical_depth": <0-10>,
        "communication": <0-10>,
        "confidence": <0-10>
      }},
      "overall_score": <0-10.0>,
      "retry_required": <boolean>,
      "strengths": ["...", "..."],
      "weaknesses": ["...", "..."],
      "improved_answer": "...",
      "gap_analysis": ["...", "..."],
      "follow_up_question": "<A spoken, natural follow up question or acknowledgment (1-3 sentences) acting as the interviewer.>"
    }}
    """
    
    try:
        response_data = await generate_text_with_usage(prompt, candidate.api_key, candidate.api_provider, max_retries=1)
        response_text = response_data["content"].strip()
        tokens_used = response_data["usage"]["tokens"]
        
        # Track Tokens
        candidate.total_tokens_used += tokens_used
        candidate.total_requests += 1
        db.commit()
        
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1]
            
        evaluation = json.loads(response_text.strip())
        
        # Ensure fallback for follow_up if missing
        if "follow_up_question" not in evaluation:
            evaluation["follow_up_question"] = "Thank you. Let's move on to the next topic."
            
        # Fix 500 Report Error: Save the answered evaluation to SQL so /api/report/generate has data!
        new_answer = InterviewAnswer(
            session_id=request.session_id,
            mock_session_id=None,
            question=request.current_question,
            answer=request.user_answer,
            overall_score=str(evaluation.get("overall_score", 0)),
            scores_json=json.dumps(evaluation.get("scores", {})),
            feedback="Strengths: " + " ".join(evaluation.get("strengths", [])) + " | Weaknesses: " + " ".join(evaluation.get("weaknesses", [])),
            ideal_answer=evaluation.get("improved_answer", ""),
        )
        db.add(new_answer)
        db.commit()
            
        return {
            "reply": evaluation["follow_up_question"],
            "evaluation": evaluation,
            "usage": {
                "total_tokens_used": candidate.total_tokens_used,
                "total_requests": candidate.total_requests
            }
        }
    except Exception as e:
        print("Evaluation parsing failed:", e)
        # Fallback response
        return {
            "reply": "I see. Let's dig deeper. Can you elaborate further?",
            "evaluation": None,
            "usage": {"total_tokens_used": getattr(candidate, "total_tokens_used", 0), "total_requests": getattr(candidate, "total_requests", 0)}
        }

@router.get("/stage-questions")
async def get_stage_questions(session_id: str, db: Session = Depends(get_db)):
    """Generate exactly 6 contextual questions tailored to the candidate's resume and project."""
    candidate = db.query(Candidate).filter(Candidate.session_id == session_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not candidate.resume_text:
        raise HTTPException(status_code=400, detail="No resume uploaded.")

    # Get latest extracted project
    extraction = (
        db.query(ProjectExtraction)
        .filter(ProjectExtraction.session_id == session_id)
        .order_by(ProjectExtraction.created_at.desc())
        .first()
    )
    project_details = extraction.project_details if extraction else ""
    if not project_details or len(project_details.strip()) < 60:
        return {
            "questions": [],
            "needs_project_brief": True,
            "briefing_prompt": (
                "I could not confidently identify your first major project from your resume. "
                "Please share a brief (problem, stack, your role, and impact) so I can generate tailored interview rounds."
            ),
        }

    from services.ai_client import generate_text
    from services.template_loader import get_intro_template
    import json
    
    intro_template = get_intro_template()
    
    prompt = f"""
    You are an expert technical interviewer configuring a 6-stage interview panel.
    
    Candidate Resume Background: 
    {candidate.resume_text[:2000]}
    
    Candidate Major Project Highlight:
    {project_details}

    Generation Seed (for question variety): {datetime.utcnow().isoformat()}
    
    Based on the candidate's background and project, craft exactly 6 tailored interview questions as a pure JSON array containing 6 strings.
    IMPORTANT: DO NOT prefix the questions with the stage name (e.g., do not output 'AI Intro Test:'). Just output the question itself as if you are directly speaking to the candidate.
    
    Avoid generic wording. The 6 questions must all be different from each other.
    
    [
      "Welcome, thanks for joining me. To start, could you please tell me a bit about yourself and the projects you've recently worked on? (Make it natural and conversational. Do NOT explicitly name their specific projects here or act robotic. We expect their answer to naturally be structurally similar to: {intro_template[:300]}...)",
      "Ask a deep conceptual question tied to one key framework/technology they used in their project.",
      "Ask a behavioral ownership/conflict tradeoff question specifically tied to their past roles or project.",
      "Ask a rigorous architectural or scaling question specific to their core technical stack.",
      "Ask for a high-level architecture design related to their primary domain.",
      "Ask a concise coding/algorithm challenge that reflects a practical challenge from their stack."
    ]
    
    Return ONLY valid JSON array of 6 strings. No markdown.
    """
    
    try:
        response = await generate_text(prompt, candidate.api_key, candidate.api_provider)
        response = response.strip()
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1]
            
        questions = json.loads(response.strip())
        if type(questions) != list or len(questions) < 6:
            raise ValueError("LLM returned malformed question list.")

        unique_questions = []
        seen_norm = set()
        for q in questions:
            if not isinstance(q, str):
                continue
            norm = " ".join(q.lower().split())
            if norm in seen_norm:
                continue
            seen_norm.add(norm)
            unique_questions.append(q.strip())
            if len(unique_questions) == 6:
                break

        if len(unique_questions) < 6:
            raise ValueError("Insufficient unique questions returned by model.")

        unique_questions[0] = "Welcome, thanks for joining me. To start, could you please tell me a bit about yourself and the projects you've recently worked on?"

        return {"questions": unique_questions, "needs_project_brief": False}
    except Exception as e:
        print("Failed to gen dynamic questions:", e)
        # Fallback to hardcoded generic but functional
        return {"questions": [
            "Welcome. Let's start with a brief introduction. Can you walk me through your resume?",
            "Great. Can you explain the difference between processes and threads?",
            "I'm the Hiring Manager. Tell me about a time you resolved a conflict.",
            "Technical Panel. How would you troubleshoot a failing microservice?",
            "System Design. Design a scalable URL shortener.",
            "Coding. How would you detect a cycle in a directed graph?"
        ], "needs_project_brief": False}


"""
Report Router:
POST /api/report/generate  — Generate final interview preparation report
GET  /api/report/latest    — Get the latest report for a session
"""
import json
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Candidate, ProjectExtraction, IntroAttempt, InterviewAnswer, FinalReport
from services.mock_interview_agent import generate_final_report

router = APIRouter(prefix="/api/report", tags=["report"])


class ReportRequest(BaseModel):
    session_id: str


def _normalize_report_payload(data: dict) -> dict:
    normalized = {}
    for key, value in data.items():
        clean_key = str(key).strip().replace("\n", "").replace("\r", "").replace('"', "")
        normalized[clean_key] = value
    return normalized


@router.post("/generate")
async def generate_report(request: ReportRequest, db: Session = Depends(get_db)):
    """
    Generate the final interview preparation report using all available data.
    """
    candidate = db.query(Candidate).filter(Candidate.session_id == request.session_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Gather all data
    extraction = (
        db.query(ProjectExtraction)
        .filter(ProjectExtraction.session_id == request.session_id)
        .order_by(ProjectExtraction.created_at.desc())
        .first()
    )
    project_details = extraction.project_details if extraction else "No project extracted."

    # Latest intro attempt
    latest_intro = (
        db.query(IntroAttempt)
        .filter(IntroAttempt.session_id == request.session_id)
        .order_by(IntroAttempt.created_at.desc())
        .first()
    )
    intro_score = latest_intro.score or 0 if latest_intro else 0
    # Normalize intro score — stored as 0-100 from audio eval, or 0-10 from text eval
    if intro_score <= 10:
        intro_score_normalized = intro_score * 10
    else:
        intro_score_normalized = intro_score
    intro_status = "PASS" if intro_score_normalized >= 70 else "FAIL"

    # All interview answers
    answers = (
        db.query(InterviewAnswer)
        .filter(InterviewAnswer.session_id == request.session_id)
        .order_by(InterviewAnswer.created_at.asc())
        .all()
    )
    answer_scores = [float(a.overall_score or 0) for a in answers]

    try:
        raw_json_str = await generate_final_report(
            resume_text=candidate.resume_text or "",
            project_details=project_details,
            intro_score=intro_score_normalized,
            intro_status=intro_status,
            answer_scores=answer_scores,
            api_key=candidate.api_key,
            provider=candidate.api_provider,
        )
        
        # Coerce JSON into Markdown template
        raw = raw_json_str.strip()
        if raw.startswith("```json"):
            raw = raw.split("```json")[1].split("```")[0]
        elif raw.startswith("```"):
            raw = raw.split("```")[1]
            
        data = _normalize_report_payload(json.loads(raw.strip()))

        if "overall_score" not in data:
            score = 0
            if answer_scores:
                score = int(round((sum(answer_scores) / len(answer_scores)) * 10))
            data["overall_score"] = str(score)
        if "hire_readiness" not in data:
            numeric = int(str(data.get("overall_score", "0")).strip() or 0)
            data["hire_readiness"] = "High" if numeric >= 75 else "Medium" if numeric >= 50 else "Low"
        data.setdefault("top_strengths", ["Good consistency across interview attempts."])
        data.setdefault("top_weaknesses", ["Need more role-specific depth in some answers."])
        data.setdefault("improvement_plan", ["Practice project-centric STAR responses daily."])
        
        report_content = f"""
## 1. Interview Readiness Verdict
**Status:** {data.get("hire_readiness", "Unknown")}  
**Overall Score:** {data.get("overall_score", 0)}/100

## 2. Core Strengths
{chr(10).join([f"- {s}" for s in data.get("top_strengths", [])])}

## 3. Critical Weaknesses
{chr(10).join([f"- {w}" for w in data.get("top_weaknesses", [])])}

## 4. Specific Improvement Plan (Action Items)
{chr(10).join([f"- {a}" for a in data.get("improvement_plan", [])])}
        """

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

    # Save report
    report = FinalReport(session_id=request.session_id, content=report_content)
    db.add(report)
    db.commit()

    return {
        "session_id": request.session_id,
        "content": report_content,
        "summary": {
            "intro_score": intro_score_normalized,
            "intro_status": intro_status,
            "questions_answered": len(answer_scores),
            "avg_answer_score": (
                round(sum(answer_scores) / len(answer_scores), 1) if answer_scores else 0
            ),
        },
    }


@router.get("/latest")
async def get_latest_report(session_id: str, db: Session = Depends(get_db)):
    """Get the latest generated report for this session."""
    report = (
        db.query(FinalReport)
        .filter(FinalReport.session_id == session_id)
        .order_by(FinalReport.created_at.desc())
        .first()
    )
    if not report:
        return {"session_id": session_id, "content": None}
    return {
        "session_id": session_id,
        "content": report.content,
        "created_at": str(report.created_at),
    }

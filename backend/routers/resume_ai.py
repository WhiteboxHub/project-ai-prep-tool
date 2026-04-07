"""
Resume extended router:
- /api/resume/extract-project  — Extract the most recent project from resume
- /api/resume/intro-training   — Generate intro template explanation + sample intro
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Candidate, ProjectExtraction
from services.project_extractor import extract_project_from_resume
from services.intro_evaluator import generate_intro_training
from pydantic import BaseModel

router = APIRouter(prefix="/api/resume", tags=["resume-ai"])


class ExtractRequest(BaseModel):
    session_id: str


class ProjectBriefRequest(BaseModel):
    session_id: str
    project_brief: str


@router.post("/extract-project")
async def extract_project(request: ExtractRequest, db: Session = Depends(get_db)):
    """
    Extract the most recent, most relevant project from the candidate's resume.
    """
    candidate = db.query(Candidate).filter(Candidate.session_id == request.session_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not candidate.resume_text:
        raise HTTPException(status_code=400, detail="No resume found. Please upload your resume first.")

    try:
        project_details = await extract_project_from_resume(
            resume_text=candidate.resume_text,
            api_key=candidate.api_key,
            provider=candidate.api_provider,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Project extraction failed: {str(e)}")

    # Save extracted project to DB
    extraction = ProjectExtraction(session_id=request.session_id, project_details=project_details)
    db.add(extraction)
    db.commit()

    return {"session_id": request.session_id, "project_details": project_details}


@router.post("/project-brief")
async def save_project_brief(request: ProjectBriefRequest, db: Session = Depends(get_db)):
    """
    Save a user-provided project brief when resume extraction is insufficient.
    """
    candidate = db.query(Candidate).filter(Candidate.session_id == request.session_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not request.project_brief or len(request.project_brief.strip()) < 40:
        raise HTTPException(status_code=400, detail="Project brief is too short. Please add more detail.")

    extraction = ProjectExtraction(
        session_id=request.session_id,
        project_details=request.project_brief.strip(),
    )
    db.add(extraction)
    db.commit()
    return {"session_id": request.session_id, "project_details": extraction.project_details}


@router.get("/latest-project")
async def get_latest_project(session_id: str, db: Session = Depends(get_db)):
    """Get the most recently extracted project for this session."""
    extraction = (
        db.query(ProjectExtraction)
        .filter(ProjectExtraction.session_id == session_id)
        .order_by(ProjectExtraction.created_at.desc())
        .first()
    )
    if not extraction:
        return {"session_id": session_id, "project_details": None}
    return {"session_id": session_id, "project_details": extraction.project_details}


@router.post("/intro-training")
async def get_intro_training(request: ExtractRequest, db: Session = Depends(get_db)):
    """
    Generate intro template explanation + personalized sample intro from resume.
    """
    candidate = db.query(Candidate).filter(Candidate.session_id == request.session_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not candidate.resume_text:
        raise HTTPException(status_code=400, detail="No resume found. Please upload your resume first.")

    try:
        training_content = await generate_intro_training(
            resume_text=candidate.resume_text,
            api_key=candidate.api_key,
            provider=candidate.api_provider,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intro training generation failed: {str(e)}")

    return {"session_id": request.session_id, "training_content": training_content}

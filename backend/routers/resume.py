import os
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Candidate
from schemas import ResumeSummaryResponse
from services.resume_parser import parse_resume
import aiofiles

router = APIRouter(prefix="/api/resume", tags=["resume"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}


@router.post("/upload", response_model=ResumeSummaryResponse)
async def upload_resume(
    session_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    candidate = db.query(Candidate).filter(Candidate.session_id == session_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Session not found. Please complete setup first.")

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Upload PDF or DOCX.")

    # Save file
    file_name = f"{session_id}_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Parse resume
    try:
        resume_text = parse_resume(file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=422, detail=f"Failed to parse resume: {str(e)}")

    if not resume_text or len(resume_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Resume appears empty or unreadable.")

    # Try to extract candidate name
    try:
        from services.ai_client import generate_text
        prompt = "Extract the candidate's full name from the beginning of this resume text. Return ONLY the name. Do not include titles or other text. Resume: " + resume_text[:1500]
        name = await generate_text(prompt, candidate.api_key, candidate.api_provider)
        candidate.candidate_name = name.strip()
    except Exception as e:
        candidate.candidate_name = "Candidate"
        print("Failed to extract name:", e)

    candidate.resume_text = resume_text
    candidate.resume_path = file_path
    db.commit()

    return ResumeSummaryResponse(
        session_id=session_id,
        resume_text=resume_text,
        word_count=len(resume_text.split()),
        candidate_name=candidate.candidate_name,
    )


@router.get("/summary", response_model=ResumeSummaryResponse)
async def get_resume_summary(session_id: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.session_id == session_id).first()
    if not candidate or not candidate.resume_text:
        raise HTTPException(status_code=404, detail="No resume found for this session.")

    return ResumeSummaryResponse(
        session_id=session_id,
        resume_text=candidate.resume_text,
        word_count=len(candidate.resume_text.split()),
        candidate_name=candidate.candidate_name,
    )

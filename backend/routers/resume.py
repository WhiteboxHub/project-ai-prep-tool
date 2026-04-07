import os
import uuid
import re
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
BAD_NAMES = {"candidate", "professional experience", "experience", "resume", "work history", "profile"}


def _extract_name_heuristic(resume_text: str) -> str:
    top_lines = [ln.strip() for ln in resume_text.splitlines()[:12] if ln.strip()]
    noise = (
        "resume",
        "curriculum",
        "vitae",
        "email",
        "phone",
        "linkedin",
        "github",
        "summary",
        "objective",
        "professional experience",
        "experience",
        "education",
        "projects",
        "skills",
        "work history",
    )
    for line in top_lines:
        clean = re.sub(r"[^A-Za-z\s\-]", "", line).strip()
        if len(clean) < 3 or len(clean) > 40:
            continue
        lower = clean.lower()
        if any(n in lower for n in noise):
            continue
        parts = [p for p in clean.split() if p and p[0].isalpha()]
        if 2 <= len(parts) <= 4 and all(p[:1].isupper() for p in parts):
            if clean.lower() in noise:
                continue
            return " ".join(parts[:3])
    return "Candidate"


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
        heuristic_name = _extract_name_heuristic(resume_text)
        from services.ai_client import generate_text
        import json
        prompt = "Extract the candidate's first and last name from the beginning of this resume text. Return ONLY a JSON object: {\"name\": \"Candidate Name\"}. If you cannot find a name, return: {\"name\": \"Candidate\"}. Do not include markdown or other text. Resume: " + resume_text[:1500]
        response = await generate_text(prompt, candidate.api_key, candidate.api_provider)
        response = response.strip()
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1]
            
        data = json.loads(response.strip())
        name = data.get("name", "Candidate")
        
        if len(name) > 30 or "sorry" in name.lower() or "provide" in name.lower():
            name = heuristic_name
        if name == "Candidate":
            name = heuristic_name
        candidate.candidate_name = name
    except Exception as e:
        candidate.candidate_name = _extract_name_heuristic(resume_text)
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

    current_name = (candidate.candidate_name or "").strip().lower()
    if not current_name or current_name in BAD_NAMES:
        try:
            heuristic_name = _extract_name_heuristic(candidate.resume_text)
            from services.ai_client import generate_text
            import json
            prompt = "Extract the candidate's first and last name from the beginning of this resume text. Return ONLY a JSON object: {\"name\": \"Candidate Name\"}. If you cannot find a name, return: {\"name\": \"Candidate\"}. Do not include markdown or other text. Resume: " + candidate.resume_text[:1500]
            response = await generate_text(prompt, candidate.api_key, candidate.api_provider)
            response = response.strip()
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1]
            data = json.loads(response.strip())
            name = data.get("name", "Candidate")
            if len(name) <= 30 and "sorry" not in name.lower() and "provide" not in name.lower() and name.strip().lower() not in BAD_NAMES:
                candidate.candidate_name = name
                db.commit()
            elif heuristic_name != "Candidate":
                candidate.candidate_name = heuristic_name
                db.commit()
        except:
            heuristic_name = _extract_name_heuristic(candidate.resume_text)
            if heuristic_name != "Candidate":
                candidate.candidate_name = heuristic_name
                db.commit()

    return ResumeSummaryResponse(
        session_id=session_id,
        resume_text=candidate.resume_text,
        word_count=len(candidate.resume_text.split()),
        candidate_name=candidate.candidate_name,
    )


from schemas import ResumeAnalyticsResponse
import json

@router.get("/analytics", response_model=ResumeAnalyticsResponse)
async def get_resume_analytics(session_id: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.session_id == session_id).first()
    if not candidate or not candidate.resume_text:
        raise HTTPException(status_code=404, detail="No resume found.")

    from models import ResumeAnalytics
    from services.ai_client import generate_text

    # check cache
    existing = db.query(ResumeAnalytics).filter(ResumeAnalytics.session_id == session_id).first()
    if existing:
        try:
            data = json.loads(existing.analytics_json)
            projects = data.get("projects", [])
            old_shape = bool(projects) and isinstance(projects[0], dict) and ("company" not in projects[0])
            if not old_shape:
                return ResumeAnalyticsResponse(session_id=session_id, **data)
        except Exception as e:
            pass # fallback to generation
    if existing:
        try:
            db.delete(existing)
            db.commit()
        except Exception:
            db.rollback()
    try:
        # Try to infer candidate name from sample intro when DB value is weak
        if (not candidate.candidate_name or candidate.candidate_name.strip().lower() in BAD_NAMES) and candidate.resume_text:
            first_line = _extract_name_heuristic(candidate.resume_text)
            if first_line != "Candidate":
                candidate.candidate_name = first_line
                db.commit()
    except Exception:
        db.rollback()

    prompt = """
    Analyze the following resume text and extract these details in valid JSON format ONLY:
    {
       "keywords": ["React", "Python", "Leadership"],
       "improvements": ["Structure your achievements around hard metrics instead of vague responsibilities.", "Ensure consistent verb tenses across older positions."],
       "projects": [
          {"company": "Company Name", "name": "Project Name", "date": "Jan 2021 - May 2021", "desc": "1-2 line project summary"}
       ],
       "sample_intro": "Hi, my name is [Name]. I have [X] years of experience in [domain]. I specialize in [key skills like Python, machine learning, cloud]. In my last role at [Company], I built [key achievement]. I am passionate about [area] and I am looking for opportunities in [role]."
    }
    
    IMPORTANT: 
    1. For `improvements`, provide structural, metric-driven feedback instead of generic advice. Give 2-3 specific actionable improvements.
    2. For `projects`, return only company + project + date + concise 1-2 line summary. If any field is unavailable, keep it as empty string.
    3. For `sample_intro`: Fill in the bracketed variables explicitly using facts from the candidate's resume to create a rich 3-4 sentence professional elevator pitch.
    4. For `keywords`: return 12-20 concrete skills/tech/domain keywords (frameworks, infra, databases, tools, roles), not generic words.
    5. Return up to 5 projects in reverse chronology if possible.
    
    Resume Text:
    """ + candidate.resume_text[:4000]

    try:
        response_text = await generate_text(prompt, candidate.api_key, candidate.api_provider)
        
        # cleanup markdown json
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1]
            
        data = json.loads(response_text.strip())
        
        # Save to DB
        analytic_record = ResumeAnalytics(
            session_id=session_id,
            analytics_json=json.dumps(data)
        )
        db.add(analytic_record)
        db.commit()

        return ResumeAnalyticsResponse(session_id=session_id, **data)

    except Exception as e:
        print("Analytics Generation Failed:", e)
        # return dummy on failure
        dummy = {
            "keywords": ["Skill 1", "Skill 2"],
            "improvements": ["Could not generate improvements at this time."],
            "projects": [],
            "sample_intro": "Could not generate intro."
        }
        return ResumeAnalyticsResponse(session_id=session_id, **dummy)

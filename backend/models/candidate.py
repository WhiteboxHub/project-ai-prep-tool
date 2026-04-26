from pydantic import BaseModel
from typing import Optional, Any

class CandidateCreate(BaseModel):
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None

class CandidateResponse(BaseModel):
    id: int
    user_id: str
    name: Optional[str]
    email: Optional[str]
    role: Optional[str]
    created_at: Any

class ResumeUpload(BaseModel):
    user_id: str
    resume_json: dict
    resume_pdf_url: Optional[str] = None

class ProjectContextData(BaseModel):
    user_id: str
    product: Optional[str] = None
    architecture: Optional[str] = None
    business_value: Optional[str] = None
    role: Optional[str] = None
    impact: Optional[str] = None
    api_key: Optional[str] = None
    domain: Optional[str] = None
    background: Optional[str] = None
    skills: Optional[list] = None

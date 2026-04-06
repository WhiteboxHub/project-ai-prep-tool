from pydantic import BaseModel
from typing import Optional


class SetupRequest(BaseModel):
    api_key: str
    api_provider: str = "openai"   # "openai" | "gemini"


class SetupResponse(BaseModel):
    session_id: str
    message: str
    models_available: dict
    candidate_name: Optional[str] = None


class ResumeSummaryResponse(BaseModel):
    session_id: str
    resume_text: str
    word_count: int
    candidate_name: Optional[str] = None


class CaseStudyRequest(BaseModel):
    session_id: str
    topic: Optional[str] = None    # optional: "customer care", "RAG", etc.


class CaseStudyResponse(BaseModel):
    session_id: str
    content: str


class IntroEvaluationResponse(BaseModel):
    session_id: str
    transcript: str
    score: int
    feedback: str
    passed: bool


class IntroAttemptItem(BaseModel):
    id: int
    transcript: Optional[str]
    score: Optional[int]
    feedback: Optional[str]
    created_at: str

    class Config:
        from_attributes = True

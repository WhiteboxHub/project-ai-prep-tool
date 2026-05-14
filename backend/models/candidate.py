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
    business_problem: Optional[str] = None
    previous_system: Optional[str] = None
    key_objectives: Optional[str] = None
    users_scale: Optional[str] = None
    agents_components: Optional[str] = None
    key_workflows: Optional[str] = None
    tools_integrations: Optional[str] = None
    tech_stack: Optional[str] = None
    ai_techniques: Optional[str] = None
    evaluation_approach: Optional[str] = None
    challenges_learnings: Optional[str] = None
    safety_guardrails: Optional[str] = None
    future_roadmap: Optional[str] = None
    company_name: Optional[str] = None
    key_problems: Optional[str] = None
    agent_usage: Optional[str] = None
    learnings: Optional[str] = None

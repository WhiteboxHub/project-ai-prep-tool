import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.connection import get_db_connection
from services.user_context import get_user_api_key
from services.llm_service import call_llm_with_context

router = APIRouter(prefix="/api/case-study", tags=["case-study"])

class GenerateRequest(BaseModel):
    session_id: str
    topic: Optional[str] = None

class GenerateTemplateRequest(BaseModel):
    session_id: str
    project_details: str
    template_key: str

@router.post("/generate")
def generate_standard_case_study(req: GenerateRequest):
    conn = None
    try:
        api_key = get_user_api_key(req.session_id)
        if not api_key:
            raise HTTPException(401, "API key not found")

        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT product, architecture, business_value, role, impact FROM project_context WHERE user_id = %s", (req.session_id,))
            res = cursor.fetchone()
            if not res:
                raise HTTPException(404, "No project context found. Please extract your project first.")
            
            answers = f"""
Product: {res['product']}
Architecture: {res['architecture']}
Business Value: {res['business_value']}
Role: {res['role']}
Impact: {res['impact']}
"""

        prompt = f"""
Generate a structured, professional case study in Markdown format based on the following project context.

Input:
{answers}

Make sure to include sections like: Overview, Architecture, Key Challenges, and Impact.
"""

        system_prompt = "You are an expert technical writer and interviewer building a realistic project case study."

        res_str = call_llm_with_context(
            user_id=req.session_id,
            prompt=prompt,
            system_prompt=system_prompt,
            api_key=api_key,
            response_format="text"
        )

        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO case_studies (user_id, content, topic)
                VALUES (%s, %s, %s)
            """, (req.session_id, res_str, req.topic or "Resume Project"))
        conn.commit()

        return {"content": res_str}

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(500, detail=f"Failed to generate case study: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.post("/generate-from-template")
def generate_template_case_study(req: GenerateTemplateRequest):
    conn = None
    try:
        api_key = get_user_api_key(req.session_id)
        if not api_key:
            raise HTTPException(401, "API key not found")

        templates = {
            "rag": "Retrieval-Augmented Generation (RAG) System architecture, detailing vector databases, chunking strategies, embedding models, and LLM orchestration.",
            "agentic": "Agentic AI System architecture, detailing autonomous planning, tool use (APIs/Databases), memory management, and reasoning loops.",
            "mlops": "MLOps and Model Deployment pipeline, detailing CI/CD for ML, model monitoring, drift detection, and scalable inference serving."
        }

        domain_focus = templates.get(req.template_key.lower(), "Technical System Design")

        prompt = f"""
You are an expert technical writer and AI Architect. Generate a highly detailed, professional Study Guide and Case Study focused strictly on the domain of: {domain_focus}.

The candidate's core background is:
{req.project_details}

Blend the candidate's existing background into this domain to create a realistic, challenging case study. The study guide MUST be written in clean Markdown.

Include the following sections:
# {domain_focus} Study Guide
## 1. Executive Summary
## 2. Target Architecture (Design the system)
## 3. Core Components & Technologies
## 4. Key Challenges & Trade-offs
## 5. Mock Interview Questions (Provide 3 technical questions the candidate should prepare for)
"""

        system_prompt = "You are an expert technical interviewer creating a domain-specific study guide for a candidate."

        res_str = call_llm_with_context(
            user_id=req.session_id,
            prompt=prompt,
            system_prompt=system_prompt,
            api_key=api_key,
            response_format="text"
        )

        conn = get_db_connection()
        topic_name = req.template_key.upper() + " Guide"
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO case_studies (user_id, content, topic)
                VALUES (%s, %s, %s)
            """, (req.session_id, res_str, topic_name))
        conn.commit()

        return {"content": res_str}

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(500, detail=f"Failed to generate domain case study: {str(e)}")
    finally:
        if conn:
            conn.close()

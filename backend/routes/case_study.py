import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.connection import get_db_connection
from services.user_context import get_user_api_key
from services.llm_service import call_llm_with_context
import os
import fitz  # PyMuPDF

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
            cursor.execute("SELECT product, architecture, business_value, role, impact FROM aiprep_tool_project_context WHERE user_id = %s", (req.session_id,))
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
FIRST PERSON PERSPECTIVE: You MUST write the entire case study from the perspective of the candidate using first-person pronouns ("I", "my", "we"). DO NOT say "The candidate built...", say "I built...".
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
                INSERT INTO aiprep_tool_case_studies (user_id, content, topic)
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

        template_files = {
            "rag": "case_study_rag.pdf",
            "agentic": "case_study_agentic_ai.pdf",
            "mlops": "case_study_mlops.pdf"
        }

        template_filename = template_files.get(req.template_key.lower())
        raw_template = ""
        
        if template_filename:
            pdf_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "templates",
                template_filename
            )
            try:
                doc = fitz.open(pdf_path)
                for page in doc:
                    raw_template += page.get_text() + "\n"
            except Exception as e:
                print("Failed to read PDF template:", e)

        prompt = f"""
You are a Principal AI Architect designing enterprise-grade systems.

Your task is to generate a COMPLETE, production-ready STUDY GUIDE for the following project.

Project Description / Candidate Background:
{req.project_details}

System Type / Domain Context:
{req.template_key.upper()}

Reference Domain Knowledge (Use this to inspire the technical depth and architecture specific to this domain):
{raw_template}

---

STRICT INSTRUCTIONS:

* Do NOT skip any section
* Do NOT be generic — include real-world constraints, trade-offs, and metrics
* Explain WHY decisions were made (not just WHAT)
* Include failures and rejected approaches
* Use structured, deep technical explanations
* Make it comparable to enterprise case studies (FAANG-level)
* FIRST PERSON PERSPECTIVE: You MUST write the entire case study from the perspective of the candidate using first-person pronouns ("I", "my", "we"). DO NOT say "The candidate built...", say "I built...".

---

GENERATE THE STUDY GUIDE USING THIS STRUCTURE:

1. BUSINESS PROBLEM & OBJECTIVES
* Detailed problem
* Users, scale, workflows
* Metrics (latency, AHT, accuracy, cost)

2. CURRENT SYSTEM CHALLENGES
* Operational issues
* Why existing system fails

3. SOLUTION EVALUATION
* At least 3–4 approaches
* Pros/cons
* Why rejected
* Final selected solution (with reasoning)

4. PROOF OF CONCEPT (POC)
* How it started
* What was built
* Tools used
* Results
* Learnings (what worked, failed, surprises)

5. SYSTEM REQUIREMENTS
* Latency, accuracy, scalability
* Compliance
* grounding / determinism
* real-time vs batch constraints

6. FULL SYSTEM ARCHITECTURE
(Adapt based on system type: RAG, MLOps, or Agentic)
* Core architecture
* Tech stack

7. INPUT / QUERY PIPELINE
* cleaning
* validation
* PII masking
* intent detection
* query rewriting

8. CORE EXECUTION FLOW
* Step-by-step flow of how system works end-to-end

9. MEMORY & STATE MANAGEMENT
* short-term
* long-term
* session context

10. EVALUATION STRATEGY
* Define metrics clearly
* How evaluation is done
* offline vs online evaluation

11. MONITORING & OBSERVABILITY
* logs, metrics, alerts
* tools used

12. GUARDRAILS & SAFETY
* prompt injection protection
* access control
* audit trails
* human-in-loop

13. FAILURE HANDLING
* retry logic
* fallback strategies
* escalation paths

14. INFRASTRUCTURE & DEPLOYMENT
* cloud architecture
* containers
* orchestration
* storage systems

15. ADVANCED DESIGN PATTERNS
* ReAct, multi-agent, caching, batching, etc.

16. FUTURE IMPROVEMENTS
* scaling
* optimization
* roadmap

---

OUTPUT REQUIREMENTS:

* Deep technical detail
* Structured sections with clear headings in Markdown
* Real-world system thinking
* No shallow explanations
* No missing components
"""

        system_prompt = "You are a Principal AI Architect. You MUST follow the EXACT 16-point FAANG structure provided."

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
                INSERT INTO aiprep_tool_case_studies (user_id, content, topic)
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

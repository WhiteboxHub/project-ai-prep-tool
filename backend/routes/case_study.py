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

# ──────────────────────────────────────────────────────────────────────────────
# TYPED GENERATION — All 6 case study types
# ──────────────────────────────────────────────────────────────────────────────

class GenerateTypedRequest(BaseModel):
    session_id: str
    case_type: str  # agentic | rag | finetuning | mlops | system_design | intro_template


TYPED_PROMPTS = {
    "agentic": (
        "Agentic AI Case Study",
        """You are a Principal AI Architect specializing in autonomous agentic systems.

Generate a COMPLETE, production-ready AGENTIC AI CASE STUDY for the candidate's project.

Use FIRST PERSON ("I built...", "My team designed..."). Write like a senior engineer reflecting on real work.

Structure your case study with these exact sections:

1. BUSINESS PROBLEM & OBJECTIVES — Problem, users, scale, KPIs
2. WHY AGENTS? — Why agentic AI was the right choice over simpler approaches
3. AGENT ARCHITECTURE — Orchestrator, sub-agents, tool registry, communication
4. TOOL DESIGN — Every tool the agents use, schemas, input/output
5. PLANNING & REASONING — ReAct loop, chain-of-thought, decision strategies
6. MEMORY & CONTEXT — Short/long-term memory, session state, vector stores
7. EVALUATION STRATEGY — How agent quality is measured (offline + online)
8. FAILURE HANDLING — Retry logic, fallbacks, human-in-the-loop escalation
9. GUARDRAILS & SAFETY — Prompt injection prevention, hallucination control
10. RESULTS & IMPACT — Business metrics, latency, accuracy, cost savings
11. LEARNINGS & FUTURE SCOPE — What worked, what didn't, roadmap

Be technically deep. Include real trade-offs. No shallow explanations."""
    ),
    "rag": (
        "RAG Case Study",
        """You are a Principal AI Architect specializing in Retrieval-Augmented Generation systems.

Generate a COMPLETE, production-ready RAG CASE STUDY for the candidate's project.

Use FIRST PERSON ("I built...", "My team designed..."). Write like a senior engineer.

Structure with these exact sections:

1. BUSINESS PROBLEM & OBJECTIVES — Problem, document sources, latency SLAs
2. RETRIEVAL ARCHITECTURE — Chunking strategy, embedding model, vector DB choice
3. INDEXING PIPELINE — Data ingestion, preprocessing, metadata tagging
4. QUERY PIPELINE — Query rewriting, intent detection, hybrid search, re-ranking
5. GENERATION LAYER — LLM selection, prompt template, context window management
6. EVALUATION STRATEGY — Faithfulness, relevance, answer correctness (RAGAS etc.)
7. HALLUCINATION PREVENTION — Grounding, citations, confidence thresholds
8. PERFORMANCE OPTIMIZATION — Caching, approximate nearest neighbor, batching
9. MONITORING & OBSERVABILITY — Drift detection, retrieval quality monitoring
10. RESULTS & IMPACT — Latency, accuracy, cost reduction, user adoption
11. LEARNINGS & FUTURE SCOPE — Failures encountered, next iterations

Be technically precise. Include specific tools, trade-offs, and real-world constraints."""
    ),
    "finetuning": (
        "Fine-tuning Case Study",
        """You are a Principal ML Engineer specializing in LLM fine-tuning and adaptation.

Generate a COMPLETE, production-ready FINE-TUNING CASE STUDY for the candidate's project.

Use FIRST PERSON. Write like a practitioner who shipped this to production.

Structure with these exact sections:

1. MOTIVATION — Why fine-tuning? What RAG or prompting couldn't solve?
2. DATA STRATEGY — Dataset collection, annotation, quality filtering, format
3. BASE MODEL SELECTION — Model choice rationale (size, license, domain fit)
4. FINE-TUNING APPROACH — Full fine-tuning vs. LoRA/QLoRA/PEFT, hyperparameters
5. TRAINING INFRASTRUCTURE — GPU setup, VRAM constraints, distributed training
6. EVALUATION SUITE — Benchmarks used, human eval, task-specific metrics
7. OVERFITTING & CATASTROPHIC FORGETTING — How these were mitigated
8. DEPLOYMENT — Model serving, quantization, inference optimization
9. SAFETY & ALIGNMENT — RLHF, DPO, instruction tuning guardrails
10. RESULTS & IMPACT — Performance delta vs. base model, latency, cost
11. LEARNINGS & FUTURE SCOPE — What surprised you, next fine-tuning cycle

Include real numbers. Name specific tools (TRL, Axolotl, HF Trainer, etc.)."""
    ),
    "mlops": (
        "MLOps Case Study",
        """You are a Principal MLOps Engineer specializing in production ML lifecycle management.

Generate a COMPLETE, production-ready MLOPS CASE STUDY for the candidate's project.

Use FIRST PERSON. Write like an engineer who owns the entire ML pipeline.

Structure with these exact sections:

1. PROBLEM & SCOPE — What ML system needed to be operationalized, scale, SLAs
2. ML PIPELINE ARCHITECTURE — Training, validation, serving pipeline design
3. DATA VERSIONING & LINEAGE — DVC, data contracts, feature stores
4. EXPERIMENT TRACKING — MLflow, W&B, Comet — what was tracked and why
5. CI/CD FOR ML — Model testing, integration tests, deployment gates
6. MODEL REGISTRY & VERSIONING — Promotion workflow (dev → staging → prod)
7. SERVING INFRASTRUCTURE — Online vs. batch inference, scaling, caching
8. MONITORING & DRIFT DETECTION — Data drift, concept drift, model degradation
9. RETRAINING STRATEGY — Triggers, pipelines, champion/challenger framework
10. INCIDENT RESPONSE — Rollback procedures, fallback models, alerting
11. RESULTS & IMPACT — Deployment velocity, model freshness, reliability metrics
12. LEARNINGS & FUTURE SCOPE — Platform maturity evolution, open issues

Include specific tools (Kubeflow, Airflow, Seldon, BentoML, Ray Serve, etc.)."""
    ),
    "system_design": (
        "System Design Case Study",
        """You are a Principal Systems Architect specializing in large-scale distributed AI systems.

Generate a COMPLETE, production-ready SYSTEM DESIGN CASE STUDY for the candidate's project.

Use FIRST PERSON. Write like an architect presenting at a design review.

Structure with these exact sections:

1. REQUIREMENTS — Functional requirements, non-functional requirements, SLAs
2. CAPACITY ESTIMATION — Traffic, storage, compute, bandwidth calculations
3. HIGH-LEVEL DESIGN — System components and interactions at a 10,000-foot view
4. DATABASE DESIGN — Schema choices, indexing strategy, SQL vs. NoSQL rationale
5. API DESIGN — REST/gRPC interfaces, rate limiting, authentication
6. CORE AI/ML COMPONENT — Where ML fits, model serving design, batch vs. real-time
7. SCALABILITY DESIGN — Horizontal scaling, sharding, load balancing, CDN
8. CACHING STRATEGY — What to cache, TTLs, cache invalidation, Redis design
9. FAULT TOLERANCE — Replication, circuit breakers, graceful degradation
10. SECURITY DESIGN — AuthN/AuthZ, encryption at rest and in transit, PII handling
11. MONITORING & ALERTING — Metrics, SLOs, dashboards, on-call runbooks
12. RESULTS & IMPACT — Performance benchmarks, uptime achieved, cost efficiency
13. TRADE-OFFS & ALTERNATIVES — What was rejected and why

Be specific with numbers. Include architecture diagrams described in text."""
    ),
    "intro_template": (
        "Introduction Template",
        """You are a senior AI interview coach helping a candidate craft their perfect professional introduction.

Generate a PERSONALIZED INTRODUCTION TEMPLATE for this candidate's project and background.

Use FIRST PERSON throughout. This should sound natural when spoken aloud in an interview.

Structure with these exact sections:

## ✅ 30-Second Elevator Pitch
A crisp spoken introduction (≤ 5 sentences). Includes: who they are, what they built, and the impact.

## ✅ 2-Minute Deep-Dive Introduction
A fuller spoken introduction covering:
- Background and domain expertise
- The specific AI problem they solved
- The architecture and approach they chose (at a high level)
- Key results and business impact
- Why they're excited about this space

## ✅ Talking Points Cheat Sheet
5–7 bullet points the candidate should internalize and be ready to expand on.

## ✅ Follow-up Hooks
3 compelling statements that naturally invite the interviewer to ask follow-up questions.

## ✅ Common Opening Questions & Suggested Answers
- "Tell me about yourself."
- "Walk me through your most impactful AI project."
- "Why are you interested in this role?"

Write conversationally. Avoid buzzword overload. Make it sound like a real person speaking, not a resume read aloud."""
    ),
}


PDF_MAPPING = {
    "agentic": "case_study_agentic_ai.pdf",
    "rag": "case_study_rag.pdf",
    "mlops": "case_study_mlops.pdf"
}

@router.post("/generate-typed")
async def generate_typed_case_study(req: GenerateTypedRequest):
    conn = None
    try:
        case_type = req.case_type.lower().strip()
        if case_type not in TYPED_PROMPTS:
            raise HTTPException(400, detail=f"Unknown case_type '{case_type}'. Must be one of: {list(TYPED_PROMPTS.keys())}")

        topic_name, hardcoded_system_prompt = TYPED_PROMPTS[case_type]

        api_key = get_user_api_key(req.session_id)
        if not api_key:
            raise HTTPException(401, "API key not found. Please complete setup.")

        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT company_name, domain, product, business_problem, key_problems,
                       ai_techniques, agent_usage, role, challenges_learnings, impact,
                       future_roadmap, architecture, tech_stack
                FROM aiprep_tool_project_context WHERE candidate_id = %s
            """, (int(req.session_id),))
            ctx = cursor.fetchone()

        if not ctx:
            raise HTTPException(404, "No project context found. Please complete the project form first.")

        project_context = f"""
Company: {ctx.get('company_name', 'N/A')}
Domain: {ctx.get('domain', 'N/A')}
Product/System: {ctx.get('product', 'N/A')}
Business Problem: {ctx.get('business_problem', 'N/A')}
Key Problems: {ctx.get('key_problems', 'N/A')}
AI/LLM Techniques: {ctx.get('ai_techniques', 'N/A')}
Agent Usage: {ctx.get('agent_usage', 'N/A')}
My Role: {ctx.get('role', 'N/A')}
Challenges: {ctx.get('challenges_learnings', 'N/A')}
Results & Impact: {ctx.get('impact', 'N/A')}
Architecture: {ctx.get('architecture', 'N/A')}
Tech Stack: {ctx.get('tech_stack', 'N/A')}
Future Roadmap: {ctx.get('future_roadmap', 'N/A')}
"""

        # Check if there is a PDF template
        template_filename = PDF_MAPPING.get(case_type)
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

        if raw_template:
            domain_name = ctx.get('domain', 'their industry')
            system_prompt = f"You are a Principal AI Architect and expert technical writer. You are writing an enterprise-grade {topic_name}."
            user_prompt = f"""You will be provided with a candidate's real project context and a reference PDF template.

CRITICAL INSTRUCTIONS:
1. STRUCTURE ONLY: Use the provided PDF template strictly for STRUCTURE, FLOW, FORMATTING STYLE, and SECTION HIERARCHY. Do NOT copy the specific business case, domain, or data from the PDF.
2. DYNAMIC CONTENT: You must generate an entirely NEW business case based EXCLUSIVELY on the candidate's actual Domain, Company, Product, and Technologies provided in the Project Context.
3. DOMAIN ADAPTATION: If the candidate's domain is {domain_name}, generate problems, KPIs, and workflows specifically tailored to that industry. Tailor the entire narrative to the candidate's specific industry context.
4. FIRST PERSON PERSPECTIVE: You MUST write the entire case study from the perspective of the candidate using first-person pronouns ("I", "my", "we"). DO NOT say "The candidate built...", say "I built...".
5. QUALITY: Make it feel realistic, technically deep, and interview-ready. Include architecture scenarios, constraints, real-world metrics, challenges, and scalable designs.

--- CANDIDATE PROJECT CONTEXT ---
{project_context}

--- REFERENCE TEMPLATE (USE FOR STRUCTURE/FLOW ONLY) ---
{raw_template}

Now, generate the complete {topic_name} for the candidate. Adapt the business case to match their domain and technologies exactly. Output in rich, formatted Markdown.
"""
        else:
            system_prompt = hardcoded_system_prompt
            user_prompt = f"""Project Context (use this as the foundation for the entire case study):

{project_context}

Now generate the complete case study following the structure defined in your instructions. Be specific, technical, and use real numbers where provided. Output in rich, formatted Markdown."""

        res_str = await call_llm_with_context(
            user_id=req.session_id,
            prompt=user_prompt,
            system_prompt=system_prompt,
            api_key=api_key,
            response_format="text"
        )

        # Save to documents
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO aiprep_tool_case_studies (candidate_id, content, topic)
                VALUES (%s, %s, %s)
            """, (int(req.session_id), res_str, topic_name))
        conn.commit()

        with conn.cursor() as cursor:
            cursor.execute("SELECT LAST_INSERT_ID() as id")
            new_id = cursor.fetchone()["id"]

        return {"content": res_str, "topic": topic_name, "id": new_id}

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        err = str(e)
        if "insufficient_quota" in err or "429" in err:
            raise HTTPException(429, "API quota exceeded.")
        if "AuthenticationError" in err or "401" in err:
            raise HTTPException(401, "Invalid API key.")
        raise HTTPException(500, detail=f"Generation failed: {err}")
    finally:
        if conn:
            conn.close()



# Only these 6 topics are valid user-generated typed case studies.
# All other rows (old auto-generated, resume-based, etc.) are ignored.
VALID_TYPED_TOPICS = (
    "Agentic AI Case Study",
    "RAG Case Study",
    "Fine-tuning Case Study",
    "MLOps Case Study",
    "System Design Case Study",
    "Introduction Template",
)

@router.get("/history")
def get_case_study_history(session_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Use IN filter to return ONLY typed case studies the user explicitly generated
            placeholders = ", ".join(["%s"] * len(VALID_TYPED_TOPICS))
            cursor.execute(f"""
                SELECT id, topic, content, created_at
                FROM aiprep_tool_case_studies
                WHERE candidate_id = %s
                  AND topic IN ({placeholders})
                ORDER BY created_at DESC
            """, (int(session_id), *VALID_TYPED_TOPICS))
            rows = cursor.fetchall()

        docs = []
        for row in rows:
            docs.append({
                "id": row["id"],
                "topic": row["topic"],
                "content": row["content"],
                "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
            })
        return {"case_studies": docs}

    except Exception as e:
        raise HTTPException(500, detail=str(e))
    finally:
        if conn:
            conn.close()

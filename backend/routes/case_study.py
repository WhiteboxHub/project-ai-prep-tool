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


@router.post("/generate-typed")
def generate_typed_case_study(req: GenerateTypedRequest):
    conn = None
    try:
        case_type = req.case_type.lower().strip()
        if case_type not in TYPED_PROMPTS:
            raise HTTPException(400, detail=f"Unknown case_type '{case_type}'. Must be one of: {list(TYPED_PROMPTS.keys())}")

        topic_name, system_prompt = TYPED_PROMPTS[case_type]

        api_key = get_user_api_key(req.session_id)
        if not api_key:
            raise HTTPException(401, "API key not found. Please complete setup.")

        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT company_name, domain, product, business_problem, key_problems,
                       ai_techniques, agent_usage, role, challenges_learnings, impact,
                       future_roadmap, architecture, tech_stack
                FROM aiprep_tool_project_context WHERE user_id = %s
            """, (req.session_id,))
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

        user_prompt = f"""Project Context (use this as the foundation for the entire case study):

{project_context}

Now generate the complete case study following the structure above. Be specific, technical, and use real numbers where provided."""

        res_str = call_llm_with_context(
            user_id=req.session_id,
            prompt=user_prompt,
            system_prompt=system_prompt,
            api_key=api_key,
            response_format="text"
        )

        # Save to documents
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO aiprep_tool_case_studies (user_id, content, topic)
                VALUES (%s, %s, %s)
            """, (req.session_id, res_str, topic_name))
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
                WHERE user_id = %s
                  AND topic IN ({placeholders})
                ORDER BY created_at DESC
            """, (session_id, *VALID_TYPED_TOPICS))
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

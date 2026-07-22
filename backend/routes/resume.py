import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.connection import get_db_connection
from services.llm_service import call_llm_with_context
from services.user_context import get_user_api_key
from services.resume_source import fetch_resume_raw

router = APIRouter(prefix="/api/resume", tags=["resume"])

class ExtractRequest(BaseModel):
    session_id: str

@router.post("/extract-project")
async def extract_project(req: ExtractRequest):
    """
    Extracts Domain, Background, Skills, and Core Project details from the uploaded resume.
    """
    conn = None
    try:
        conn = get_db_connection()
        raw = fetch_resume_raw(req.session_id)
        if not raw:
            raise HTTPException(404, "Resume not found. Please upload a resume in the Setup step.")
        resume_data = raw

        # Check if already extracted
        with conn.cursor() as cursor:
            marketing_id = int(req.session_id)
            cursor.execute("SELECT candidate_id FROM candidate_marketing WHERE id = %s", (marketing_id,))
            cm_row = cursor.fetchone()
            real_candidate_id = cm_row["candidate_id"] if cm_row else marketing_id

            cursor.execute("SELECT company_name, domain, background, skills, product, architecture, business_value, role, impact, business_problem, key_problems, tech_stack, ai_techniques, challenges_learnings, future_roadmap, agent_usage FROM aiprep_tool_project_context WHERE candidate_id = %s", (real_candidate_id,))
            existing = cursor.fetchone()
            
            invalid_domains = ["genai", "rag", "llm", "ai", "machine learning", "langchain", "platform", "system", "enterprise"]
            is_invalid_domain = any(term in existing.get("domain", "").lower() for term in invalid_domains) if existing else False
            
            if existing and existing.get("company_name") and existing.get("domain") and existing.get("product") and not is_invalid_domain:
                try:
                    skills_list = json.loads(existing["skills"]) if existing.get("skills") else []
                except:
                    skills_list = []
                return {
                    "company_name": existing.get("company_name", ""),
                    "domain": existing["domain"],
                    "background": existing["background"],
                    "skills": skills_list,
                    "core_project": {
                        "product": existing["product"],
                        "business_problem": existing.get("business_problem", existing.get("business_value", "")),
                        "key_problems": existing.get("key_problems", ""),
                        "tech_stack": existing.get("tech_stack", existing.get("ai_techniques", "")),
                        "architecture": existing["architecture"],
                        "business_value": existing["business_value"],
                        "role": existing["role"],
                        "challenges_learnings": existing.get("challenges_learnings", ""),
                        "impact": existing["impact"]
                    }
                }

        api_key = get_user_api_key(req.session_id)
        if not api_key:
            raise HTTPException(401, "API key not found")

        resume_str_for_prompt = json.dumps(resume_data) if isinstance(resume_data, dict) else str(resume_data)

        # Call LLM to extract data
        prompt = f"""
        Analyze the candidate's resume and dynamically generate a comprehensive, enterprise-grade project explanation for their most recent and significant AI/ML or engineering project.
        Do NOT hardcode fixed examples or invent fake projects. The content MUST reflect the actual resume data, technologies, role, and accomplishments.
        
        Resume Text:
        {resume_str_for_prompt}
        
        You MUST return valid JSON matching this exact structure:
        {{
            "company_name": "string (Company or Organization name from resume)",
            "domain": "string (The REAL business domain or industry vertical of the company/project, e.g. Healthcare, Banking, Financial Services, Insurance, Retail, Telecommunications, Logistics, E-commerce, Enterprise Solutions. IMPORTANT: DO NOT use technical terms or architectures like 'GenAI Systems', 'RAG', 'AI Platform', 'LLM', or 'Machine Learning' as the domain. Examples: Gainwell Technologies -> Healthcare, UnitedHealth -> Healthcare, JPMorgan -> Banking / Financial Services, Walmart -> Retail, Verizon -> Telecommunications, FedEx -> Logistics)",
            "skills": ["skill1", "skill2"],
            "core_project": {{
                "product": "string (Rich, detailed, professional description of the enterprise AI system/product built, e.g. 'Built an enterprise-grade AI platform with multi-agent architecture, Retrieval-Augmented Generation (RAG), intelligent document processing, semantic search...')",
                "business_problem": "string (Detailed narrative of the real business challenges and operational bottlenecks solved by the project, e.g. 'Organizations faced challenges in retrieving accurate information from large volumes of structured and unstructured enterprise data. The system improved knowledge discovery...')",
                "key_problems": "string (Bulleted list of Business Metrics & KPIs, e.g. '- Improved response accuracy and retrieval relevance\\n- Reduced manual support effort and operational overhead\\n- Increased query response speed')",
                "tech_stack": "string (Comprehensive comma-separated list of relevant technologies, frameworks, vector databases, cloud services, and orchestration tools extracted from the resume, e.g. 'Python, LangChain, LangGraph, AWS Lambda, AWS S3, PyTorch, Pinecone')",
                "role": "string (Detailed professional description of the candidate's role and key engineering responsibilities on the project, e.g. 'Worked as an AIML Engineer responsible for designing scalable AI architectures, developing RAG pipelines, implementing multi-agent workflows...')",
                "challenges_learnings": "string (Bulleted list of realistic enterprise-scale technical and operational challenges faced and overcome, e.g. '- Handling large-scale unstructured enterprise data\\n- Maintaining contextual memory across multi-turn conversations')",
                "impact": "string (Bulleted list of quantifiable results, business outcomes, and production impact, e.g. '- Successfully deployed scalable enterprise AI solutions\\n- Improved knowledge retrieval and response quality\\n- Reduced processing time')",
                "deployment": "string (Detailed narrative of the deployment environment, cloud infrastructure, containerization, orchestration, e.g. 'Deployed on AWS cloud infrastructure using containerized microservices with Kubernetes orchestration, scalable APIs, and vector databases')",
                "architecture": "string (Comprehensive overview of the high-level system architecture, data ingestion pipelines, vector search, LLM orchestration, and cloud infrastructure, e.g. 'The architecture consisted of data ingestion pipelines, document preprocessing, embedding generation, vector storage, hybrid retrieval mechanisms, multi-agent orchestration...')",
                "agent_usage": "string (One of 'Agent', 'Hybrid', or 'None' based on whether agents or multi-agent architectures were used in the project)"
            }}
        }}
        """
        
        system_prompt = "You are an expert technical recruiter analyzing aiprep_tool_resumes."
        
        res_str = await call_llm_with_context(
            user_id=req.session_id,
            prompt=prompt,
            system_prompt=system_prompt,
            api_key=api_key,
            response_format="json_object"
        )
        
        # Parse output
        from services.evaluator import safe_parse_json
        extracted = safe_parse_json(res_str)
        if "error" in extracted:
            raise Exception("Failed to extract data: " + extracted.get("error", ""))
            
        # Store extracted project in aiprep_tool_project_context so it can be evaluated/generated later
        with conn.cursor() as cursor:
            marketing_id = int(req.session_id)
            cursor.execute("SELECT candidate_id FROM candidate_marketing WHERE id = %s", (marketing_id,))
            cm_row = cursor.fetchone()
            real_candidate_id = cm_row["candidate_id"] if cm_row else marketing_id

            proj = extracted.get("core_project", {})
            skills_dump = json.dumps(extracted.get("skills", []))
            cursor.execute("""
                INSERT INTO aiprep_tool_project_context (
                    candidate_id, product, architecture, business_value, role, impact, 
                    company_name, domain, business_problem, key_problems, tech_stack, ai_techniques, challenges_learnings, skills, future_roadmap, agent_usage
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                    product = VALUES(product),
                    architecture = VALUES(architecture),
                    business_value = VALUES(business_value),
                    role = VALUES(role),
                    impact = VALUES(impact),
                    company_name = VALUES(company_name),
                    domain = VALUES(domain),
                    business_problem = VALUES(business_problem),
                    key_problems = VALUES(key_problems),
                    tech_stack = VALUES(tech_stack),
                    ai_techniques = VALUES(ai_techniques),
                    challenges_learnings = VALUES(challenges_learnings),
                    skills = VALUES(skills),
                    future_roadmap = VALUES(future_roadmap),
                    agent_usage = VALUES(agent_usage)
            """, (
                real_candidate_id,
                proj.get("product", ""),
                proj.get("architecture", proj.get("tech_stack", "")),
                proj.get("business_problem", ""),
                proj.get("role", ""),
                proj.get("impact", ""),
                extracted.get("company_name", ""),
                extracted.get("domain", ""),
                proj.get("business_problem", ""),
                proj.get("key_problems", ""),
                proj.get("tech_stack", ""),
                proj.get("tech_stack", ""),
                proj.get("challenges_learnings", ""),
                skills_dump,
                proj.get("deployment", ""),
                proj.get("agent_usage", "Agent")
            ))
        conn.commit()

        return {
            "company_name": extracted.get("company_name", ""),
            "domain": extracted.get("domain", ""),
            "background": extracted.get("background", ""),
            "skills": extracted.get("skills", []),
            "core_project": {
                "product": proj.get("product", ""),
                "business_problem": proj.get("business_problem", ""),
                "key_problems": proj.get("key_problems", ""),
                "tech_stack": proj.get("tech_stack", ""),
                "architecture": proj.get("architecture", proj.get("tech_stack", "")),
                "business_value": proj.get("business_value", proj.get("business_problem", "")),
                "role": proj.get("role", ""),
                "challenges_learnings": proj.get("challenges_learnings", ""),
                "impact": proj.get("impact", ""),
                "deployment": proj.get("deployment", ""),
                "agent_usage": proj.get("agent_usage", "Agent")
            }
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        err_msg = repr(e)
        print("Extraction Error:", err_msg)
        if isinstance(e, HTTPException): raise e
        
        # Check for common OpenAI errors
        if "insufficient_quota" in err_msg or "429" in err_msg or "quota" in err_msg.lower():
            raise HTTPException(429, detail="AI Provider Error: Your API Key has insufficient quota or is out of credits.")
        if "AuthenticationError" in err_msg or "invalid api key" in err_msg.lower() or "401" in err_msg:
            raise HTTPException(401, detail="AI Provider Error: Your API Key is invalid.")
            
        raise HTTPException(500, detail=f"Failed to extract data from resume. Reason: {err_msg}")
    finally:
        if conn:
            conn.close()

@router.get("/latest-project")
def get_latest_project(session_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            marketing_id = int(session_id)
            cursor.execute("SELECT candidate_id FROM candidate_marketing WHERE id = %s", (marketing_id,))
            cm_row = cursor.fetchone()
            real_candidate_id = cm_row["candidate_id"] if cm_row else marketing_id

            cursor.execute("""
                SELECT 
                    company_name, domain, product, business_problem, previous_system,
                    key_problems, ai_techniques, agent_usage, impact, evaluation_approach,
                    challenges_learnings, learnings, future_roadmap, background, skills, architecture, role, business_value, tech_stack
                FROM aiprep_tool_project_context WHERE candidate_id = %s
            """, (real_candidate_id,))
            res = cursor.fetchone()
            if res:
                if res.get("skills"):
                    try:
                        res["skills"] = json.loads(res["skills"])
                    except:
                        pass
                return res
                
            # Fallback to basic JSON extraction if LLM is still pending
            resume_data = fetch_resume_raw(session_id)
            if resume_data:
                if isinstance(resume_data, str):
                    try: resume_data = json.loads(resume_data)
                    except: resume_data = {}
                    
                basic_res = {"company_name": "", "background": "", "skills": []}
                
                exp = resume_data.get("Work Experience") or resume_data.get("experience") or resume_data.get("Experience") or resume_data.get("work") or []
                if exp and isinstance(exp, list) and len(exp) > 0:
                    basic_res["company_name"] = exp[0].get("company", "") or exp[0].get("company_name", "") or exp[0].get("name", "")
                    
                skills = resume_data.get("Skills") or resume_data.get("skills")
                if isinstance(skills, list):
                    basic_res["skills"] = skills
                elif isinstance(skills, dict):
                    for v in skills.values():
                        if isinstance(v, list): basic_res["skills"].extend(v)
                elif isinstance(skills, str):
                    basic_res["skills"] = [s.strip() for s in skills.split(",")]
                    
                return basic_res
                
        return {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

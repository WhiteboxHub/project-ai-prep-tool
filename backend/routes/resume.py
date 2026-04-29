import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.connection import get_db_connection
from services.llm_service import call_llm_with_context
from services.user_context import get_user_api_key

router = APIRouter(prefix="/api/resume", tags=["resume"])

class ExtractRequest(BaseModel):
    session_id: str

@router.post("/extract-project")
def extract_project(req: ExtractRequest):
    """
    Extracts Domain, Background, Skills, and Core Project details from the uploaded resume.
    """
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT resume_json FROM resumes WHERE user_id = %s", (req.session_id,))
            res = cursor.fetchone()
            if not res or not res['resume_json']:
                raise HTTPException(404, "Resume not found. Please upload a resume in the Setup step.")
            resume_data = res['resume_json']

        api_key = get_user_api_key(req.session_id)
        if not api_key:
            raise HTTPException(401, "API key not found")

        # Call LLM to extract data
        prompt = f"""
        Extract the candidate's Domain, Background, Skills, and identify their most prominent "Core Project" from the provided resume JSON.
        
        Resume JSON:
        {resume_data}
        
        You MUST return valid JSON matching this exact structure:
        {{
            "domain": "string (e.g. Software Engineering, Data Science)",
            "background": "string (1-2 sentences summarizing their experience)",
            "skills": ["skill1", "skill2", "skill3"],
            "core_project": {{
                "product": "Name or type of product/project",
                "architecture": "Tech stack and architecture used",
                "business_value": "Why it was built / business goal",
                "role": "Candidate's role",
                "impact": "Measurable results or outcome"
            }}
        }}
        """
        
        system_prompt = "You are an expert technical recruiter analyzing resumes."
        
        res_str = call_llm_with_context(
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
            
        # Store extracted project in project_context so it can be evaluated/generated later
        with conn.cursor() as cursor:
            proj = extracted.get("core_project", {})
            cursor.execute("""
                INSERT INTO project_context (user_id, product, architecture, business_value, role, impact)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                    product = VALUES(product),
                    architecture = VALUES(architecture),
                    business_value = VALUES(business_value),
                    role = VALUES(role),
                    impact = VALUES(impact)
            """, (
                req.session_id,
                proj.get("product", ""),
                proj.get("architecture", ""),
                proj.get("business_value", ""),
                proj.get("role", ""),
                proj.get("impact", "")
            ))
        conn.commit()

        return extracted

    except Exception as e:
        err_msg = str(e)
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
            cursor.execute("SELECT product, architecture, business_value, role, impact FROM project_context WHERE user_id = %s", (session_id,))
            res = cursor.fetchone()
            if res:
                return res
        return {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

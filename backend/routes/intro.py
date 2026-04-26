# # backend\routes\intro.py
# import os
# import json
# import uuid
# from fastapi import APIRouter, HTTPException, UploadFile, File, Form
# from db.connection import get_db_connection
# from services.speech_service import transcribe_audio
# from services.evaluator import evaluate_intro

# router = APIRouter(prefix="/api/intro", tags=["intro"])

# @router.post("/evaluate")
# async def evaluate_audio_intro(
#     session_id: str = Form(...),
#     audio: UploadFile = File(...),
#     api_key: str = Form(None)
# ):
#     conn = None
#     try:
#         # Save temp file
#         os.makedirs("uploads", exist_ok=True)
#         file_path = f"uploads/{uuid.uuid4()}_{audio.filename}"
#         with open(file_path, "wb") as f:
#             f.write(await audio.read())
            
#         # 1. Transcribe
#         transcript = transcribe_audio(file_path)
        
#         # 2. Evaluate
#         conn = get_db_connection()
#         ideal_intro = "A professional overview covering name, background, and alignment with the requested role."
#         with conn.cursor() as cursor:
#             # try to fetch generated template if we added it to resumes or project (simplification here)
#             pass
            
#         eval_result = evaluate_intro(session_id, transcript, ideal_intro, api_key=api_key)
        
#         # 3. Store in DB
#         score = int(eval_result.get("overall_score", 0))
#         if score <= 10: # normalize to 100 if it was /10
#             score *= 10
            
#         is_passed = eval_result.get("passed", score >= 70)
        
#         with conn.cursor() as cursor:
#             cursor.execute("""
#                 INSERT INTO evaluations (user_id, type, score, passed, feedback, raw_response)
#                 VALUES (%s, %s, %s, %s, %s, %s)
#             """, (
#                 session_id, 
#                 "intro", 
#                 score, 
#                 is_passed, 
#                 json.dumps(eval_result.get("feedback", [])), 
#                 json.dumps(eval_result)
#             ))
            
#             # Upsert attempt
#             cursor.execute("SELECT attempt_count FROM attempts WHERE user_id = %s AND attempt_type = 'intro'", (session_id,))
#             attn = cursor.fetchone()
#             if attn:
#                 cursor.execute("UPDATE attempts SET attempt_count = attempt_count + 1 WHERE user_id = %s AND attempt_type = 'intro'", (session_id,))
#             else:
#                 cursor.execute("INSERT INTO attempts (user_id, attempt_type, attempt_count) VALUES (%s, %s, %s)", (session_id, 'intro', 1))

#             conn.commit()
        
#         # Clean up
#         if os.path.exists(file_path):
#             os.remove(file_path)
            
#         return {
#             "transcript": transcript,
#             "evaluation": eval_result,
#             "status": "PASS" if is_passed else "RETRY",
#             "score": score
#         }

#     except Exception as e:
#         print("Intro Error:", str(e))
#         raise HTTPException(status_code=500, detail=str(e))
#     finally:
#         if conn:
#             conn.close()

# from pydantic import BaseModel
# class IntroTextRequest(BaseModel):
#     session_id: str
#     intro_text: str
#     api_key: str = None

# @router.post("/evaluate-text")
# def evaluate_text_intro(data: IntroTextRequest):
#     conn = None
#     try:
#         # 1. Evaluate directly
#         conn = get_db_connection()
#         ideal_intro = "A professional overview covering name, background, and alignment with the requested role."
            
#         eval_result = evaluate_intro(data.session_id, data.intro_text, ideal_intro, api_key=data.api_key)
        
#         # 2. Store in DB
#         score = int(eval_result.get("overall_score", 0))
#         if score <= 10: 
#             score *= 10
            
#         is_passed = eval_result.get("passed", score >= 70)
        
#         with conn.cursor() as cursor:
#             cursor.execute("""
#                 INSERT INTO evaluations (user_id, type, score, passed, feedback, raw_response)
#                 VALUES (%s, %s, %s, %s, %s, %s)
#             """, (
#                 data.session_id, 
#                 "intro", 
#                 score, 
#                 is_passed, 
#                 json.dumps(eval_result.get("feedback", [])), 
#                 json.dumps(eval_result)
#             ))
            
#             # Upsert attempt
#             cursor.execute("SELECT attempt_count FROM attempts WHERE user_id = %s AND attempt_type = 'intro'", (data.session_id,))
#             attn = cursor.fetchone()
#             if attn:
#                 cursor.execute("UPDATE attempts SET attempt_count = attempt_count + 1 WHERE user_id = %s AND attempt_type = 'intro'", (data.session_id,))
#             else:
#                 cursor.execute("INSERT INTO attempts (user_id, attempt_type, attempt_count) VALUES (%s, %s, %s)", (data.session_id, 'intro', 1))

#             conn.commit()
            
#         return {
#             "transcript": data.intro_text,
#             "evaluation": eval_result,
#             "status": "PASS" if is_passed else "RETRY",
#             "score": score
#         }

#     except Exception as e:
#         print("Intro Text Error:", str(e))
#         raise HTTPException(status_code=500, detail=str(e))
#     finally:
#         if conn:
#             conn.close()

# @router.get("/history")
# def get_intro_history(session_id: str):
#     """
#     Check if the user has completed the intro for the dashboard progression.
#     """
#     conn = None
#     try:
#         conn = get_db_connection()
#         with conn.cursor() as cursor:
#             cursor.execute("SELECT score FROM evaluations WHERE user_id = %s AND type = 'intro' ORDER BY id DESC", (session_id,))
#             res = cursor.fetchall()
#             attempts = [{"score": row['score']} for row in res]
#             return {"attempts": attempts}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
#     finally:
#         if conn:
#             conn.close()

# @router.get("/dynamic-template")
# def get_dynamic_intro_template(session_id: str, api_key: str = None):
#     """
#     Generate a dynamic intro template based on resuming and project info.
#     """
#     from services.llm_service import call_llm_with_context
#     try:
#         template = call_llm_with_context(
#             user_id=session_id,
#             prompt="Generate a customized self-introduction template for this candidate based on their resume and project. Make it exactly 3 paragraphs. Use placeholders like [Name] but try to fill in actual data where you know it. \n\nCRITICAL OUTPUT RULE: Output ONLY the raw script text. Do not output conversational filler like 'Here is the script:' or 'Certainly'. Start directly with the script.",
#             system_prompt="You are an expert career coach helping a candidate prep. Keep it professional and simple.",
#             api_key=api_key,
#             response_format="text"
#         )
#         return {"template": template}
#     except Exception as e:
#         return {"template": "Failed to fetch generated intro template. Please try refreshing."}



import os
import json
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from db.connection import get_db_connection
from services.speech_service import transcribe_audio
from services.evaluator import evaluate_intro
from services.user_context import get_user_api_key
from services.llm_service import call_llm_with_context

router = APIRouter(prefix="/api/intro", tags=["intro"])


# -----------------------------------
# 🎤 AUDIO INTRO EVALUATION
# -----------------------------------
@router.post("/evaluate")
async def evaluate_audio_intro(
    session_id: str = Form(...),
    audio: UploadFile = File(...),
    vision_metrics: str = Form(None)
):
    conn = None
    file_path = None

    try:
        api_key = get_user_api_key(session_id)
        if not api_key:
            raise Exception("User not initialized")

        os.makedirs("/tmp/uploads", exist_ok=True)
        file_path = f"/tmp/uploads/{uuid.uuid4()}_{audio.filename}"

        with open(file_path, "wb") as f:
            f.write(await audio.read())

        transcript = transcribe_audio(file_path, api_key=api_key)

        eval_result = evaluate_intro(
            user_id=session_id,
            transcript=transcript,
            ideal_intro="Professional introduction",
            api_key=api_key
        )

        if vision_metrics:
            try:
                vm = json.loads(vision_metrics)
                if "scores" not in eval_result:
                    eval_result["scores"] = {}
                eval_result["scores"]["Eye Contact (Phase 3)"] = vm.get("eye_contact_score", 0) / 10
                eval_result["scores"]["Head Stability (Phase 3)"] = vm.get("head_movement_stability", 0) / 10
            except:
                pass

        conn = get_db_connection()

        raw_score = eval_result.get("overall_score", 0)
        try:
            score = float(raw_score)
        except (ValueError, TypeError):
            score = 0.0

        if score and score <= 10:
            db_score = int(score * 10)
        else:
            db_score = int(score)

        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO evaluations (user_id, type, score, feedback)
                VALUES (%s, %s, %s, %s)
            """, (
                session_id,
                "intro",
                db_score,
                json.dumps(eval_result)
            ))

        conn.commit()

        return {
            "transcript": transcript,
            "evaluation": eval_result,
            "score": db_score
        }

    except Exception as e:
        print("Intro Error:", str(e))
        raise HTTPException(status_code=500, detail="Evaluation failed")

    finally:
        if conn:
            conn.close()
        if file_path and os.path.exists(file_path):
            os.remove(file_path)


# -----------------------------------
# ✍️ TEXT INTRO EVALUATION
# -----------------------------------
@router.post("/evaluate-text")
def evaluate_text_intro(data: dict):
    try:
        session_id = data.get("session_id")
        intro_text = data.get("intro_text")

        api_key = get_user_api_key(session_id)
        if not api_key:
            raise Exception("User not initialized")

        eval_result = evaluate_intro(
            user_id=session_id,
            transcript=intro_text,
            api_key=api_key
        )

        raw_score = eval_result.get("overall_score", 0)
        try:
            score = float(raw_score)
        except (ValueError, TypeError):
            score = 0.0

        if score and score <= 10:
            db_score = int(score * 10)
        else:
            db_score = int(score)

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO evaluations (user_id, type, score, feedback)
                    VALUES (%s, %s, %s, %s)
                """, (
                    session_id,
                    "intro",
                    db_score,
                    json.dumps(eval_result)
                ))
            conn.commit()
        finally:
            conn.close()

        return {
            "evaluation": eval_result,
            "score": db_score
        }

    except Exception as e:
        print("Text Intro Error:", str(e))
        raise HTTPException(status_code=500, detail="Evaluation failed")


# -----------------------------------
# 🧠 DYNAMIC TEMPLATE (FIXED)
# -----------------------------------
# @router.get("/dynamic-template")
# def get_dynamic_intro_template(session_id: str):
#     try:
#         api_key = get_user_api_key(session_id)
#         if not api_key:
#             raise Exception("API key not found")

#         # Get project context (optional personalization)
#         conn = get_db_connection()
#         project_context = ""

#         try:
#             with conn.cursor() as cursor:
#                 cursor.execute(
#                     "SELECT product, role FROM project_context WHERE user_id = %s",
#                     (session_id,)
#                 )
#                 res = cursor.fetchone()
#                 if res:
#                     project_context = f"Product: {res.get('product')}, Role: {res.get('role')}"
#         finally:
#             conn.close()

#         system_prompt = """
# You are an interview coach.

# Generate a clear, professional self-introduction (5–6 lines).
# Make it structured, natural, and easy to speak.
# Avoid fluff.
# Return plain text only.
# """

#         prompt = f"""
# Create a personalized introduction.

# Context:
# {project_context}
# """

#         response = call_llm_with_context(
#             user_id=session_id,
#             prompt=prompt,
#             system_prompt=system_prompt,
#             api_key=api_key,
#             response_format="text"
#         )

#         return {
#             "template": response
#         }

#     except Exception as e:
#         print("Dynamic Template Error:", str(e))
#         raise HTTPException(status_code=500, detail="Template generation failed")

@router.get("/dynamic-template")
def get_dynamic_intro_template(session_id: str):
    try:
        api_key = get_user_api_key(session_id)
        if not api_key:
            raise Exception("API key not found")

        conn = get_db_connection()

        context_data = ""
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT product, architecture, business_value, role, impact
                    FROM project_context
                    WHERE user_id = %s
                """, (session_id,))
                res = cursor.fetchone()

                if res:
                    context_data = f"""
Product: {res.get('product')}
Architecture: {res.get('architecture')}
Business Value: {res.get('business_value')}
Role: {res.get('role')}
Impact: {res.get('impact')}
"""
        finally:
            conn.close()

        # ✅ Load template
        template_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "templates",
            "intro_template.txt"
        )

        with open(template_path, "r", encoding="utf-8") as f:
            raw_template = f.read()

        # 🔥 UPDATED SYSTEM PROMPT (NO MARKDOWN, CLEAN FORMAT)
        system_prompt = """
You are a senior AI interview coach.

Generate a detailed, structured introduction EXACTLY like a real engineer explains in interviews.

FORMAT REQUIREMENTS:

1. Plain text only (NO markdown, NO **, NO symbols)
2. Use clean paragraphs
3. Use bullet points with "•" symbol only
4. Use section headings like:
   - Current Project
   - Phase One – System
   - Phase Two – System
   - Previous Experience

STRUCTURE:

Start with:
Hi, I am <name>.

Then:
- Career journey (short)
- Current focus

Then:

Current Project
<Explain clearly>

Then:

Phase One – System
• Explain ingestion pipeline
• Explain retrieval system
• Explain tools used
• Explain architecture
• Explain deployment
• Explain evaluation
• Explain optimization

Then (if possible):

Phase Two – System
• Agents
• Memory
• Routing
• Tools

Then:

Previous Experience
• MLOps
• Infra
• Cloud
• Monitoring

RULES:
- MUST be detailed (not short)
- MUST use user's project data
- MUST expand architecture into explanation
- DO NOT summarize too much
- DO NOT use generic lines
- DO NOT use markdown (** etc)
- DO NOT hallucinate tools not present in input

Make it 2–3 minute speaking length.

Return clean text.
"""

        # 🔥 PROMPT
        prompt = f"""
USER PROJECT DATA:
{context_data}

REFERENCE TEMPLATE:
{raw_template}

INSTRUCTIONS:
- Convert project data into structured explanation
- Expand architecture into technical story
- Use template only as guidance, not output

Generate the introduction.
"""

        intro_text = call_llm_with_context(
            user_id=session_id,
            prompt=prompt,
            system_prompt=system_prompt,
            api_key=api_key,
            response_format="text"
        )

        return {
            "template": intro_text
        }

    except Exception as e:
        print("Dynamic Template Error:", str(e))
        raise HTTPException(status_code=500, detail="Template generation failed")

# -----------------------------------
# 📜 HISTORY (FIXED)
# -----------------------------------
@router.get("/history")
def get_intro_history(session_id: str):
    conn = None
    try:
        conn = get_db_connection()

        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, score, feedback, created_at
                FROM evaluations
                WHERE user_id = %s AND type = 'intro'
                ORDER BY created_at DESC
                LIMIT 5
            """, (session_id,))

            rows = cursor.fetchall()

        return {
            "history": rows or []
        }

    except Exception as e:
        print("History Error:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch history")

    finally:
        if conn:
            conn.close()
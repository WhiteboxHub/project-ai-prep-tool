
import os
import json
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from db.connection import get_db_connection
from services.speech_service import transcribe_audio
from services.evaluator import evaluate_intro, evaluate_intro_jd
from services.user_context import get_user_api_key
from services.llm_service import call_llm_with_context
from services.resume_source import fetch_resume_dict

router = APIRouter(prefix="/api/intro", tags=["intro"])
INTRO_PASS_SCORE = 75


def _json_or_empty(value):
    if not value:
        return {}
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return {}


def _normalize_score(eval_result: dict) -> int:
    raw_score = eval_result.get("overall_score", 0)
    try:
        score = float(raw_score)
    except (ValueError, TypeError):
        score = 0.0
    return max(0, min(100, int(score)))


def _feedback_payload(eval_result: dict) -> dict:
    feedback = eval_result.get("feedback", {})
    if not isinstance(feedback, dict):
        feedback = {"feedback": feedback}

    return {
        **feedback,
        "strengths": feedback.get("strengths", eval_result.get("strengths", [])),
        "weaknesses": feedback.get("weaknesses", eval_result.get("weaknesses", [])),
        "improvement_areas": feedback.get("improvement_areas", eval_result.get("improvement_areas", [])),
        "ai_suggestions": feedback.get("ai_suggestions", eval_result.get("ai_suggestions", [])),
        "score_reasons": feedback.get("score_reasons", eval_result.get("score_reasons", {})),
        "vision_feedback": feedback.get("vision_feedback", eval_result.get("vision_feedback", {})),
    }


def _serialize_intro_row(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "user_id": row.get("user_id"),
        "type": row.get("type"),
        "score": row.get("score"),
        "passed": bool(row.get("passed")),
        "feedback": _json_or_empty(row.get("feedback")),
        "raw_response": _json_or_empty(row.get("raw_response")),
        "created_at": row.get("created_at"),
        "video_url": row.get("video_url"),
    }




# -----------------------------------
# 🎤 AUDIO INTRO EVALUATION
# -----------------------------------
@router.post("/evaluate")
async def evaluate_audio_intro(
    session_id: str = Form(...),
    audio: UploadFile = File(...),
    vision_metrics: str = Form(None),
    intro_type: str = Form("general"),
    job_description: str = Form(""),
    recording_id: str = Form(None),
    interview_mode: str = Form("video")
):
    conn = None
    file_path = None

    try:
        api_key = get_user_api_key(session_id)
        if not api_key:
            raise Exception("User not initialized")

        os.makedirs("uploads", exist_ok=True)
        filename = f"{uuid.uuid4()}_{audio.filename}"
        if not filename.endswith(".webm") and not filename.endswith(".mp4"):
            filename += ".webm"
        file_path = f"uploads/{filename}"
        video_url = f"local:{recording_id}" if recording_id else ""

        with open(file_path, "wb") as f:
            f.write(await audio.read())

        try:
            transcript_data = transcribe_audio(file_path, api_key=api_key)
            raw_text = transcript_data["raw_text"]
            corrected_text = transcript_data["corrected_text"]
        finally:
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as ex:
                    print("Warning: Failed to clean up temp upload file:", ex)
        
        resume_data = fetch_resume_dict(session_id)

        parsed_vision_metrics = None
        if vision_metrics:
            try:
                parsed_vision_metrics = json.loads(vision_metrics)
            except Exception:
                parsed_vision_metrics = None

        if intro_type == "jd-specific":
            eval_result = await evaluate_intro_jd(
                user_id=session_id,
                transcript_raw=raw_text,
                transcript_corrected=corrected_text,
                resume_data=resume_data,
                job_description=job_description,
                api_key=api_key,
                vision_metrics=parsed_vision_metrics
            )
        else:
            eval_result = await evaluate_intro(
                user_id=session_id,
                transcript_raw=raw_text,
                transcript_corrected=corrected_text,
                resume_data=resume_data,
                api_key=api_key,
                vision_metrics=parsed_vision_metrics
            )

        if parsed_vision_metrics:
            raw_payload = eval_result.get("raw_response")
            if not isinstance(raw_payload, dict):
                raw_payload = dict(eval_result)
            raw_payload["visionAnalytics"] = parsed_vision_metrics.get("visionAnalytics", {})
            eval_result["raw_response"] = raw_payload

        conn = get_db_connection()

        # The LLM now returns the exact db-friendly format for both general and jd-specific intros
        raw_score = eval_result.get("score", eval_result.get("overall_score", 0))
        passed = eval_result.get("passed", False)
        feedback = eval_result.get("feedback", {})
        
        # Legacy fallback just in case
        if not feedback and ("strengths" in eval_result or "weaknesses" in eval_result):
            feedback = {
                "strengths": eval_result.get("strengths", []),
                "weaknesses": eval_result.get("weaknesses", []),
                "ai_suggestions": eval_result.get("ai_suggestions", []),
                "improvement_areas": eval_result.get("improvement_areas", [])
            }
            
        raw_response = eval_result.get("raw_response", eval_result)
        if not isinstance(raw_response, dict):
            raw_response = dict(eval_result)
        raw_response["transcript"] = raw_text
        raw_response["corrected_transcript"] = corrected_text
        raw_response["interview_mode"] = interview_mode
            
        db_type = "intro_jd" if intro_type == "jd-specific" else "intro"

        try:
            score = float(raw_score)
        except (ValueError, TypeError):
            score = 0.0

        db_score = min(int(score), 100)

        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO aiprep_tool_evaluations (user_id, type, score, passed, feedback, raw_response, video_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                session_id,
                db_type,
                db_score,
                passed,
                json.dumps(_feedback_payload(eval_result)),
                json.dumps(raw_response),
                video_url,
            ))
            eval_id = cursor.lastrowid

        conn.commit()

        return {
            "id": eval_id,
            "transcript": raw_text,
            "corrected_transcript": corrected_text,
            "evaluation": eval_result,
            "score": db_score,
            "passed": passed,
            "video_url": video_url
        }

    except Exception as e:
        err_name = type(e).__name__
        err_msg = str(e)
        print("Intro Error:", err_name, err_msg)
        if "RateLimitError" in err_name or "insufficient_quota" in err_msg or "quota" in err_msg.lower():
            raise HTTPException(
                status_code=402,
                detail="Your OpenAI API key has no credits or has exceeded its quota. Please check your OpenAI billing details."
            )
        elif "AuthenticationError" in err_name or "invalid_api_key" in err_msg.lower():
            raise HTTPException(
                status_code=401,
                detail="Your OpenAI API key is invalid. Please check your API key settings."
            )
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {err_msg}")

    finally:
        if conn:
            conn.close()


# -----------------------------------
# ✍️ TEXT INTRO EVALUATION
# -----------------------------------
@router.post("/evaluate-text")
async def evaluate_text_intro(
    session_id: str = Form(...),
    transcript: str = Form(...),
    intro_type: str = Form("general"),
    job_description: str = Form(""),
    video_url: str = Form(None)
):
    try:
        api_key = get_user_api_key(session_id)
        if not api_key:
            raise Exception("User not initialized")

        resume_data = fetch_resume_dict(session_id)
        from services.speech_service import correct_technical_terms, GLOSSARY
        corrected_text = correct_technical_terms(transcript, [], GLOSSARY)

        if intro_type == "jd-specific":
            eval_result = await evaluate_intro_jd(
                user_id=session_id,
                transcript_raw=transcript,
                transcript_corrected=corrected_text,
                resume_data=resume_data,
                job_description=job_description,
                api_key=api_key,
                vision_metrics=None
            )
        else:
            eval_result = await evaluate_intro(
                user_id=session_id,
                transcript_raw=transcript,
                transcript_corrected=corrected_text,
                resume_data=resume_data,
                api_key=api_key,
                vision_metrics=None
            )
            
        # The LLM now returns the exact db-friendly format for both general and jd-specific intros
        raw_score = eval_result.get("score", eval_result.get("overall_score", 0))
        passed = eval_result.get("passed", False)
        feedback = eval_result.get("feedback", {})
        
        # Legacy fallback just in case
        if not feedback and ("strengths" in eval_result or "weaknesses" in eval_result):
            feedback = {
                "strengths": eval_result.get("strengths", []),
                "weaknesses": eval_result.get("weaknesses", []),
                "ai_suggestions": eval_result.get("ai_suggestions", []),
                "improvement_areas": eval_result.get("improvement_areas", [])
            }
            
        raw_response = eval_result.get("raw_response", eval_result)
        if isinstance(raw_response, dict):
            raw_response["transcript"] = transcript
            raw_response["corrected_transcript"] = corrected_text

        db_type = "intro_jd" if intro_type == "jd-specific" else "intro"

        try:
            score = float(raw_score)
        except (ValueError, TypeError):
            score = 0.0

        db_score = min(int(score), 100)

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO aiprep_tool_evaluations (user_id, type, score, passed, feedback, raw_response, video_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    session_id,
                    db_type,
                    db_score,
                    passed,
                    json.dumps(_feedback_payload(eval_result)),
                    json.dumps(raw_response),
                    video_url
                ))
                eval_id = cursor.lastrowid
            conn.commit()
        finally:
            conn.close()

        return {
            "id": eval_id,
            "transcript": transcript,
            "corrected_transcript": corrected_text,
            "evaluation": eval_result,
            "score": db_score,
            "passed": passed,
            "video_url": video_url
        }

    except Exception as e:
        err_name = type(e).__name__
        err_msg = str(e)
        print("Text Intro Error:", err_name, err_msg)
        if "RateLimitError" in err_name or "insufficient_quota" in err_msg or "quota" in err_msg.lower():
            raise HTTPException(
                status_code=402,
                detail="Your OpenAI API key has no credits or has exceeded its quota. Please check your OpenAI billing details."
            )
        elif "AuthenticationError" in err_name or "invalid_api_key" in err_msg.lower():
            raise HTTPException(
                status_code=401,
                detail="Your OpenAI API key is invalid. Please check your API key settings."
            )
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {err_msg}")


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
#         aiprep_tool_project_context = ""

#         try:
#             with conn.cursor() as cursor:
#                 cursor.execute(
#                     "SELECT product, role FROM aiprep_tool_project_context WHERE user_id = %s",
#                     (session_id,)
#                 )
#                 res = cursor.fetchone()
#                 if res:
#                     aiprep_tool_project_context = f"Product: {res.get('product')}, Role: {res.get('role')}"
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
# {aiprep_tool_project_context}
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
async def get_dynamic_intro_template(session_id: str):
    try:
        api_key = get_user_api_key(session_id)
        if not api_key:
            raise Exception("API key not found")

        from services.resume_source import fetch_resume_dict
        import json
        resume_data = fetch_resume_dict(session_id)
        context_data = json.dumps(resume_data) if resume_data else "No resume data available."

        # ✅ Load template
        template_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "templates",
            "intro_template.txt"
        )

        with open(template_path, "r", encoding="utf-8") as f:
            raw_template = f.read()

        # 🔥 UPDATED SYSTEM PROMPT
        system_prompt = """
You are a senior AI interview coach.

You have been provided with a REFERENCE TEMPLATE. Your ONLY task is to generate an introduction that EXACTLY matches the structure, tone, and flow of the REFERENCE TEMPLATE. 

FORMAT REQUIREMENTS:
1. Plain text only (NO markdown, NO **, NO symbols).
2. Maintain the exact same section flow as the reference template.
3. Replace the placeholder or example information in the template with the Candidate's actual data from the USER PROJECT DATA.
4. The generated intro MUST include the candidate's company name (if available), problem statement, how they solved it, what they did, and the tech stack.
5. If the user data is missing certain sections present in the template, you may adapt slightly, but keep the template's overall narrative and structure.
6. FIRST PERSON PERSPECTIVE: You MUST write the entire introduction from the perspective of the candidate using first-person pronouns ("I", "my", "we"). DO NOT say "The candidate...", say "I...".
"""

        # 🔥 PROMPT
        prompt = f"""
USER PROJECT DATA:
{context_data}

REFERENCE TEMPLATE:
{raw_template}

INSTRUCTIONS:
- STRICTLY adhere to the layout and narrative flow of the REFERENCE TEMPLATE.
- DO NOT invent a new structure.
- Just add the user's own data and project details into the respective sections of the template.
- Ensure the problem statement, solution, and tech stack are clearly articulated based on the USER PROJECT DATA.

Generate the introduction.
"""

        intro_text = await call_llm_with_context(
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
def get_intro_history(session_id: str, page: int = 1, limit: int = 20):
    conn = None
    try:
        conn = get_db_connection()
        offset = (page - 1) * limit

        with conn.cursor() as cursor:
            # Total count for pagination
            cursor.execute("""
                SELECT COUNT(*) as total
                FROM aiprep_tool_evaluations
                WHERE user_id = %s AND type IN ('intro', 'intro_jd', 'intro_eval', 'intro_eval_jd')
            """, (session_id,))
            total_count = cursor.fetchone()["total"]

            cursor.execute("""
                SELECT id, score, feedback, raw_response, type, created_at, video_url
                FROM aiprep_tool_evaluations
                WHERE user_id = %s AND type IN ('intro', 'intro_jd', 'intro_eval', 'intro_eval_jd')
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """, (session_id, limit, offset))

            rows = [_serialize_intro_row(row) for row in cursor.fetchall()]

        total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1

        scores = [row.get("score") or 0 for row in rows]
        best_score = max(scores) if scores else 0
        latest_score = scores[0] if scores else 0
        passed = any(bool(row.get("passed")) for row in rows)

        return {
            "aiprep_tool_attempts": rows or [],
            "history": rows or [],
            "best_score": best_score,
            "latest_score": latest_score,
            "passed": passed,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": total_pages
            }
        }

    except Exception as e:
        print("History Error:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch history")

    finally:
        if conn:
            conn.close()


@router.get("/history/{attempt_id}")
def get_intro_attempt(attempt_id: int, session_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, user_id, type, score, passed, feedback,
                       raw_response, created_at, video_url
                FROM aiprep_tool_evaluations
                WHERE id = %s AND user_id = %s AND type IN ('intro', 'intro_jd', 'intro_eval', 'intro_eval_jd')
                LIMIT 1
            """, (attempt_id, session_id))
            row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Intro attempt not found")

        return _serialize_intro_row(row)

    except HTTPException:
        raise
    except Exception as e:
        print("Attempt Detail Error:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch intro attempt")

    finally:
        if conn:
            conn.close()

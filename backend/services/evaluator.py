# # backend\services\evaluator.py
# import os
# import json
# from services.llm_service import call_llm_with_context

# def load_prompt(filename: str) -> str:
#     base_dir = os.path.dirname(os.path.abspath(__file__))
#     path = os.path.join(base_dir, "prompts", filename)
#     with open(path, "r", encoding="utf-8") as f:
#         return f.read()

# def evaluate_intro(user_id: str, transcript: str, ideal_intro: str = "A clear description of background.", api_key: str = None) -> dict:
#     system_prompt = load_prompt("intro_eval.txt")
    
#     prompt = f"Ideal:\n{ideal_intro}\n\nCandidate:\n{transcript}"
    
#     res_str = call_llm_with_context(
#         user_id=user_id,
#         prompt=prompt,
#         system_prompt=system_prompt,
#         api_key=api_key,
#         response_format="json_object"
#     )
#     return parse_json(res_str)

# def evaluate_project(user_id: str, answers: str, api_key: str = None) -> dict:
#     system_prompt = load_prompt("project_eval.txt")
    
#     prompt = f"Input:\n{answers}"
    
#     res_str = call_llm_with_context(
#         user_id=user_id,
#         prompt=prompt,
#         system_prompt=system_prompt,
#         api_key=api_key,
#         response_format="json_object"
#     )
#     return parse_json(res_str)

# def generate_case_study(user_id: str, data: str, api_key: str = None) -> str:
#     system_prompt = load_prompt("case_study.txt")
#     prompt = f"Input:\n{data}"
    
#     # We do not strictly need json object here, just structured markdown usually.
#     res_str = call_llm_with_context(
#         user_id=user_id,
#         prompt=prompt,
#         system_prompt=system_prompt,
#         api_key=api_key,
#         response_format="text"
#     )
#     return res_str

# def coach_answer(user_id: str, answer: str, feedback: str, api_key: str = None) -> dict:
#     system_prompt = load_prompt("coaching.txt")
    
#     prompt = f"Answer: {answer}\nFeedback: {feedback}"
    
#     res_str = call_llm_with_context(
#         user_id=user_id,
#         prompt=prompt,
#         system_prompt=system_prompt,
#         api_key=api_key,
#         response_format="json_object"
#     )
#     return parse_json(res_str)

# def parse_json(text: str) -> dict:
#     try:
#         # try simple parse
#         return json.loads(text)
#     except Exception:
#         # Strip block quotes if present
#         text = text.strip()
#         if text.startswith("```json"):
#             text = text[7:]
#         if text.endswith("```"):
#             text = text[:-3]
#         text = text.strip()
#         try:
#             return json.loads(text)
#         except Exception as e:
#             print("Failed to parse JSON evaluation target:", text)
#             raise e



import os
import json
from services.llm_service import call_llm_with_context


def load_prompt(filename: str) -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base_dir, "prompts", filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


# ---------------------------
# INTRO EVALUATION
# ---------------------------
def evaluate_intro(user_id: str, transcript: str, ideal_intro: str = "A clear description of background.", api_key: str = None) -> dict:
    system_prompt = load_prompt("intro_eval.txt")

    prompt = f"""
You MUST return valid JSON.

Ideal Answer:
{ideal_intro}

Candidate Answer:
{transcript}
"""

    res_str = call_llm_with_context(
        user_id=user_id,
        prompt=prompt,
        system_prompt=system_prompt,
        api_key=api_key,
        response_format="json_object"
    )

    return safe_parse_json(res_str)


# ---------------------------
# PROJECT EVALUATION
# ---------------------------
def evaluate_project(user_id: str, answers: str, api_key: str = None) -> dict:
    system_prompt = load_prompt("project_eval.txt")

    prompt = f"""
You MUST return valid JSON.

Project Input:
{answers}
"""

    res_str = call_llm_with_context(
        user_id=user_id,
        prompt=prompt,
        system_prompt=system_prompt,
        api_key=api_key,
        response_format="json_object"
    )

    return safe_parse_json(res_str)


# ---------------------------
# CASE STUDY
# ---------------------------
def generate_case_study(user_id: str, data: str, api_key: str = None) -> str:
    # Use direct explicit prompt instead of generic case_study.txt
    system_prompt = "You are an expert technical product manager and AI architect."

    prompt = f"""
Generate a structured case study (not a single text block) with the following sections:
- Domain
- Product/Mission
- Customer
- Business Problem
- Solution (how it solves the problem)
- Roles & Responsibilities (list format)
- Architecture
- Tools Used

Generate two versions of the case study:
1. Agent-based solution
2. RAG-based solution

Input Context:
{data}
"""

    return call_llm_with_context(
        user_id=user_id,
        prompt=prompt,
        system_prompt=system_prompt,
        api_key=api_key,
        response_format="text"
    )


# ---------------------------
# COACHING
# ---------------------------
def coach_answer(user_id: str, answer: str, feedback: str, api_key: str = None) -> dict:
    system_prompt = load_prompt("coaching.txt")

    prompt = f"""
Answer:
{answer}

Feedback:
{feedback}

Return JSON.
"""

    res_str = call_llm_with_context(
        user_id=user_id,
        prompt=prompt,
        system_prompt=system_prompt,
        api_key=api_key,
        response_format="json_object"
    )

    return safe_parse_json(res_str)


# ---------------------------
# SAFE JSON PARSER (IMPROVED)
# ---------------------------
def safe_parse_json(text: str) -> dict:
    if not text:
        return {"error": "Empty response"}

    try:
        return json.loads(text)

    except Exception:
        text = text.strip()

        # Remove markdown blocks
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        text = text.strip()

        try:
            return json.loads(text)
        except Exception as e:
            print("⚠️ JSON Parse Failed:", text)
            return {
                "error": "Invalid JSON from LLM",
                "raw": text
            }
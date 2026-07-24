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
import re
from services.llm_service import call_llm_with_context


def load_prompt(filename: str) -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base_dir, "prompts", filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


# ---------------------------
# INTRO EVALUATION
# ---------------------------
async def evaluate_intro(
    user_id: str,
    transcript_raw: str,
    transcript_corrected: str,
    resume_data: dict = None,
    api_key: str = None,
    vision_metrics: dict = None
) -> dict:
    system_prompt = load_prompt("intro_eval.txt")

    prompt = f"""
You MUST return valid JSON.

RESUME_CONTEXT:
{json.dumps(resume_data) if resume_data else "No resume provided."}

RAW_TRANSCRIPT:
{transcript_raw}

CORRECTED_TRANSCRIPT:
{transcript_corrected}

VISION_PERFORMANCE:
{json.dumps(vision_metrics) if vision_metrics else "No camera vision metrics available."}
"""

    res_str = await call_llm_with_context(
        user_id=user_id,
        prompt=prompt,
        system_prompt=system_prompt,
        api_key=api_key,
        response_format="json_object"
    )

    return safe_parse_json(res_str)


# ---------------------------
# JD SPECIFIC INTRO EVALUATION
# ---------------------------
async def evaluate_intro_jd(
    user_id: str,
    transcript_raw: str,
    transcript_corrected: str,
    resume_data: dict,
    job_description: str,
    api_key: str = None,
    vision_metrics: dict = None
) -> dict:
    system_prompt = load_prompt("jd_specific_intro.txt")

    prompt = f"""
JOB_DESCRIPTION:
{job_description}

RESUME_CONTEXT:
{json.dumps(resume_data) if resume_data else "No resume provided."}

RAW_TRANSCRIPT:
{transcript_raw}

CORRECTED_TRANSCRIPT:
{transcript_corrected}

VISION_PERFORMANCE:
{json.dumps(vision_metrics) if vision_metrics else "No camera vision metrics available."}
"""

    res_str = await call_llm_with_context(
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
async def evaluate_project(user_id: str, answers: str, api_key: str = None) -> dict:
    system_prompt = load_prompt("project_eval.txt")

    prompt = f"""
You MUST return valid JSON.

Project Input:
{answers}
"""

    res_str = await call_llm_with_context(
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
async def generate_case_study(user_id: str, data: str, api_key: str = None) -> str:
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

    return await call_llm_with_context(
        user_id=user_id,
        prompt=prompt,
        system_prompt=system_prompt,
        api_key=api_key,
        response_format="text"
    )


# ---------------------------
# COACHING
# ---------------------------
async def coach_answer(user_id: str, answer: str, feedback: str, api_key: str = None) -> dict:
    system_prompt = load_prompt("coaching.txt")

    prompt = f"""
Answer:
{answer}

Feedback:
{feedback}

Return JSON.
"""

    res_str = await call_llm_with_context(
        user_id=user_id,
        prompt=prompt,
        system_prompt=system_prompt,
        api_key=api_key,
        response_format="json_object"
    )

    return safe_parse_json(res_str)


# ---------------------------
# PROGRAMMATIC CONSISTENCY VALIDATOR & NORMALIZER
# ---------------------------
def validate_and_correct_consistency(eval_result: dict) -> dict:
    if not isinstance(eval_result, dict):
        return {"error": "Invalid result from model", "raw": str(eval_result)}

    feedback = eval_result.get("feedback")
    if not isinstance(feedback, dict):
        feedback = {"feedback": str(feedback)} if feedback is not None else {}
        eval_result["feedback"] = feedback

    raw_response = eval_result.get("raw_response")
    if not isinstance(raw_response, dict):
        raw_response = {"raw": str(raw_response)} if raw_response is not None else {}
        eval_result["raw_response"] = raw_response

    # 1. Normalize and merge scores for frontend breakdown cards
    scores = None
    if "scores" in feedback:
        scores = feedback["scores"]
    elif "scores" in raw_response:
        scores = raw_response["scores"]
    else:
        # Combine delivery_scores and jd_alignment_scores if present
        merged_scores = {}
        if "delivery_scores" in raw_response and isinstance(raw_response["delivery_scores"], dict):
            merged_scores.update(raw_response["delivery_scores"])
        if "jd_alignment_scores" in raw_response and isinstance(raw_response["jd_alignment_scores"], dict):
            merged_scores.update(raw_response["jd_alignment_scores"])
        if merged_scores:
            scores = merged_scores
            raw_response["scores"] = merged_scores
    
    if scores:
        feedback["scores"] = scores
        raw_response["scores"] = scores

    # 2. Get the topic checklist (the Evidence-First source of truth)
    topic_checklist = raw_response.get("topic_checklist", {})
    if not isinstance(topic_checklist, dict) or not topic_checklist:
        return eval_result

    # Clean the topic checklist by removing instructions key
    checklist_clean = {k: v for k, v in topic_checklist.items() if not k.startswith("_")}

    # Helper to fuzzy match names
    def normalize_name(s: str) -> str:
        return "".join(c for c in s.lower() if c.isalnum())

    normalized_checklist = {}
    for topic_key, topic_val in checklist_clean.items():
        if isinstance(topic_val, dict) and "status" in topic_val:
            normalized_checklist[normalize_name(topic_key)] = {
                "key": topic_key,
                "status": topic_val["status"],
                "evidence": topic_val.get("evidence")
            }

    # Map checklist status to verdict
    status_to_verdict = {
        "covered": "correct",
        "shallow": "partial",
        "missing": "missing"
    }

    # 3. Validate and enforce consistency in corrections list
    corrections = feedback.get("corrections", [])
    if isinstance(corrections, list):
        for corr in corrections:
            if not isinstance(corr, dict) or "topic" not in corr:
                continue
            
            corr_topic = corr.get("topic")
            corr_topic_key = corr.get("topic_key")
            
            # Find matching checklist item by EXACT KEY
            checklist_match = None
            if corr_topic_key and isinstance(corr_topic_key, str):
                checklist_match = normalized_checklist.get(normalize_name(corr_topic_key))
            elif corr_topic and isinstance(corr_topic, str):
                # Fallback to fuzzy match if LLM missed topic_key
                norm_corr_topic = normalize_name(corr_topic)
                if norm_corr_topic in normalized_checklist:
                    checklist_match = normalized_checklist[norm_corr_topic]
                else:
                    for norm_check_key, check_val in normalized_checklist.items():
                        if norm_corr_topic in norm_check_key or norm_check_key in norm_corr_topic:
                            checklist_match = check_val
                            break
            
            if checklist_match:
                status = checklist_match["status"]
                expected_verdict = status_to_verdict.get(status)
                actual_verdict = corr.get("verdict")
                
                if expected_verdict and actual_verdict != expected_verdict:
                    print(f"[WARNING] Consistency Violation: Topic '{corr_topic}' has status '{status}' in checklist but verdict is '{actual_verdict}'. Overriding to '{expected_verdict}'.")
                    corr["verdict"] = expected_verdict
                    # If it was marked correct but now missing, clear disingenuous note/add placeholder
                    if expected_verdict == "missing" and actual_verdict == "correct":
                        corr["note"] = f"Missing — no mention of {corr_topic} was found in the transcript."
                    # If it was marked missing but is actually covered, clear the hallucination note
                    elif expected_verdict == "correct" and actual_verdict == "missing":
                        corr["note"] = f"Covered — {corr_topic} was successfully mentioned in the transcript."

    # 4. Enforce consistency in curated technical_gaps by pruning hallucinated gaps
    # If any item in technical_gaps corresponds to a 'covered' checklist item, we must prune/remove it.
    technical_gaps = feedback.get("technical_gaps", {})
    resume_analysis = raw_response.get("resume_gap_analysis") or raw_response.get("resume_match") or {}

    if isinstance(technical_gaps, dict):
        pruned_gaps = {}
        for category, gaps_list in technical_gaps.items():
            if not isinstance(gaps_list, list):
                pruned_gaps[category] = gaps_list
                continue
            
            new_gaps_list = []
            for gap in gaps_list:
                topic_key = None
                rest_of_text = ""
                
                if isinstance(gap, dict):
                    topic_key = gap.get("topic_key")
                    rest_of_text = gap.get("note", "")
                elif isinstance(gap, str):
                    # Fallback for old string format with prefix
                    match = re.match(r'^\[([^\]]+)\]\s*(.*)', gap.strip())
                    if match:
                        topic_key, rest_of_text = match.groups()
                    else:
                        print(f"[WARNING] Hallucination Pruned (Strict Mode): Dropping '{gap}' as it lacks a [topic_key] prefix or object format.")
                        continue
                else:
                    continue
                
                if not topic_key or not isinstance(topic_key, str):
                    continue
                    
                norm_topic_key = normalize_name(topic_key)
                
                # Check if this gap text refers to any 'covered' topic in the checklist
                is_hallucinated = False
                if norm_topic_key in normalized_checklist:
                    if normalized_checklist[norm_topic_key]["status"] == "covered":
                        is_hallucinated = True
                        print(f"[WARNING] Hallucination Pruned: Removed gap for '{topic_key}' because it is marked 'covered' in the checklist.")
                
                # Resume Claim Validation
                if not is_hallucinated and ("resume" in rest_of_text.lower() or "resume shows" in rest_of_text.lower()):
                    found_in_resume_gaps = False
                    for key, val in resume_analysis.items():
                        if isinstance(val, list) and key in ["missed_entirely", "communication_gap", "genuine_gap"]:
                            for item in val:
                                if isinstance(item, str):
                                    if topic_key.lower().replace("_", " ") in item.lower() or norm_topic_key in normalize_name(item):
                                        found_in_resume_gaps = True
                                        break
                        if found_in_resume_gaps:
                            break
                            
                    if not found_in_resume_gaps:
                        is_hallucinated = True
                        print(f"[WARNING] Resume Claim Pruned: Removed gap for '{topic_key}' because it was NOT found in resume gap analysis as a valid gap.")
                
                if not is_hallucinated:
                    # Append the original object or stripped string
                    if isinstance(gap, dict):
                        new_gaps_list.append(gap)
                    else:
                        new_gaps_list.append(rest_of_text.strip())
            
            pruned_gaps[category] = new_gaps_list
        feedback["technical_gaps"] = pruned_gaps

    return eval_result


# ---------------------------
# SAFE JSON PARSER (IMPROVED)
# ---------------------------
def safe_parse_json(text: str) -> dict:
    if not text:
        return {"error": "Empty response"}

    parsed = None
    try:
        parsed = json.loads(text)

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
            parsed = json.loads(text)
        except Exception as e:
            print("[WARNING] JSON Parse Failed:", text)
            parsed = {
                "error": "Invalid JSON from LLM",
                "raw": text
            }

    # Handle double-encoded JSON strings
    if isinstance(parsed, str):
        try:
            parsed = json.loads(parsed)
        except Exception:
            parsed = {
                "error": "LLM returned raw string instead of JSON object",
                "raw": parsed
            }

    # Ensure it's a dictionary
    if not isinstance(parsed, dict):
        parsed = {
            "error": "LLM returned non-object response",
            "raw": str(parsed)
        }

    return validate_and_correct_consistency(parsed)

"""
Intro Evaluator: Speech-to-Text + AI scoring of candidate introductions.
Updated with full 8-parameter rubric per master prompt spec.
"""
import json
from services.ai_client import generate_text, speech_to_text
from services.template_loader import get_intro_template

PASS_SCORE = 7  # Score threshold out of 10

EVAL_PROMPT = """
You are evaluating a candidate's interview self-introduction.

Intro Template (ideal structure aiprep_tool_candidates should follow):
\"\"\"{intro_template}\"\"\"

Candidate's Introduction:
\"\"\"{candidate_intro}\"\"\"

Evaluate the candidate on ALL 8 parameters below. Score each out of 10:

1. template_similarity — How closely does the intro follow the template structure?
2. fluency — Is the speech smooth, natural, without excessive pauses or fillers?
3. grammar — Is the language grammatically correct and professional?
4. clarity — Is the message clear and easy to understand?
5. confidence — Does the candidate sound confident and assured?
6. structure — Is there a clear logical flow (name → experience → skills → goal)?
7. professional_tone — Is the language formal and appropriate for an interview?
8. completeness — Does the intro fully cover all required elements (name, experience, skills, goal)?

Calculate overall_score = average of all 8 scores (rounded to 1 decimal).

If overall_score < 7 → status = "FAIL"
If overall_score >= 7 → status = "PASS"

Also generate:
- suggestions: 3-5 specific actionable improvements
- improved_intro: A rewritten, improved version of their intro

Return ONLY a valid JSON object with this exact format (no extra text, no markdown):
{{
  "scores": {{
    "template_similarity": <0-10>,
    "fluency": <0-10>,
    "grammar": <0-10>,
    "clarity": <0-10>,
    "confidence": <0-10>,
    "structure": <0-10>,
    "professional_tone": <0-10>,
    "completeness": <0-10>
  }},
  "overall_score": <0-10>,
  "status": "PASS" or "FAIL",
  "suggestions": ["...", "...", "..."],
  "improved_intro": "..."
}}
"""

INTRO_TRAINING_PROMPT = """
You are an interview communication trainer helping a candidate prepare their self-introduction.

Below is the ideal introduction template aiprep_tool_candidates must follow during interviews:

Intro Template:
{intro_template}

Your task:
1. Explain clearly how the candidate should structure their introduction based on this template.
2. Point out what each section should include and why it matters.
3. Generate a complete, professional sample introduction for THIS candidate based on their resume summary below.

Make the sample intro natural, confident, and interview-ready. Keep it under 90 seconds when spoken.

Candidate Resume Summary:
{resume_summary}
"""


async def generate_intro_training(resume_text: str, api_key: str, provider: str) -> str:
    """Generate intro template explanation + personalised sample intro from resume."""
    intro_template = get_intro_template()
    prompt = INTRO_TRAINING_PROMPT.format(
        intro_template=intro_template,
        resume_summary=resume_text[:4000],
    )
    return await generate_text(prompt, api_key, provider)


async def evaluate_intro_from_text(
    candidate_intro: str,
    api_key: str,
    provider: str,
) -> dict:
    """
    Evaluate a text introduction (no audio needed).
    Returns structured evaluation with 8 scores.
    """
    intro_template = get_intro_template()
    if not candidate_intro or len(candidate_intro.strip()) < 20:
        return {
            "scores": {},
            "overall_score": 0,
            "status": "FAIL",
            "suggestions": ["Introduction too short. Please write or record a complete introduction."],
            "improved_intro": "",
            "transcript": candidate_intro,
        }

    prompt = EVAL_PROMPT.format(
        intro_template=intro_template,
        candidate_intro=candidate_intro,
    )
    raw = await generate_text(prompt, api_key, provider)

    try:
        clean = raw.strip()
        if clean.startswith("```"):
            parts = clean.split("```")
            clean = parts[1] if len(parts) > 1 else clean
            if clean.startswith("json"):
                clean = clean[4:]
        eval_data = json.loads(clean.strip())
    except Exception:
        eval_data = {
            "scores": {},
            "overall_score": 5.0,
            "status": "FAIL",
            "suggestions": [raw[:300]],
            "improved_intro": "",
        }

    score = eval_data.get("overall_score", 0)
    # Normalize: if score seems to be out of 100, convert
    if score > 10:
        score = round(score / 10, 1)
    eval_data["overall_score"] = score
    eval_data["status"] = "PASS" if score >= PASS_SCORE else "FAIL"
    eval_data["transcript"] = candidate_intro

    return eval_data


async def evaluate_intro_from_audio(
    audio_bytes: bytes,
    api_key: str,
    provider: str,
    filename: str = "intro.webm"
) -> dict:
    """
    Full pipeline: audio → STT → AI evaluation.
    Returns dict with transcript, scores, feedback, pass/fail.
    """
    # Step 1: Speech to Text
    transcript = await speech_to_text(audio_bytes, api_key, provider, filename)

    if not transcript or len(transcript.strip()) < 20:
        return {
            "scores": {},
            "overall_score": 0,
            "status": "FAIL",
            "suggestions": ["Recording too short or unclear. Please try again with a complete introduction."],
            "improved_intro": "",
            "transcript": transcript,
        }

    # Step 2: Evaluate the transcript
    result = await evaluate_intro_from_text(transcript, api_key, provider)
    return result

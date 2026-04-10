"""
Mock Interview Agent:
- Generates interview questions from resume + project details
- Evaluates candidate answers with scores and feedback
"""
from services.ai_client import generate_text
import json

# ─── Question Generator ───────────────────────────────────────────────────────

QUESTION_GENERATOR_PROMPT = """
You are a senior technical interviewer preparing interview questions for a candidate.

Based on the resume and project details below, generate exactly 10 interview questions 
with increasing difficulty.
Questions must be specific, natural, and non-repetitive. Do not repeat or paraphrase the same question.

Focus on these question types:
- 2 Project-related questions (explain your project, what was your role)
- 2 Technical questions (architecture, design decisions, tech stack)
- 2 Scenario-based questions (what would you do if...)
- 2 System design questions (how would you design X)
- 2 Behavioral questions (tell me about a challenge, how did you handle conflict)

Return ONLY a valid JSON array with this exact structure (no extra text):
[
  {{
    "id": 1,
    "type": "Project",
    "difficulty": "Easy",
    "question": "...",
    "hint": "Key points to cover in a good answer"
  }},
  ...
]

Candidate Resume:
{resume_text}

Candidate Project Details:
{project_details}
"""

# ─── Answer Evaluator ─────────────────────────────────────────────────────────

ANSWER_EVALUATION_PROMPT = """
You are a senior technical interviewer evaluating a candidate's answer.
Use a constructive, coaching tone. Be specific and actionable, not generic.

Question:
{question}

Candidate Answer:
{answer}

Evaluate the answer on the following parameters (each scored out of 10):

1. Technical Correctness — Is the answer factually and technically accurate?
2. Depth of Knowledge — Does the candidate show deep understanding, not just surface level?
3. Clarity of Explanation — Is the answer easy to understand and well-explained?
4. Communication — Is the language professional and structured?
5. Confidence — Does the answer read as confident and assured?
6. Structure — Does the answer have a clear beginning, middle, and conclusion?

Return ONLY a valid JSON object with this exact structure (no extra text):
{{
  "scores": {{
    "technical_correctness": <0-10>,
    "depth_of_knowledge": <0-10>,
    "clarity": <0-10>,
    "communication": <0-10>,
    "confidence": <0-10>,
    "structure": <0-10>
  }},
  "overall_score": <average of all 6 scores, rounded to 1 decimal>,
  "feedback": "<2-3 sentences of specific feedback on this answer>",
  "ideal_answer": "<What a perfect answer would look like, 3-5 sentences>",
  "suggestions": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
}}
"""

# ─── Report Generator ─────────────────────────────────────────────────────────

FINAL_REPORT_PROMPT = """
You are an expert interview evaluator generating a final preparation report.

Analyze all Candidate Data below and generate a strictly structured JSON response representing the candidate's final interview capability report.

Return ONLY a valid JSON object matching this schema (do NOT use markdown fences):
{{
  "overall_score": "<0-100>",
  "hire_readiness": "High | Medium | Low",
  "top_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "top_weaknesses": ["<weakness 1>", "<weakness 2>"],
  "improvement_plan": ["<action 1>", "<action 2>", "<action 3>"]
}}

---
Candidate Data:
Resume Summary: {resume_summary}
Project: {project_details}
Intro Score: {intro_score}/100
Intro Status: {intro_status}
Mock Interview Scores: {answer_scores}
"""


async def generate_interview_questions(
    resume_text: str,
    project_details: str,
    api_key: str,
    provider: str
) -> list:
    """Generate 10 interview questions, return as list of dicts."""
    prompt = QUESTION_GENERATOR_PROMPT.format(
        resume_text=resume_text[:5000],
        project_details=project_details[:3000],
    )
    raw = await generate_text(prompt, api_key, provider)
    try:
        # Strip markdown fences if present
        clean = raw.strip()
        if clean.startswith("```"):
            parts = clean.split("```")
            clean = parts[1] if len(parts) > 1 else clean
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
    except Exception:
        # Fallback: return raw as single question
        return [{"id": 1, "type": "General", "difficulty": "Medium", "question": raw[:500], "hint": ""}]


async def evaluate_answer(
    question: str,
    answer: str,
    api_key: str,
    provider: str
) -> dict:
    """Evaluate a single interview answer, return structured scores."""
    prompt = ANSWER_EVALUATION_PROMPT.format(question=question, answer=answer)
    raw = await generate_text(prompt, api_key, provider)
    try:
        clean = raw.strip()
        if clean.startswith("```"):
            parts = clean.split("```")
            clean = parts[1] if len(parts) > 1 else clean
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
    except Exception:
        return {
            "scores": {},
            "overall_score": 5.0,
            "feedback": raw[:400],
            "ideal_answer": "",
            "suggestions": [],
        }


async def generate_final_report(
    resume_text: str,
    project_details: str,
    intro_score: int,
    intro_status: str,
    answer_scores: list,
    api_key: str,
    provider: str,
) -> str:
    """Generate the final interview preparation report."""
    avg_score = round(sum(answer_scores) / len(answer_scores), 1) if answer_scores else 0
    prompt = FINAL_REPORT_PROMPT.format(
        resume_summary=resume_text[:3000],
        project_details=project_details[:2000],
        intro_score=intro_score,
        intro_status=intro_status,
        questions_answered=len(answer_scores),
        avg_answer_score=avg_score,
        answer_scores=", ".join([str(s) for s in answer_scores]),
    )
    return await generate_text(prompt, api_key, provider)

"""
Case Study Agent:
1. Extracts projects from resume and generates detailed case studies.
2. Template-based case study generation from extracted project details.
Domain case study generation for common system types.
"""
from services.ai_client import generate_text
from services.template_loader import get_case_study_template, list_case_study_templates

# ─── Template-Based Case Study ────────────────────────────────────────────────

TEMPLATE_BASED_PROMPT = """
You are an expert technical case study writer.

CRITICAL INSTRUCTIONS FOR MERGING:
Your goal is to write a deeply technical case study that keeps the EXACT technical topic, architecture, and structural headings of the Template, but sets the story entirely within the Candidate's current/latest Company and Role found in their Resume.

1. TECHNICAL THEME & FEATURES: You MUST keep the exact core technical system from the Template (e.g., if the template is "Agentic AI", you MUST write about Agentic AI. If it is "MLOps", you MUST write about MLOps). Do NOT change the core technology to match the candidate's past work. 
2. COMPANY & NAMES: You MUST extract the Candidate's most recent/current Company Name and Product/Project Name from the Resume below. Completely replace "XYZ Corp" and any template placeholder names with the Candidate's REAL Company Name.
3. ADAPTATION: Write the case study as if the Candidate built this exact Template system at their REAL company.
4. HEADINGS: Use EVERY section heading provided in the Template's structure.
5. DOMAIN STORY ADAPTATION (MANDATORY): infer the most likely business workflow from project/company context and adapt examples accordingly.
   - If context looks like healthcare/insurance, use scenarios like policy enquiry, claims, billing, authorization workflows.
   - If context looks like recruitment/hr-tech, use scenarios like resume screening, best-fit ranking, recruiter feedback loops.
   - For other domains, adapt scenarios to that domain explicitly.
6. Add a short section named "Context Validation" near the top:
   - "What I understood about your project/company"
   - "Assumptions I used"
   Keep this concise and concrete.
7. For agentic template, include named agents relevant to domain (e.g., resume analyst agent, policy query agent, claim triage agent, feedback agent).
8. Keep it interview-ready and practical; avoid generic template-only text.

Case Study Template (USE THIS FOR HEADINGS, STRUCTURE, & THE SYSTEM'S CORE ARCHITECTURE):
{template_text}

Candidate's Extracted Project Background:
{project_details}

Candidate's Full Resume (EXTRACT THE CURRENT COMPANY NAME AND APPLY IT TO THE CASE STUDY):
{resume_text}
"""

# ─── Resume-Based Case Study ──────────────────────────────────────────────────

RESUME_CASE_STUDY_PROMPT = """
You are an AI Candidate Preparation Assistant helping a candidate prepare for interviews.

From the resume below, extract the most significant project and generate a professional
case study document in the following structure:

## Case Study: [Project Name]

### 1. Executive Summary
[2-3 sentence overview suitable for opening an interview discussion]

### 2. Problem Statement
[What business or technical problem was being solved? Why did it matter?]

### 3. Objective
[Clear goals and success criteria of the project]

### 4. Solution Approach
[How was the problem solved? What was the strategy and rationale?]

### 5. Architecture & Workflow
[System design, key components, data flow, integration points]

### 6. Technologies Used
[Full tech stack: languages, frameworks, cloud services, databases, tools]

### 7. Your Role & Responsibilities
[What specifically did you build, own, or lead?]

### 8. Key Challenges & How They Were Solved
[Top 2-3 hardest problems and how you overcame them]

### 9. Results & Impact
[Measurable outcomes: performance improvements, cost savings, user growth, etc.]

### 10. Interview Q&A
Generate 7 likely interview questions about this project with ideal short answers.

Be specific, technical, and interview-ready throughout.

Resume:
{resume_text}
"""

# ─── Domain Case Study ────────────────────────────────────────────────────────

DOMAIN_CASE_STUDY_PROMPT = """
You are an AI Interview Preparation Assistant.

Generate a comprehensive, realistic case study for the following domain/system type:
**{topic}**

Structure it exactly as follows:

## Case Study: {topic}

### 1. Executive Summary
### 2. Problem Statement
### 3. Objective
### 4. Solution Approach
### 5. Architecture & Workflow
[Include a text-based architecture diagram using ASCII or structured text]
### 6. Technologies Used
### 7. Key Challenges & Solutions
### 8. Results & Impact
### 9. Interview Q&A
[10 common interview questions about this system with ideal answers]

Make the content realistic, deeply technical, and suitable for a senior software engineering
interview. Include real numbers and metrics where appropriate.
"""

# ─── Default Case Study Template ─────────────────────────────────────────────

DEFAULT_TEMPLATE = """
## Project Overview
Brief summary of the project.

## Problem Statement
What problem does this project solve?

## Objectives
Key goals of the project.

## Solution
Technical solution implemented.

## Architecture
System components and how they interact.

## Technologies Used
List of all technologies.

## Implementation
Key implementation details.

## Challenges
Problems faced and solutions.

## Results
Outcomes and impact achieved.

## Conclusion
Summary and learnings.
"""


async def generate_case_study_from_resume(resume_text: str, api_key: str, provider: str) -> str:
    """Generate a case study from the candidate's resume."""
    prompt = RESUME_CASE_STUDY_PROMPT.format(resume_text=resume_text[:8000])
    return await generate_text(prompt, api_key, provider)


async def generate_template_based_case_study(
    project_details: str,
    resume_text: str,
    api_key: str,
    provider: str,
    template_key: str = "mlops",
    template_text: str = None,
) -> str:
    """Generate a case study using a provided template structure."""
    if template_text is None:
        # Load real template description from template_loader
        tmpl = get_case_study_template(template_key)
        template_text = f"""
# Template: {tmpl['name']}

{tmpl['description']}
"""
    prompt = TEMPLATE_BASED_PROMPT.format(
        template_text=template_text,
        project_details=project_details[:6000],
        resume_text=resume_text[:6000],
    )
    return await generate_text(prompt, api_key, provider)


async def generate_domain_case_study(topic: str, api_key: str, provider: str) -> str:
    """Generate a generic domain case study (e.g., RAG system, chatbot)."""
    prompt = DOMAIN_CASE_STUDY_PROMPT.format(topic=topic)
    return await generate_text(prompt, api_key, provider)


def get_available_templates() -> list:
    """Return list of available template options for the frontend."""
    return list_case_study_templates()

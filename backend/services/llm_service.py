import os
import json
from services.context_service import get_candidate_context
from services.user_context import get_user_api_context
from services.ai_client import generate_text

async def call_llm(
    prompt: str,
    system_prompt: str = "You are a helpful AI.",
    api_key: str = None,
    response_format: str = "text",
    provider: str = "openai",
) -> str:
    """
    Base function for LLM calls. Enforces JSON if requested.
    Delegates to services.ai_client.generate_text.
    """
    if not api_key:
        api_key = os.getenv("OPENAI_API_KEY")
        provider = "openai"
        if not api_key:
            raise ValueError("API key is not set.")

    return await generate_text(
        prompt=prompt,
        api_key=api_key,
        provider=provider,
        system_prompt=system_prompt,
        response_format=response_format,
    )

async def call_llm_with_context(
    user_id: str,
    prompt: str,
    system_prompt: str = "You are a helpful AI.",
    api_key: str = None,
    response_format: str = "text"
) -> str:
    """
    Retrieves candidate context and calls LLM using candidate's configuration.
    """
    provider = "openai"
    if not api_key:
        api_ctx = get_user_api_context(user_id)
        if api_ctx and api_ctx.get("api_key"):
            api_key = api_ctx["api_key"]
            provider = api_ctx.get("provider") or "openai"
        else:
            api_key = os.getenv("OPENAI_API_KEY")
            provider = "openai"
    else:
        # Detect provider from the passed api_key
        if api_key.startswith("AIzaSy"):
            provider = "gemini"
        elif api_key.startswith("sk-ant"):
            provider = "claude"
        else:
            provider = "openai"

    context = get_candidate_context(user_id)
    context_str = json.dumps(context, indent=2)
    
    enhanced_system_prompt = f"""
{system_prompt}

KNOWN CANDIDATE CONTEXT:
{context_str}

STRICT RULE:
Do NOT ask:
- project explanation again
- tech stack again
- anything already present in context
"""
    return await call_llm(
        prompt=prompt,
        system_prompt=enhanced_system_prompt,
        api_key=api_key,
        response_format=response_format,
        provider=provider,
    )

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

def classify_error_message(err_msg: str) -> str:
    err_lower = err_msg.lower()
    if "billing_limit_reached" in err_lower or "quota" in err_lower or "limit" in err_lower:
        return "CREDITS_EXHAUSTED"
    if "invalid_api_key" in err_lower or "api_key_invalid" in err_lower or "incorrect api key" in err_lower or "unauthorized" in err_lower or "401" in err_lower:
        return "INVALID_KEY"
    return "UNKNOWN_ERROR"


def update_key_status_in_db(key_id: int, status: str, failure_reason: str):
    from db.connection import get_db_connection
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE candidate_llm_api_keys
                SET status = %s, failure_reason = %s, last_validated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (status, failure_reason, key_id),
            )
            conn.commit()
    finally:
        conn.close()


def clear_default_and_set_next_default(candidate_id: int, failed_key_id: int):
    from db.connection import get_db_connection
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE candidate_llm_api_keys SET is_default = 0 WHERE id = %s",
                (failed_key_id,),
            )
            cursor.execute(
                """
                SELECT id FROM candidate_llm_api_keys
                WHERE candidate_id = %s AND status = 'active' AND id != %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (candidate_id, failed_key_id),
            )
            res = cursor.fetchone()
            if res:
                cursor.execute(
                    "UPDATE candidate_llm_api_keys SET is_default = 1 WHERE id = %s",
                    (res["id"],),
                )
            conn.commit()
    finally:
        conn.close()


async def call_llm_with_context(
    user_id: str,
    prompt: str,
    system_prompt: str = "You are a helpful AI.",
    api_key: str = None,
    response_format: str = "text"
) -> str:
    """
    Retrieves candidate context and calls LLM using candidate's configuration.
    Implements a failover retry loop if candidate's key encounters credit exhaustion or authorization issues.
    """
    if api_key:
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

    from services.resume_source import is_wbl_candidate_session
    if not is_wbl_candidate_session(user_id):
        api_ctx = get_user_api_context(user_id)
        api_key = api_ctx.get("api_key") or os.getenv("OPENAI_API_KEY")
        provider = api_ctx.get("provider") or "openai"
        if not api_key:
            raise ValueError("API key is not set.")

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

    attempted_key_ids = set()
    cid = int(user_id)

    while True:
        api_ctx = get_user_api_context(user_id)
        key_id = api_ctx.get("id")
        api_key = api_ctx.get("api_key")
        provider = api_ctx.get("provider") or "openai"

        if not api_key:
            raise ValueError("ALL_LLM_KEYS_UNAVAILABLE")

        if key_id:
            if key_id in attempted_key_ids:
                raise ValueError("ALL_LLM_KEYS_UNAVAILABLE")
            attempted_key_ids.add(key_id)

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
        try:
            return await call_llm(
                prompt=prompt,
                system_prompt=enhanced_system_prompt,
                api_key=api_key,
                response_format=response_format,
                provider=provider,
            )
        except Exception as e:
            err_msg = str(e)
            if not key_id:
                raise e

            classification = classify_error_message(err_msg)
            if classification == "CREDITS_EXHAUSTED":
                update_key_status_in_db(key_id, "credits_exhausted", err_msg)
                clear_default_and_set_next_default(cid, key_id)
                continue
            elif classification == "INVALID_KEY":
                update_key_status_in_db(key_id, "invalid", err_msg)
                clear_default_and_set_next_default(cid, key_id)
                continue
            else:
                update_key_status_in_db(key_id, "inactive", err_msg)
                clear_default_and_set_next_default(cid, key_id)
                continue

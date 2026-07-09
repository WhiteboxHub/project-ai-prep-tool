from db.connection import get_db_connection
from utils.security import decrypt


def get_user_api_context(user_id: str) -> dict:
    """
    Returns a dict with:
      "api_key": decrypted key or None
      "provider": detected provider string ("openai", "gemini", etc.) or None

    user_id is always str(candidate_marketing.id).
    API keys are stored in candidate_llm_api_keys via candidate.id.
    """
    conn = get_db_connection()
    try:
        api_key = None
        provider = None

        with conn.cursor() as cursor:
            marketing_id = int(user_id)
            # Get the candidate.id from candidate_marketing
            cursor.execute(
                "SELECT candidate_id FROM candidate_marketing WHERE id = %s",
                (marketing_id,),
            )
            cm = cursor.fetchone()
            if cm and cm.get("candidate_id"):
                cid = cm["candidate_id"]
                cursor.execute(
                    """
                    SELECT api_key, provider_name FROM candidate_llm_api_keys
                    WHERE candidate_id = %s
                    ORDER BY updated_at DESC, id DESC
                    LIMIT 1
                    """,
                    (cid,),
                )
                res = cursor.fetchone()
                if res and res.get("api_key"):
                    api_key = decrypt(res["api_key"])
                    p_name = (res.get("provider_name") or "").lower()
                    if "openai" in p_name:
                        provider = "openai"
                    elif "gemini" in p_name or "google" in p_name:
                        provider = "gemini"
                    elif "claude" in p_name or "anthropic" in p_name:
                        provider = "claude"
                    else:
                        provider = p_name

        return {
            "api_key": api_key,
            "provider": provider
        }
    except Exception as e:
        print(f"[user_context] get_user_api_context error for user_id={user_id}: {e}")
        return {"api_key": None, "provider": None}
    finally:
        conn.close()


def get_user_api_key(user_id: str):
    ctx = get_user_api_context(user_id)
    return ctx["api_key"]

from db.connection import get_db_connection
from utils.security import decrypt
from services.resume_source import is_wbl_candidate_session


def get_user_api_context(user_id: str) -> dict:
    """
    Returns a dict with:
      "api_key": decrypted key or None
      "provider": detected provider string ("openai", "gemini", etc.) or None
    """
    conn = get_db_connection()
    try:
        api_key = None
        provider = None
        
        with conn.cursor() as cursor:
            if is_wbl_candidate_session(user_id):
                cid = int(user_id)
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
            else:
                cursor.execute(
                    "SELECT api_key_encrypted FROM aiprep_tool_candidates WHERE user_id = %s",
                    (user_id,),
                )
                res = cursor.fetchone()
                if res and res.get("api_key_encrypted"):
                    api_key = decrypt(res["api_key_encrypted"])
                    if api_key.startswith("sk-") or api_key.startswith("sk-proj-"):
                        provider = "openai"
                    elif api_key.startswith("AIzaSy"):
                        provider = "gemini"
                    elif api_key.startswith("sk-ant"):
                        provider = "claude"
                    else:
                        provider = "openai" # fallback

        return {
            "api_key": api_key,
            "provider": provider
        }
    finally:
        conn.close()


def get_user_api_key(user_id: str):
    ctx = get_user_api_context(user_id)
    return ctx["api_key"]

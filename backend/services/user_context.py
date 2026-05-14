from db.connection import get_db_connection
from utils.security import decrypt
from services.resume_source import is_wbl_candidate_session


def get_user_api_key(user_id: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if is_wbl_candidate_session(user_id):
                cid = int(user_id)
                cursor.execute(
                    """
                    SELECT api_key FROM candidate_llm_api_keys
                    WHERE candidate_id = %s
                    ORDER BY updated_at DESC, id DESC
                    LIMIT 1
                    """,
                    (cid,),
                )
                res = cursor.fetchone()
            else:
                cursor.execute(
                    "SELECT api_key_encrypted FROM aiprep_tool_candidates WHERE user_id = %s",
                    (user_id,),
                )
                res = cursor.fetchone()

        if not res:
            return None

        blob = res.get("api_key") or res.get("api_key_encrypted")
        if not blob:
            return None

        return decrypt(blob)
    finally:
        conn.close()

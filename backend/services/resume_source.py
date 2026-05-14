"""
Resume JSON resolution for WBL (candidate_marketing.candidate_json) vs legacy aiprep_tool_resumes.
session_id is str(candidate_id) for WBL when candidate_id is all digits.
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any, List, Optional

from db.connection import get_db_connection


def is_wbl_candidate_session(session_id: str) -> bool:
    return bool(session_id and session_id.isdigit())


def _parse_json_field(raw: Any) -> Optional[dict]:
    if raw is None:
        return None
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return None
    return None


def fetch_resume_raw(session_id: str) -> Any:
    """Returns raw JSON column value (dict/str) or None."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if is_wbl_candidate_session(session_id):
                cid = int(session_id)
                cursor.execute(
                    """
                    SELECT candidate_json
                    FROM candidate_marketing
                    WHERE candidate_id = %s AND candidate_json IS NOT NULL
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    (cid,),
                )
                row = cursor.fetchone()
                return row["candidate_json"] if row else None
            cursor.execute(
                "SELECT resume_json FROM aiprep_tool_resumes WHERE user_id = %s",
                (session_id,),
            )
            row = cursor.fetchone()
            return row["resume_json"] if row else None
    finally:
        conn.close()


def fetch_resume_dict(session_id: str) -> Optional[dict]:
    raw = fetch_resume_raw(session_id)
    return _parse_json_field(raw)


def save_resume_for_session(session_id: str, resume_data: dict) -> None:
    resume_json_str = json.dumps(resume_data)
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if is_wbl_candidate_session(session_id):
                cid = int(session_id)
                _ensure_candidate_marketing_row(cursor, cid)
                cursor.execute(
                    """
                    SELECT id FROM candidate_marketing
                    WHERE candidate_id = %s
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    (cid,),
                )
                row = cursor.fetchone()
                if row:
                    cursor.execute(
                        """
                        UPDATE candidate_marketing
                        SET candidate_json = %s
                        WHERE id = %s
                        """,
                        (resume_json_str, row["id"]),
                    )
                else:
                    cursor.execute(
                        """
                        INSERT INTO candidate_marketing (candidate_id, start_date, status, candidate_json)
                        VALUES (%s, %s, 'active', %s)
                        """,
                        (cid, date.today(), resume_json_str),
                    )
            else:
                cursor.execute(
                    """
                    INSERT INTO aiprep_tool_resumes (user_id, resume_json)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE resume_json = %s
                    """,
                    (session_id, resume_json_str, resume_json_str),
                )
        conn.commit()
    finally:
        conn.close()


def _ensure_candidate_marketing_row(cursor, candidate_id: int) -> None:
    cursor.execute(
        "SELECT id FROM candidate_marketing WHERE candidate_id = %s LIMIT 1",
        (candidate_id,),
    )
    if cursor.fetchone():
        return
    cursor.execute(
        """
        INSERT INTO candidate_marketing (candidate_id, start_date, status)
        VALUES (%s, %s, 'active')
        """,
        (candidate_id, date.today()),
    )


def count_llm_keys_for_candidate(candidate_id: int) -> int:
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*) AS c FROM candidate_llm_api_keys
                WHERE candidate_id = %s
                """,
                (candidate_id,),
            )
            row = cursor.fetchone()
            return int(row["c"] or 0) if row else 0
    finally:
        conn.close()


def list_llm_keys_for_candidate(candidate_id: int) -> List[dict]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, provider_name, model_name, voice_enabled
                FROM candidate_llm_api_keys
                WHERE candidate_id = %s
                ORDER BY id ASC
                """,
                (candidate_id,),
            )
            return list(cursor.fetchall() or [])
    finally:
        conn.close()


def upsert_llm_api_key_row(
    candidate_id: int,
    provider_name: str,
    encrypted_api_key: str,
    model_name: Optional[str],
    voice_enabled: bool,
) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id FROM candidate_llm_api_keys
                WHERE candidate_id = %s AND provider_name = %s
                LIMIT 1
                """,
                (candidate_id, provider_name),
            )
            row = cursor.fetchone()
            if row:
                cursor.execute(
                    """
                    UPDATE candidate_llm_api_keys
                    SET api_key = %s, model_name = %s, voice_enabled = %s
                    WHERE id = %s
                    """,
                    (encrypted_api_key, model_name or "", int(bool(voice_enabled)), row["id"]),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO candidate_llm_api_keys
                    (candidate_id, provider_name, api_key, model_name, voice_enabled)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        candidate_id,
                        provider_name,
                        encrypted_api_key,
                        model_name or "",
                        int(bool(voice_enabled)),
                    ),
                )
        conn.commit()
    finally:
        conn.close()

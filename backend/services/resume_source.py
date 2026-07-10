"""
Resume JSON resolution for AI Prep Tool.
session_id is always str(candidate_marketing.id).

Primary resume source: candidate_resume.resume_json (keyed by candidate.id)
Fallback resume source: candidate_marketing.candidate_json
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any, List, Optional

from db.connection import get_db_connection


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


def _get_candidate_id_from_marketing(cursor, marketing_id: int) -> Optional[int]:
    """Resolve candidate_marketing.id -> candidate.id."""
    cursor.execute(
        "SELECT candidate_id FROM candidate_marketing WHERE id = %s",
        (marketing_id,),
    )
    row = cursor.fetchone()
    return row["candidate_id"] if row else None


def fetch_resume_raw(session_id: str) -> Any:
    """
    Returns raw JSON column value (dict/str) or None.
    session_id = str(candidate_marketing.id)
    Priority: candidate_resume.resume_json > candidate_marketing.candidate_json
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            marketing_id = int(session_id)
            cid = _get_candidate_id_from_marketing(cursor, marketing_id)
            if not cid:
                return None

            # 1st priority: candidate_resume
            cursor.execute(
                """
                SELECT resume_json
                FROM candidate_resume
                WHERE candidate_id = %s AND resume_json IS NOT NULL
                ORDER BY id DESC
                LIMIT 1
                """,
                (cid,),
            )
            row = cursor.fetchone()
            if row and row["resume_json"]:
                return row["resume_json"]

            # 2nd priority: candidate_marketing.candidate_json
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
    finally:
        conn.close()


def fetch_resume_dict(session_id: str) -> Optional[dict]:
    raw = fetch_resume_raw(session_id)
    return _parse_json_field(raw)


def save_resume_for_session(session_id: str, resume_data: dict) -> None:
    """
    Save resume JSON to candidate_resume (keyed by candidate.id).
    session_id = str(candidate_marketing.id)
    """
    resume_json_str = json.dumps(resume_data)
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            marketing_id = int(session_id)
            cid = _get_candidate_id_from_marketing(cursor, marketing_id)
            if not cid:
                raise ValueError(f"No candidate found for marketing_id={marketing_id}")

            cursor.execute(
                "SELECT id FROM candidate_resume WHERE candidate_id = %s ORDER BY id DESC LIMIT 1",
                (cid,),
            )
            row = cursor.fetchone()
            if row:
                cursor.execute(
                    """
                    UPDATE candidate_resume
                    SET resume_json = %s, updated_at = NOW()
                    WHERE id = %s
                    """,
                    (resume_json_str, row["id"]),
                )
            else:
                file_name = resume_data.get("_meta_filename", f"candidate_{cid}_resume.json")
                cursor.execute(
                    """
                    INSERT INTO candidate_resume (candidate_id, resume_json, file_name, created_at, updated_at)
                    VALUES (%s, %s, %s, NOW(), NOW())
                    """,
                    (cid, resume_json_str, file_name),
                )
        conn.commit()
    finally:
        conn.close()


def count_llm_keys_for_candidate(candidate_id: int) -> int:
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) AS c FROM candidate_llm_api_keys WHERE candidate_id = %s",
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

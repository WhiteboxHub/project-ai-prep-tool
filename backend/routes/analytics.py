# routes/analytics.py
# Admin-facing analytics endpoint for the WBL analytics dashboard.
# Returns per-user AI-Prep usage data: login counts, intro scores, LLM evaluation breakdown.

import json
import logging
from fastapi import APIRouter, HTTPException

from db.connection import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


# ─────────────────────────────────────────────
# Helper: safely parse a JSON field from DB
# ─────────────────────────────────────────────
def _parse_json_field(value):
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return None


# ─────────────────────────────────────────────
# Helper: extract dimension scores from feedback
# ─────────────────────────────────────────────
def _extract_scores(feedback: dict) -> dict:
    """
    LLM feedback JSON structure:
    {
      "scores": {
        "communication_clarity": 8.5,
        "confidence": 7.0,
        "structure": 8.0,
        "professionalism": 9.0,
        "fluency": 7.5,
        "completeness": 8.0,
        "technical_articulation": 7.0,
        "speaking_quality": 7.5
      },
      "overall_score": 79,
      "passed": true,
      "strengths": [...],
      "weaknesses": [...],
      "ai_suggestions": [...],
      "improvement_areas": [...]
    }
    """
    if not feedback or not isinstance(feedback, dict):
        return {}

    raw_scores = feedback.get("scores", {})
    if not isinstance(raw_scores, dict):
        raw_scores = {}

    keys = [
        "communication_clarity", "confidence", "structure", "professionalism",
        "fluency", "completeness", "technical_articulation", "speaking_quality"
    ]
    return {k: float(raw_scores.get(k, 0.0)) for k in keys}


# ─────────────────────────────────────────────
# GET /api/analytics/ai-prep-report
# ─────────────────────────────────────────────
@router.get("/ai-prep-report")
def get_ai_prep_report():
    """
    Returns an aggregated analytics report for all AI-Prep users.
    Intended for WBL admin/employee analytics dashboard.

    No session_id required — this is an admin-level view of all candidates.
    Authentication is handled at the network / deployment level (WBL JWT).
    """
    conn = None
    try:
        conn = get_db_connection()

        with conn.cursor() as cursor:
            # ── 1. Fetch all candidates ──────────────────────────────────────
            # Strategy A: users registered in aiprep_tool_candidates (non-WBL sessions)
            cursor.execute("""
                SELECT
                    c.user_id,
                    c.wbl_email,
                    COALESCE(NULLIF(TRIM(w.full_name), ''), NULLIF(TRIM(c.name), ''), 'Unknown') AS name,
                    COALESCE(c.wbl_email, c.email) AS email,
                    c.role,
                    c.login_count,
                    c.last_login,
                    c.extraction_status,
                    c.created_at
                FROM aiprep_tool_candidates c
                LEFT JOIN candidate w ON c.wbl_email = w.email
                ORDER BY c.last_login DESC
            """)
            candidates_a = [dict(r) for r in cursor.fetchall()]

            # Strategy B: WBL candidates who logged into AI-Prep via candidate_id (numeric session_id)
            # They skip aiprep_tool_candidates entirely, but their evaluations ARE stored.
            # We find distinct numeric user_ids in evaluations not covered by Strategy A.
            existing_uids = {r["user_id"] for r in candidates_a}
            # Build an email-to-index map of candidates_a to detect/merge duplicates
            email_to_idx = {
                r["wbl_email"]: i
                for i, r in enumerate(candidates_a)
                if r.get("wbl_email")
            }

            cursor.execute("""
                SELECT DISTINCT user_id
                FROM aiprep_tool_evaluations
                WHERE user_id REGEXP '^[0-9]+$'
            """)
            numeric_uid_rows = cursor.fetchall()
            missing_wbl_uids = [
                r["user_id"] for r in numeric_uid_rows
                if r["user_id"] not in existing_uids
            ]

            candidates_b = []
            for uid in missing_wbl_uids:
                cid = int(uid)
                cursor.execute(
                    "SELECT id, full_name, email FROM candidate WHERE id = %s",
                    (cid,)
                )
                wbl_row = cursor.fetchone()
                email = wbl_row["email"] if wbl_row else None

                if email and email in email_to_idx:
                    # This WBL candidate already exists in candidates_a via wbl_email.
                    # Replace their old (UUID) user_id with the numeric one so evaluations are matched.
                    idx = email_to_idx[email]
                    candidates_a[idx]["user_id"] = uid
                    existing_uids.add(uid)
                else:
                    # Net-new candidate — only in WBL, no legacy row in aiprep_tool_candidates
                    candidates_b.append({
                        "user_id": uid,
                        "wbl_email": email,
                        "name": wbl_row["full_name"] if wbl_row else f"Candidate #{uid}",
                        "email": email,
                        "role": None,
                        "login_count": 0,
                        "last_login": None,
                        "extraction_status": "wbl",
                        "created_at": None,
                    })
                    if email:
                        email_to_idx[email] = len(candidates_a) + len(candidates_b) - 1

            candidates = list(candidates_a) + candidates_b


            if not candidates:
                return {
                    "total_users": 0,
                    "users_with_intro": 0,
                    "active_last_7_days": 0,
                    "avg_intro_score": 0.0,
                    "pass_rate_pct": 0.0,
                    "users": []
                }

            user_ids = [c["user_id"] for c in candidates]

            # ── 2. Fetch all intro evaluations for these users ────────────────
            # We fetch all rows per user so we can compute best score, latest score,
            # attempt count, and latest feedback JSON (for dimension scores).
            format_placeholders = ",".join(["%s"] * len(user_ids))
            cursor.execute(f"""
                SELECT
                    user_id,
                    score,
                    feedback,
                    created_at
                FROM aiprep_tool_evaluations
                WHERE user_id IN ({format_placeholders})
                  AND type = 'intro'
                ORDER BY user_id, created_at DESC
            """, user_ids)
            all_intro_evals = cursor.fetchall()

        # ── 3. Group evaluations per user ────────────────────────────────────
        from collections import defaultdict
        from datetime import datetime, timezone, timedelta

        evals_by_user = defaultdict(list)
        for row in all_intro_evals:
            evals_by_user[row["user_id"]].append(row)

        now = datetime.now(timezone.utc)
        seven_days_ago = now - timedelta(days=7)

        # ── 4. Build per-user report rows ────────────────────────────────────
        report_rows = []
        total_intro_done = 0
        total_passed = 0
        total_score_sum = 0.0
        total_score_count = 0
        active_last_7d = 0

        for candidate in candidates:
            uid = candidate["user_id"]
            evals = evals_by_user.get(uid, [])

            # Login / activity tracking
            login_count = candidate.get("login_count") or 0
            last_login = candidate.get("last_login")

            # Check if active in last 7 days
            if last_login:
                try:
                    if isinstance(last_login, str):
                        last_login_dt = datetime.fromisoformat(last_login.replace("Z", "+00:00"))
                    else:
                        # datetime object from pymysql
                        last_login_dt = last_login.replace(tzinfo=timezone.utc)
                    if last_login_dt >= seven_days_ago:
                        active_last_7d += 1
                except Exception:
                    pass

            if not evals:
                # Candidate has no intro evaluations yet
                report_rows.append({
                    "session_id": uid,
                    "wbl_email": candidate.get("wbl_email") or candidate.get("email") or "—",
                    "name": candidate.get("name") or "Unknown",
                    "login_count": login_count,
                    "last_active": str(last_login) if last_login else None,
                    "extraction_status": candidate.get("extraction_status") or "pending",
                    "intro_attempts": 0,
                    "intro_best_score": None,
                    "intro_latest_score": None,
                    "intro_passed": False,
                    "last_intro_date": None,
                    "video_url": None,   # Sprint 2: add actual video URL
                    "scores": {},
                    "overall_score": None,
                    "strengths": [],
                    "weaknesses": [],
                    "ai_suggestions": [],
                    "improvement_areas": [],
                    "created_at": str(candidate.get("created_at")) if candidate.get("created_at") else None,
                })
                continue

            # Has at least one intro evaluation
            total_intro_done += 1

            # Scores
            scores = [e["score"] for e in evals if e["score"] is not None]
            best_score = max(scores) if scores else None
            latest_score = evals[0]["score"] if evals else None  # sorted DESC
            attempts = len(evals)
            last_intro_date = evals[0]["created_at"] if evals else None
            passed = (best_score is not None and best_score >= 75)

            if passed:
                total_passed += 1
            if latest_score is not None:
                total_score_sum += latest_score
                total_score_count += 1

            # Parse latest feedback JSON for dimension breakdown
            raw_feedback = evals[0].get("feedback")
            feedback = _parse_json_field(raw_feedback)
            dimension_scores = _extract_scores(feedback) if feedback else {}

            strengths = []
            weaknesses = []
            ai_suggestions = []
            improvement_areas = []

            if feedback:
                strengths = feedback.get("strengths") or []
                weaknesses = feedback.get("weaknesses") or []
                ai_suggestions = feedback.get("ai_suggestions") or []
                improvement_areas = feedback.get("improvement_areas") or []
                # Ensure lists
                if isinstance(strengths, str):
                    strengths = [strengths]
                if isinstance(weaknesses, str):
                    weaknesses = [weaknesses]
                if isinstance(ai_suggestions, str):
                    ai_suggestions = [ai_suggestions]
                if isinstance(improvement_areas, str):
                    improvement_areas = [improvement_areas]

            report_rows.append({
                "session_id": uid,
                "wbl_email": candidate.get("wbl_email") or candidate.get("email") or "—",
                "name": candidate.get("name") or "Unknown",
                "login_count": login_count,
                "last_active": str(last_login) if last_login else None,
                "extraction_status": candidate.get("extraction_status") or "pending",
                "intro_attempts": attempts,
                "intro_best_score": best_score,
                "intro_latest_score": latest_score,
                "intro_passed": passed,
                "last_intro_date": str(last_intro_date) if last_intro_date else None,
                "video_url": None,   # Sprint 2: populate when video storage is added
                "scores": dimension_scores,
                "overall_score": latest_score,
                "strengths": strengths[:5],
                "weaknesses": weaknesses[:5],
                "ai_suggestions": ai_suggestions[:5],
                "improvement_areas": improvement_areas[:5],
                "created_at": str(candidate.get("created_at")) if candidate.get("created_at") else None,
            })

        # ── 5. Summary metrics ───────────────────────────────────────────────
        avg_score = round(total_score_sum / total_score_count, 1) if total_score_count > 0 else 0.0
        pass_rate = round((total_passed / total_intro_done * 100), 1) if total_intro_done > 0 else 0.0

        return {
            "total_users": len(candidates),
            "users_with_intro": total_intro_done,
            "active_last_7_days": active_last_7d,
            "avg_intro_score": avg_score,
            "pass_rate_pct": pass_rate,
            "users": report_rows,
        }

    except Exception as e:
        logger.error("AI-Prep analytics error: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

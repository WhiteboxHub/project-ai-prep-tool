# routes/analytics.py
# Admin-facing analytics endpoint for the WBL analytics dashboard.
# Returns per-user AI-Prep usage data: login counts, intro scores, LLM evaluation breakdown.

import json
import httpx
import logging
from fastapi import APIRouter, HTTPException, Query, Header
from db.connection import get_db_connection
from typing import Optional

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


# ─── Helper: compute prep_status label ───────────────────────────────────────

def _prep_status(has_resume, has_project, intro_passed, interview_completed):
    steps = sum([bool(has_resume), bool(has_project), bool(intro_passed), bool(interview_completed)])
    pct = int(steps / 4 * 100)
    if pct == 100:
        label = "Complete"
    elif pct >= 75:
        label = "Almost Ready"
    elif pct >= 50:
        label = "In Progress"
    elif pct >= 25:
        label = "Just Started"
    else:
        label = "Not Started"
    return pct, label


def _extract_from_resume(resume_json):
    if not resume_json:
        return None, None
    try:
        if isinstance(resume_json, str):
            data = json.loads(resume_json)
        else:
            data = resume_json
    except Exception:
        return None, None

    if not isinstance(data, dict):
        return None, None

    name = None
    email = None

    # Try basics (standard JSON resume)
    basics = data.get("basics") or {}
    if isinstance(basics, dict):
        name = basics.get("name")
        email = basics.get("email")

    # Try personal (WBL resume parser format)
    personal = data.get("personal") or {}
    if isinstance(personal, dict):
        fname = personal.get("first_name") or ""
        lname = personal.get("last_name") or ""
        extracted_name = f"{fname.strip()} {lname.strip()}".strip()
        if extracted_name:
            name = extracted_name
        if personal.get("email"):
            email = personal.get("email")

    # Fallbacks in root
    if not name and data.get("name"):
        name = data.get("name")
    if not email and data.get("email"):
        email = data.get("email")

    return name, email


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


# ─── GET /api/analytics/summary ───────────────────────────────────────────────

@router.get("/summary")
def get_summary(admin_key: Optional[str] = Query(None), x_admin_key: Optional[str] = Header(None)):
    require_admin(admin_key, x_admin_key)
    conn = None
    try:
        conn = get_db_connection()

        with conn.cursor() as cursor:
            # Total active candidates in the prep population.
            cursor.execute("SELECT COUNT(*) AS total FROM candidate_marketing WHERE status = 'active'")
            total_candidates = cursor.fetchone()["total"]

            # Login tracking is no longer stored in aiprep_tool_evaluations.
            active_week = 0

            # Intro pass rate by candidate, based on any passed intro attempt.
            cursor.execute("""
                SELECT COUNT(DISTINCT user_id) AS passed_count
                FROM aiprep_tool_evaluations
                WHERE type = 'intro' AND passed = 1
            """)
            intro_passed_users = cursor.fetchone()["passed_count"]
            intro_pass_rate = round(intro_passed_users / total_candidates * 100, 1) if total_candidates else 0

            # CoderPad adoption (candidates with cache entries)
            cursor.execute("SELECT COUNT(*) AS cp_users FROM aiprep_tool_coderpad_cache WHERE questions_solved > 0")
            cp_users = cursor.fetchone()["cp_users"]
            cp_adoption_rate = round(cp_users / total_candidates * 100, 1) if total_candidates else 0

            # Case studies generated
            cursor.execute("SELECT COUNT(*) AS cs_total FROM aiprep_tool_case_studies")
            case_studies = cursor.fetchone()["cs_total"]

        return {
            "total_candidates": total_candidates,
            "active_this_week": active_week,
            "intro_pass_rate": intro_pass_rate,
            "coderpad_adoption_rate": cp_adoption_rate,
            "total_case_studies": case_studies,
            "intro_passed_count": intro_passed_users,
            "coderpad_active_count": cp_users,
            "interview_completion_rate": 0,
            "interview_completed_count": 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ─── GET /api/analytics/candidates ────────────────────────────────────────────

@router.get("/candidates")
def get_candidates(
    admin_key: Optional[str] = Query(None),
    x_admin_key: Optional[str] = Header(None),
    search: Optional[str] = Query(None),
    filter_intro_passed: Optional[bool] = Query(None),
    filter_has_coderpad: Optional[bool] = Query(None),
    filter_active_week: Optional[bool] = Query(None),
):
    require_admin(admin_key, x_admin_key)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    cm.id              AS marketing_id,
                    cm.candidate_id,
                    c.full_name        AS name,
                    c.email,
                    cm.email           AS wbl_email,
                    0 AS login_count,
                    NULL AS last_login,
                    (
                        SELECT COUNT(*)
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                    ) AS intro_attempts,
                    (
                        SELECT MAX(ev.score)
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                    ) AS best_intro_score,
                    (
                        SELECT ev.score
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                        ORDER BY ev.created_at DESC
                        LIMIT 1
                    ) AS latest_intro_score,
                    (
                        SELECT ev.video_url
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                        ORDER BY ev.created_at DESC
                        LIMIT 1
                    ) AS latest_video_url,
                    (
                        SELECT MAX(ev.passed)
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                    ) AS intro_passed_flag,
                    (
                        SELECT MAX(ev.created_at)
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                    ) AS created_at,

                    -- Resume
                    (SELECT COUNT(*) FROM candidate_resume cr WHERE cr.candidate_id = cm.candidate_id) AS has_resume,
                    (SELECT cr.resume_json FROM candidate_resume cr WHERE cr.candidate_id = cm.candidate_id ORDER BY cr.id DESC LIMIT 1) AS resume_json,

                    -- Project context
                    (SELECT COUNT(*) FROM aiprep_tool_project_context p WHERE p.candidate_id = cm.id) AS has_project,

                    -- Case studies
                    (SELECT COUNT(*) FROM aiprep_tool_case_studies cs WHERE cs.candidate_id = cm.id) AS case_studies_generated,

                    -- CoderPad cache (by wbl_email = cm.email)
                    cp.questions_solved,
                    cp.total_submissions AS cp_total_submissions,
                    cp.pass_rate AS cp_pass_rate,
                    ROUND(COALESCE(cp.total_submissions, 0) * (COALESCE(cp.pass_rate, 0) / 100)) AS coderpad_passed,
                    COALESCE(cp.total_submissions, 0) - ROUND(COALESCE(cp.total_submissions, 0) * (COALESCE(cp.pass_rate, 0) / 100)) AS coderpad_failed,
                    cp.languages_used AS cp_languages,
                    cp.last_synced AS cp_last_synced

                FROM candidate_marketing cm
                JOIN candidate c ON c.id = cm.candidate_id
                LEFT JOIN aiprep_tool_coderpad_cache cp ON cp.wbl_email = cm.email
                WHERE cm.status = 'active'
                ORDER BY created_at DESC
            """)
            rows = cursor.fetchall()

        # Parse JSON fields + compute derived fields
        results = []
        for row in rows:
            # Parse languages JSON
            langs = []
            if row.get("cp_languages"):
                try:
                    langs = json.loads(row["cp_languages"]) if isinstance(row["cp_languages"], str) else row["cp_languages"]
                except Exception:
                    langs = []

            best_intro_score = row.get("best_intro_score") or 0
            latest_intro_score = row.get("latest_intro_score") or 0
            intro_passed = bool(row.get("intro_passed_flag"))
            pct, label = _prep_status(
                row.get("has_resume"),
                row.get("has_project"),
                intro_passed,
                False,  # interview_completed removed from new schema
            )

            def dtstr(v):
                return v.isoformat() if v else None

            resume_name, resume_email = _extract_from_resume(row.get("resume_json"))

            disp_name = row.get("name")
            if (not disp_name or disp_name == "Candidate" or disp_name == "—") and resume_name:
                disp_name = resume_name
            if not disp_name:
                disp_name = "—"

            disp_email = row.get("email")
            if (not disp_email or disp_email == "—") and resume_email:
                disp_email = resume_email
            if not disp_email or disp_email == "—":
                disp_email = row.get("wbl_email") or "—"

            entry = {
                "id": row["marketing_id"],
                "candidate_id": row["candidate_id"],
                "name": disp_name,
                "email": disp_email,
                "wbl_email": row.get("wbl_email") or "—",
                "login_count": row.get("login_count") or 0,
                "created_at": dtstr(row.get("created_at")),
                "last_login": dtstr(row.get("last_login")),
                "extraction_status": "completed",
                # Resume / Project
                "has_resume": bool(row.get("has_resume")),
                "has_project": bool(row.get("has_project")),
                # Intro
                "intro_attempts": row.get("intro_attempts") or 0,
                "best_intro_score": best_intro_score,
                "latest_intro_score": latest_intro_score,
                "intro_score": best_intro_score,
                "intro_status": "completed" if row.get("intro_attempts") else "not_started",
                "intro_passed": intro_passed,
                "latest_video_url": row.get("latest_video_url"),
                "questions_answered": 0,
                "avg_interview_score": 0,
                "interview_sessions": 0,
                "interview_completed": False,
                # Case studies
                "case_studies_generated": row.get("case_studies_generated") or 0,
                # CoderPad
                "coderpad_questions_solved": row.get("questions_solved") or 0,
                "coderpad_total_submissions": row.get("cp_total_submissions") or 0,
                "coderpad_pass_rate": float(row.get("cp_pass_rate") or 0),
                "coderpad_passed": int(row.get("coderpad_passed") or 0),
                "coderpad_failed": int(row.get("coderpad_failed") or 0),
                "coderpad_languages": langs,
                "coderpad_last_synced": dtstr(row.get("cp_last_synced")),
                # Overall
                "prep_completion_pct": pct,
                "prep_status_label": label,
            }
            results.append(entry)

        # ── Filters ──────────────────────────────────────────────────────────
        if search:
            q = search.lower()
            results = [r for r in results if
                q in (r["name"] or "").lower() or
                q in (r["email"] or "").lower() or
                q in (r["wbl_email"] or "").lower()]

        if filter_intro_passed is True:
            results = [r for r in results if r["intro_passed"]]
        elif filter_intro_passed is False:
            results = [r for r in results if not r["intro_passed"]]

        if filter_has_coderpad is True:
            results = [r for r in results if r["coderpad_questions_solved"] > 0]
        elif filter_has_coderpad is False:
            results = [r for r in results if r["coderpad_questions_solved"] == 0]

        if filter_active_week is True:
            from datetime import datetime, timedelta
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            results = [r for r in results if r["last_login"] and r["last_login"] >= week_ago]

        return {"candidates": results, "total": len(results)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ─── GET /api/analytics/candidates/{user_id} ──────────────────────────────────

@router.get("/candidates/{candidate_id}")
def get_candidate_detail(
    candidate_id: int,
    admin_key: Optional[str] = Query(None),
    x_admin_key: Optional[str] = Header(None),
):
    require_admin(admin_key, x_admin_key)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Get candidate info via candidate_marketing
            cursor.execute("""
                SELECT
                    cm.id AS marketing_id,
                    cm.candidate_id,
                    c.full_name AS name,
                    c.email,
                    cm.email AS wbl_email,
                    0 AS login_count,
                    NULL AS last_login,
                    (
                        SELECT MAX(ev.score)
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                    ) AS intro_score,
                    (
                        SELECT ev.video_url
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                        ORDER BY ev.created_at DESC
                        LIMIT 1
                    ) AS intro_video,
                    (
                        SELECT MAX(ev.created_at)
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                    ) AS created_at
                FROM candidate_marketing cm
                JOIN candidate c ON c.id = cm.candidate_id
                WHERE cm.id = %s
            """, (candidate_id,))
            candidate = cursor.fetchone()
            if not candidate:
                raise HTTPException(status_code=404, detail="Candidate not found")

            marketing_id = candidate["marketing_id"]
            cid = candidate["candidate_id"]

            # Resume JSON
            cursor.execute(
                "SELECT resume_json FROM candidate_resume WHERE candidate_id = %s ORDER BY id DESC LIMIT 1",
                (cid,)
            )
            res_row = cursor.fetchone()
            resume_json = res_row["resume_json"] if res_row else None

            # Case studies
            cursor.execute("""
                SELECT topic, created_at
                FROM aiprep_tool_case_studies
                WHERE candidate_id = %s
                ORDER BY created_at DESC
            """, (marketing_id,))
            case_studies = cursor.fetchall()

            cursor.execute("""
                SELECT id, score, passed, video_url, created_at, feedback, raw_response
                FROM aiprep_tool_evaluations
                WHERE user_id = %s AND type = 'intro'
                ORDER BY created_at DESC
            """, (str(marketing_id),))
            intro_history = cursor.fetchall()

            # CoderPad cache
            wbl_email = candidate.get("wbl_email")
            cp_data = None
            if wbl_email:
                cursor.execute(
                    "SELECT * FROM aiprep_tool_coderpad_cache WHERE wbl_email = %s",
                    (wbl_email,)
                )
                cp_data = cursor.fetchone()

        def dtstr(v):
            return v.isoformat() if v else None

        def parse_json_field(v):
            if not v:
                return {}
            if isinstance(v, (dict, list)):
                return v
            try:
                return json.loads(v)
            except Exception:
                return {}

        cp_out = {}
        if cp_data:
            cp_out = {
                "questions_solved": cp_data.get("questions_solved") or 0,
                "total_submissions": cp_data.get("total_submissions") or 0,
                "pass_rate": float(cp_data.get("pass_rate") or 0),
                "languages_used": parse_json_field(cp_data.get("languages_used")),
                "last_synced": dtstr(cp_data.get("last_synced")),
            }

        resume_name, resume_email = _extract_from_resume(resume_json)
        disp_name = candidate.get("name")
        if (not disp_name or disp_name == "Candidate" or disp_name == "—") and resume_name:
            disp_name = resume_name
        if not disp_name:
            disp_name = "—"

        disp_email = candidate.get("email")
        if (not disp_email or disp_email == "—") and resume_email:
            disp_email = resume_email
        if not disp_email or disp_email == "—":
            disp_email = candidate.get("wbl_email") or "—"

        return {
            "candidate": {
                "marketing_id": candidate.get("marketing_id"),
                "candidate_id": candidate.get("candidate_id"),
                "name": disp_name,
                "email": disp_email,
                "wbl_email": candidate.get("wbl_email") or "—",
                "login_count": candidate.get("login_count") or 0,
                "created_at": dtstr(candidate.get("created_at")),
                "last_login": dtstr(candidate.get("last_login")),
                "intro_score": candidate.get("intro_score"),
                "intro_video": candidate.get("intro_video"),
                "intro_status": "completed" if candidate.get("intro_score") is not None else "not_started",
            },
            "intro_history": [
                {
                    "id": row.get("id"),
                    "score": row.get("score"),
                    "passed": bool(row.get("passed")),
                    "video_url": row.get("video_url"),
                    "created_at": dtstr(row.get("created_at")),
                    "feedback": parse_json_field(row.get("feedback")),
                    "raw_response": parse_json_field(row.get("raw_response")),
                }
                for row in intro_history
            ],
            "interview_history": [],
            "case_studies": [{"topic": cs.get("topic"), "created_at": dtstr(cs.get("created_at"))} for cs in case_studies],
            "coderpad": cp_out,
        }

    except Exception as e:
        logger.error("AI-Prep analytics error: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

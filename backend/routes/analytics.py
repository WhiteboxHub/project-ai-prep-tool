"""
backend/routes/analytics.py
Admin analytics API — candidate prep usage, scores, and CoderPad stats.
Protected by a simple ADMIN_KEY header / query param.
"""
import os
import json
import httpx
from fastapi import APIRouter, HTTPException, Query, Header
from db.connection import get_db_connection
from typing import Optional

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

ADMIN_KEY = os.getenv("ADMIN_KEY", "admin-secret-2024")
WBL_API_URL = os.getenv("WBL_API_URL", "")           # e.g. https://wbl-backend-xxx.run.app
WBL_SERVICE_TOKEN = os.getenv("WBL_SERVICE_TOKEN", "") # JWT or service token


# ─── Auth guard ───────────────────────────────────────────────────────────────

def require_admin(admin_key: Optional[str] = Query(None), x_admin_key: Optional[str] = Header(None)):
    key = admin_key or x_admin_key
    if not key or key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing admin key")


# ─── CoderPad cache sync (called internally) ──────────────────────────────────

def _sync_coderpad_for_email(conn, wbl_email: str):
    """
    Fetch CoderPad stats from WBL backend and store in cache table.
    Silently skips if WBL_API_URL is not configured or call fails.
    """
    if not WBL_API_URL or not wbl_email:
        return

    try:
        headers = {}
        if WBL_SERVICE_TOKEN:
            headers["Authorization"] = f"Bearer {WBL_SERVICE_TOKEN}"

        resp = httpx.get(
            f"{WBL_API_URL}/api/analytics/coderpad-stats",
            params={"email": wbl_email},
            headers=headers,
            timeout=5.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO aiprep_tool_coderpad_cache
                        (wbl_email, questions_solved, total_submissions, pass_rate, languages_used)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        questions_solved = VALUES(questions_solved),
                        total_submissions = VALUES(total_submissions),
                        pass_rate = VALUES(pass_rate),
                        languages_used = VALUES(languages_used),
                        last_synced = CURRENT_TIMESTAMP
                """, (
                    wbl_email,
                    data.get("questions_solved", 0),
                    data.get("total_submissions", 0),
                    data.get("pass_rate", 0.0),
                    json.dumps(data.get("languages_used", [])),
                ))
            conn.commit()
    except Exception:
        pass  # Non-blocking — cache is best-effort


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


# ─── GET /api/analytics/ai-prep-report ────────────────────────────────────────
# Called by the WBL frontend AiPrepAnalyticsPanel (uses WBL Bearer JWT, no ADMIN_KEY needed)

@router.get("/ai-prep-report")
def get_ai_prep_report(
    authorization: Optional[str] = Header(None),
    search: Optional[str] = Query(None),
):
    """
    Returns a ReportSummary for the WBL avatar analytics AI-Prep tab.
    Shape expected by AiPrepAnalyticsPanel:
      { total_users, users_with_intro, active_last_7_days, avg_intro_score, pass_rate_pct, users[] }
    Each user row:
      { session_id, wbl_email, name, login_count, last_active, extraction_status,
        intro_attempts, intro_best_score, intro_latest_score, intro_passed,
        last_intro_date, video_url, scores, overall_score,
        strengths, weaknesses, ai_suggestions, improvement_areas, created_at }
    """
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Fetch all candidates from candidate_marketing with aggregated intro eval data
            cursor.execute("""
                SELECT
                    cm.id              AS marketing_id,
                    cm.email           AS wbl_email,
                    c.full_name        AS name,
                    (
                        SELECT COUNT(*)
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                    ) AS intro_attempts,
                    (
                        SELECT MAX(ev.score)
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                    ) AS intro_best_score,
                    (
                        SELECT ev.score
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                        ORDER BY ev.created_at DESC
                        LIMIT 1
                    ) AS intro_latest_score,
                    (
                        SELECT MAX(ev.passed)
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                    ) AS intro_passed_flag,
                    (
                        SELECT ev.video_url
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                        ORDER BY ev.created_at DESC
                        LIMIT 1
                    ) AS latest_video_url,
                    (
                        SELECT ev.feedback
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                        ORDER BY ev.created_at DESC
                        LIMIT 1
                    ) AS latest_feedback,
                    (
                        SELECT ev.raw_response
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                        ORDER BY ev.created_at DESC
                        LIMIT 1
                    ) AS latest_raw_response,
                    (
                        SELECT MAX(ev.created_at)
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR) AND ev.type = 'intro'
                    ) AS last_intro_date,
                    (
                        SELECT MAX(ev.created_at)
                        FROM aiprep_tool_evaluations ev
                        WHERE ev.user_id = CAST(cm.id AS CHAR)
                    ) AS last_active
                FROM candidate_marketing cm
                JOIN candidate c ON c.id = cm.candidate_id
                WHERE cm.status = 'active'
                ORDER BY last_intro_date DESC
            """)
            rows = cursor.fetchall()

        def _parse_json(v):
            if not v:
                return {}
            if isinstance(v, (dict, list)):
                return v
            try:
                return json.loads(v)
            except Exception:
                return {}

        def _extract_scores(feedback, raw_response):
            """Extract dimension scores from feedback or raw_response JSON."""
            scores = {}
            # Try feedback first (structured evaluation result)
            fb = _parse_json(feedback)
            if isinstance(fb, dict):
                # Look for scores dict at top level or nested
                for key in ("scores", "dimension_scores", "dimensions"):
                    if key in fb and isinstance(fb[key], dict):
                        scores = fb[key]
                        break
                if not scores:
                    # Flat scores in feedback dict itself
                    dim_keys = {
                        "communication_clarity", "confidence", "structure",
                        "professionalism", "fluency", "completeness",
                        "technical_articulation", "speaking_quality"
                    }
                    for k in dim_keys:
                        if k in fb:
                            scores[k] = fb[k]

            if not scores:
                rr = _parse_json(raw_response)
                if isinstance(rr, dict):
                    for key in ("scores", "dimension_scores", "dimensions"):
                        if key in rr and isinstance(rr[key], dict):
                            scores = rr[key]
                            break

            return scores

        def _extract_list(feedback, raw_response, *keys):
            """Extract a list field from feedback or raw_response by trying multiple key names."""
            for data in (_parse_json(feedback), _parse_json(raw_response)):
                if not isinstance(data, dict):
                    continue
                for k in keys:
                    val = data.get(k)
                    if isinstance(val, list) and val:
                        return val
            return []

        def dtstr(v):
            return v.isoformat() if v else None

        from datetime import datetime, timedelta
        week_ago = datetime.now() - timedelta(days=7)

        users = []
        total_intro_scores = []
        passed_count = 0
        active_count = 0

        for row in rows:
            intro_attempts = row.get("intro_attempts") or 0
            intro_best_score = row.get("intro_best_score")
            intro_latest_score = row.get("intro_latest_score")
            intro_passed = bool(row.get("intro_passed_flag"))
            last_intro_date = row.get("last_intro_date")
            last_active = row.get("last_active")
            feedback = row.get("latest_feedback")
            raw_response = row.get("latest_raw_response")

            scores = _extract_scores(feedback, raw_response)
            strengths = _extract_list(feedback, raw_response, "strengths", "strength")
            weaknesses = _extract_list(feedback, raw_response, "weaknesses", "weakness", "areas_for_improvement")
            ai_suggestions = _extract_list(feedback, raw_response, "ai_suggestions", "suggestions", "recommendations")
            improvement_areas = _extract_list(feedback, raw_response, "improvement_areas", "improvements")

            # Compute overall score from dimension scores if not directly available
            overall_score = intro_best_score
            if not overall_score and scores:
                vals = [v for v in scores.values() if isinstance(v, (int, float))]
                if vals:
                    overall_score = round(sum(vals) / len(vals), 1)

            if intro_passed:
                passed_count += 1
            if intro_best_score is not None:
                total_intro_scores.append(float(intro_best_score))
            if last_active and last_active > week_ago:
                active_count += 1

            name = row.get("name") or "—"
            wbl_email = row.get("wbl_email") or "—"

            # Apply optional search filter
            if search:
                q = search.lower()
                if q not in name.lower() and q not in wbl_email.lower():
                    continue

            users.append({
                "session_id": str(row["marketing_id"]),
                "wbl_email": wbl_email,
                "name": name,
                "login_count": 0,
                "last_active": dtstr(last_active),
                "extraction_status": "completed",
                "intro_attempts": intro_attempts,
                "intro_best_score": intro_best_score,
                "intro_latest_score": intro_latest_score,
                "intro_passed": intro_passed,
                "last_intro_date": dtstr(last_intro_date),
                "video_url": row.get("latest_video_url"),
                "scores": scores,
                "overall_score": overall_score,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "ai_suggestions": ai_suggestions,
                "improvement_areas": improvement_areas,
                "created_at": dtstr(last_intro_date),
            })

        total_users = len(rows)
        users_with_intro = sum(1 for r in rows if (r.get("intro_attempts") or 0) > 0)
        avg_intro_score = round(sum(total_intro_scores) / len(total_intro_scores), 1) if total_intro_scores else 0
        pass_rate_pct = round(passed_count / users_with_intro * 100, 1) if users_with_intro else 0

        return {
            "total_users": total_users,
            "users_with_intro": users_with_intro,
            "active_last_7_days": active_count,
            "avg_intro_score": avg_intro_score,
            "pass_rate_pct": pass_rate_pct,
            "users": users,
        }

    except Exception as e:
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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ─── POST /api/analytics/sync-coderpad/{user_id} ──────────────────────────────

@router.post("/sync-coderpad/{candidate_id}")
def sync_coderpad(
    candidate_id: int,
    admin_key: Optional[str] = Query(None),
    x_admin_key: Optional[str] = Header(None),
):
    """Trigger a fresh CoderPad sync from WBL for a specific candidate."""
    require_admin(admin_key, x_admin_key)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT email FROM candidate_marketing WHERE id = %s",
                (candidate_id,)
            )
            row = cursor.fetchone()
        if not row or not row.get("email"):
            return {"synced": False, "reason": "No WBL email for this candidate"}
        _sync_coderpad_for_email(conn, row["email"])
        return {"synced": True, "wbl_email": row["email"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

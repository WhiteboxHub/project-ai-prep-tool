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


# ─── GET /api/analytics/summary ───────────────────────────────────────────────

@router.get("/summary")
def get_summary(admin_key: Optional[str] = Query(None), x_admin_key: Optional[str] = Header(None)):
    require_admin(admin_key, x_admin_key)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Total candidates
            cursor.execute("SELECT COUNT(*) AS total FROM aiprep_tool_candidates")
            total_candidates = cursor.fetchone()["total"]

            # Active this week
            cursor.execute("""
                SELECT COUNT(*) AS active
                FROM aiprep_tool_candidates
                WHERE last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            """)
            active_week = cursor.fetchone()["active"]

            # Intro pass rate
            cursor.execute("""
                SELECT
                    COUNT(DISTINCT user_id) AS passed_users
                FROM aiprep_tool_evaluations
                WHERE type = 'intro' AND passed = 1
            """)
            intro_passed_users = cursor.fetchone()["passed_users"]
            intro_pass_rate = round(intro_passed_users / total_candidates * 100, 1) if total_candidates else 0

            # Interview completion rate
            cursor.execute("""
                SELECT COUNT(DISTINCT user_id) AS completed
                FROM aiprep_tool_evaluations
                WHERE type = 'interview_complete'
            """)
            interview_completed = cursor.fetchone()["completed"]
            interview_completion_rate = round(interview_completed / total_candidates * 100, 1) if total_candidates else 0

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
            "interview_completion_rate": interview_completion_rate,
            "coderpad_adoption_rate": cp_adoption_rate,
            "total_case_studies": case_studies,
            "intro_passed_count": intro_passed_users,
            "interview_completed_count": interview_completed,
            "coderpad_active_count": cp_users,
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
    filter_interview_done: Optional[bool] = Query(None),
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
                    c.id,
                    c.user_id,
                    COALESCE(NULLIF(cand.full_name, ''), NULLIF(c.name, '')) AS name,
                    COALESCE(NULLIF(cand.email, ''), NULLIF(c.email, '')) AS email,
                    c.wbl_email,
                    c.login_count,
                    c.created_at,
                    c.last_login,
                    c.extraction_status,

                    -- Resume
                    (SELECT COUNT(*) FROM aiprep_tool_resumes r WHERE r.user_id = c.user_id) AS has_resume,
                    (SELECT r.resume_json FROM aiprep_tool_resumes r WHERE r.user_id = c.user_id) AS resume_json,

                    -- Project
                    (SELECT COUNT(*) FROM aiprep_tool_project_context p WHERE p.user_id = c.user_id) AS has_project,

                    -- Intro attempts
                    (SELECT COUNT(*) FROM aiprep_tool_evaluations e
                     WHERE e.user_id = c.user_id AND e.type = 'intro') AS intro_attempts,

                    -- Best intro score
                    (SELECT MAX(e.score) FROM aiprep_tool_evaluations e
                     WHERE e.user_id = c.user_id AND e.type = 'intro') AS best_intro_score,

                    -- Intro passed (any attempt)
                    (SELECT MAX(CASE WHEN e.passed THEN 1 ELSE 0 END)
                     FROM aiprep_tool_evaluations e
                     WHERE e.user_id = c.user_id AND e.type = 'intro') AS intro_passed,

                    -- Latest intro score
                    (SELECT e.score FROM aiprep_tool_evaluations e
                     WHERE e.user_id = c.user_id AND e.type = 'intro'
                     ORDER BY e.created_at DESC LIMIT 1) AS latest_intro_score,

                    -- Latest video URL
                    (SELECT e.video_url FROM aiprep_tool_evaluations e
                     WHERE e.user_id = c.user_id AND e.type = 'intro' AND e.video_url IS NOT NULL
                     ORDER BY e.created_at DESC LIMIT 1) AS latest_video_url,

                    -- Interview questions answered
                    (SELECT COUNT(*) FROM aiprep_tool_evaluations e
                     WHERE e.user_id = c.user_id AND e.type = 'interview_answer') AS questions_answered,

                    -- Avg interview score (stored as 0-10, * 10 to make /100)
                    (SELECT ROUND(AVG(e.score) * 10, 1) FROM aiprep_tool_evaluations e
                     WHERE e.user_id = c.user_id AND e.type = 'interview_answer') AS avg_interview_score,

                    -- Total interview attempts (sessions)
                    (SELECT COUNT(*) FROM aiprep_tool_evaluations e
                     WHERE e.user_id = c.user_id AND e.type = 'interview_complete') AS interview_sessions,

                    -- Interview completed
                    (SELECT MAX(CASE WHEN e.type = 'interview_complete' THEN 1 ELSE 0 END)
                     FROM aiprep_tool_evaluations e
                     WHERE e.user_id = c.user_id) AS interview_completed,

                    -- Case studies
                    (SELECT COUNT(*) FROM aiprep_tool_case_studies cs
                     WHERE cs.user_id = c.user_id) AS case_studies_generated,

                    -- CoderPad cache
                    cp.questions_solved,
                    cp.total_submissions AS cp_total_submissions,
                    cp.pass_rate AS cp_pass_rate,
                    ROUND(COALESCE(cp.total_submissions, 0) * (COALESCE(cp.pass_rate, 0) / 100)) AS coderpad_passed,
                    COALESCE(cp.total_submissions, 0) - ROUND(COALESCE(cp.total_submissions, 0) * (COALESCE(cp.pass_rate, 0) / 100)) AS coderpad_failed,
                    cp.languages_used AS cp_languages,
                    cp.last_synced AS cp_last_synced

                FROM aiprep_tool_candidates c
                LEFT JOIN candidate cand ON (c.user_id REGEXP '^[0-9]+$' AND CAST(c.user_id AS UNSIGNED) = cand.id) OR cand.email = c.wbl_email OR cand.email = c.email
                LEFT JOIN aiprep_tool_coderpad_cache cp ON cp.wbl_email = c.wbl_email
                ORDER BY c.last_login DESC
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

            pct, label = _prep_status(
                row.get("has_resume"),
                row.get("has_project"),
                row.get("intro_passed"),
                row.get("interview_completed"),
            )

            # Serialize datetimes
            def dtstr(v):
                return v.isoformat() if v else None

            # Attempt to extract candidate name and email from resume_json if missing/generic
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
                "id": row["id"],
                "user_id": row["user_id"],
                "name": disp_name,
                "email": disp_email,
                "wbl_email": row.get("wbl_email") or "—",
                "login_count": row.get("login_count") or 0,
                "created_at": dtstr(row.get("created_at")),
                "last_login": dtstr(row.get("last_login")),
                "extraction_status": row.get("extraction_status") or "pending",
                # Resume / Project
                "has_resume": bool(row.get("has_resume")),
                "has_project": bool(row.get("has_project")),
                # Intro
                "intro_attempts": row.get("intro_attempts") or 0,
                "best_intro_score": row.get("best_intro_score") or 0,
                "latest_intro_score": row.get("latest_intro_score") or 0,
                "intro_passed": bool(row.get("intro_passed")),
                "latest_video_url": row.get("latest_video_url"),
                # Interview
                "questions_answered": row.get("questions_answered") or 0,
                "avg_interview_score": row.get("avg_interview_score") or 0,
                "interview_sessions": row.get("interview_sessions") or 0,
                "interview_completed": bool(row.get("interview_completed")),
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

        if filter_interview_done is True:
            results = [r for r in results if r["interview_completed"]]
        elif filter_interview_done is False:
            results = [r for r in results if not r["interview_completed"]]

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

@router.get("/candidates/{user_id}")
def get_candidate_detail(
    user_id: str,
    admin_key: Optional[str] = Query(None),
    x_admin_key: Optional[str] = Header(None),
):
    require_admin(admin_key, x_admin_key)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Candidate info
            cursor.execute("""
                SELECT 
                    c.*,
                    COALESCE(NULLIF(cand.full_name, ''), NULLIF(c.name, '')) AS joined_name,
                    COALESCE(NULLIF(cand.email, ''), NULLIF(c.email, ''), NULLIF(c.wbl_email, '')) AS joined_email
                FROM aiprep_tool_candidates c
                LEFT JOIN candidate cand ON 
                    (c.user_id REGEXP '^[0-9]+$' AND CAST(c.user_id AS UNSIGNED) = cand.id) 
                    OR cand.email = c.wbl_email 
                    OR cand.email = c.email 
                    OR cand.email = c.name
                WHERE c.user_id = %s
            """, (user_id,))
            candidate = cursor.fetchone()
            if not candidate:
                raise HTTPException(status_code=404, detail="Candidate not found")

            # Get resume JSON if any to extract details
            cursor.execute("SELECT resume_json FROM aiprep_tool_resumes WHERE user_id = %s", (user_id,))
            res_row = cursor.fetchone()
            resume_json = res_row["resume_json"] if res_row else None

            # All intro evaluations (timeline)
            cursor.execute("""
                SELECT score, passed, feedback, created_at
                FROM aiprep_tool_evaluations
                WHERE user_id = %s AND type = 'intro'
                ORDER BY created_at ASC
            """, (user_id,))
            intro_history = cursor.fetchall()

            # All interview answer evaluations
            cursor.execute("""
                SELECT score, feedback, raw_response, created_at
                FROM aiprep_tool_evaluations
                WHERE user_id = %s AND type = 'interview_answer'
                ORDER BY created_at ASC
            """, (user_id,))
            interview_history = cursor.fetchall()

            # Case studies
            cursor.execute("""
                SELECT topic, created_at
                FROM aiprep_tool_case_studies
                WHERE user_id = %s
                ORDER BY created_at DESC
            """, (user_id,))
            case_studies = cursor.fetchall()

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

        # Parse intro history
        intro_list = []
        for e in intro_history:
            intro_list.append({
                "score": e.get("score") or 0,
                "passed": bool(e.get("passed")),
                "feedback": parse_json_field(e.get("feedback")),
                "created_at": dtstr(e.get("created_at")),
            })

        # Parse interview history
        interview_list = []
        for e in interview_history:
            interview_list.append({
                "score": e.get("score") or 0,
                "feedback": parse_json_field(e.get("feedback")),
                "created_at": dtstr(e.get("created_at")),
            })

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
        disp_name = candidate.get("joined_name")
        if (not disp_name or disp_name == "Candidate" or disp_name == "—") and resume_name:
            disp_name = resume_name
        if not disp_name:
            disp_name = "—"

        disp_email = candidate.get("joined_email")
        if (not disp_email or disp_email == "—") and resume_email:
            disp_email = resume_email
        if not disp_email or disp_email == "—":
            disp_email = candidate.get("wbl_email") or "—"

        return {
            "candidate": {
                "user_id": candidate.get("user_id"),
                "name": disp_name,
                "email": disp_email,
                "wbl_email": candidate.get("wbl_email") or "—",
                "login_count": candidate.get("login_count") or 0,
                "created_at": dtstr(candidate.get("created_at")),
                "last_login": dtstr(candidate.get("last_login")),
            },
            "intro_history": intro_list,
            "interview_history": interview_list,
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

@router.post("/sync-coderpad/{user_id}")
def sync_coderpad(
    user_id: str,
    admin_key: Optional[str] = Query(None),
    x_admin_key: Optional[str] = Header(None),
):
    """Trigger a fresh CoderPad sync from WBL for a specific candidate."""
    require_admin(admin_key, x_admin_key)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT wbl_email FROM aiprep_tool_candidates WHERE user_id = %s", (user_id,))
            row = cursor.fetchone()
        if not row or not row.get("wbl_email"):
            return {"synced": False, "reason": "No WBL email for this candidate"}
        _sync_coderpad_for_email(conn, row["wbl_email"])
        return {"synced": True, "wbl_email": row["wbl_email"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

import json
import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_candidate
from db.connection import get_db_connection

def test_youtube_status(client: TestClient):
    # Arrange: Endpoint URL
    endpoint = "/api/youtube/status"

    # Act: GET /api/youtube/status
    response = client.get(endpoint)

    # Assert: Check status 200 and configured field in JSON
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data
    assert isinstance(data["configured"], bool)


def test_analytics_ai_prep_report(client: TestClient):
    # Arrange: Seed candidate and intro evaluation in DB
    candidate_info = create_test_candidate("yt_analytics@example.com", "Analytics Candidate")
    mid = str(candidate_info["marketing_id"])

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO aiprep_tool_evaluations
               (user_id, type, score, passed, feedback, raw_response, video_url)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                mid,
                "intro",
                92,
                True,
                json.dumps({"strengths": ["Excellent confidence"], "scores": {"confidence": 92}}),
                json.dumps({"transcript": "Analytics transcript"}),
                "https://youtube.com/watch?v=sample123"
            )
        )
    conn.commit()
    conn.close()

    # Act: GET /api/analytics/ai-prep-report
    response = client.get("/api/analytics/ai-prep-report")

    # Assert: Validate response structure and aggregated user metrics
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "users_with_intro" in data
    assert "active_last_7_days" in data
    assert "avg_intro_score" in data
    assert "pass_rate_pct" in data
    assert "users" in data
    assert isinstance(data["users"], list)


def test_analytics_summary_auth(client: TestClient):
    # Arrange: Admin key and endpoints
    valid_key = "admin-wbl-2024"

    # Act 1: GET /api/analytics/summary without admin key
    unauth_resp = client.get("/api/analytics/summary")

    # Assert 1: Returns 403 Forbidden
    assert unauth_resp.status_code == 403
    assert unauth_resp.json()["detail"] == "Invalid or missing admin key"

    # Act 2: GET /api/analytics/summary with valid admin key
    auth_resp = client.get(f"/api/analytics/summary?admin_key={valid_key}")

    # Assert 2: Returns 200 OK and analytics summary metrics
    assert auth_resp.status_code == 200
    data = auth_resp.json()
    assert "total_candidates" in data
    assert "intro_pass_rate" in data
    assert "coderpad_adoption_rate" in data
    assert "total_case_studies" in data


def test_analytics_candidates_auth(client: TestClient):
    # Arrange: Admin key and endpoints
    valid_key = "admin-wbl-2024"

    # Act 1: GET /api/analytics/candidates without admin key
    unauth_resp = client.get("/api/analytics/candidates")

    # Assert 1: Returns 403 Forbidden
    assert unauth_resp.status_code == 403

    # Act 2: GET /api/analytics/candidates with valid admin key
    auth_resp = client.get(f"/api/analytics/candidates?admin_key={valid_key}")

    # Assert 2: Returns 200 OK and list of candidates
    assert auth_resp.status_code == 200
    data = auth_resp.json()
    assert "candidates" in data
    assert "total" in data
    assert isinstance(data["candidates"], list)

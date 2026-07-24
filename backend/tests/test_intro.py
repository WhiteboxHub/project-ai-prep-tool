import json
import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_candidate
from db.connection import get_db_connection

def test_intro_dynamic_template_uninitialized(client: TestClient):
    # Arrange: Uninitialized session_id without API key configured
    session_id = "99901"

    # Act: GET /api/intro/dynamic-template
    response = client.get(f"/api/intro/dynamic-template?session_id={session_id}")

    # Assert: Should fail cleanly with 500 when API key is missing
    assert response.status_code == 500
    assert response.json()["detail"] == "Template generation failed"


def test_intro_evaluate_text_uninitialized(client: TestClient):
    # Arrange: Form payload for text intro evaluation without API key
    payload = {
        "session_id": "99902",
        "transcript": "Hello, my name is Alex and I am a Senior AI Engineer with 5 years experience.",
        "intro_type": "general"
    }

    # Act: POST /api/intro/evaluate-text
    response = client.post("/api/intro/evaluate-text", data=payload)

    # Assert: Should fail with 500 due to missing API key
    assert response.status_code == 500
    assert "detail" in response.json()
    assert "Evaluation failed" in response.json()["detail"]


def test_intro_history(client: TestClient):
    # Arrange: Create test candidate and insert mock evaluation history rows in DB
    candidate_info = create_test_candidate("intro_hist@example.com", "Intro Hist User")
    session_id = str(candidate_info["marketing_id"])

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO aiprep_tool_evaluations
               (user_id, type, score, passed, feedback, raw_response, video_url)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                session_id,
                "intro",
                85,
                True,
                json.dumps({"strengths": ["Good clarity", "Structured STAR format"], "weaknesses": []}),
                json.dumps({"transcript": "Sample transcript", "score": 85}),
                "http://example.com/video.webm"
            )
        )
    conn.commit()
    conn.close()

    # Act: GET /api/intro/history
    response = client.get(f"/api/intro/history?session_id={session_id}")

    # Assert: Validate response structure and aggregated metrics
    assert response.status_code == 200
    data = response.json()
    assert "history" in data
    assert "best_score" in data
    assert "latest_score" in data
    assert "passed" in data
    assert "pagination" in data
    assert data["best_score"] == 85
    assert data["passed"] is True
    assert len(data["history"]) >= 1


def test_intro_attempt_by_id(client: TestClient):
    # Arrange: Create candidate and insert single evaluation row
    candidate_info = create_test_candidate("intro_attempt@example.com", "Intro Attempt User")
    session_id = str(candidate_info["marketing_id"])

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO aiprep_tool_evaluations
               (user_id, type, score, passed, feedback, raw_response, video_url)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                session_id,
                "intro_jd",
                90,
                True,
                json.dumps({"strengths": ["JD alignment"]}),
                json.dumps({"transcript": "JD transcript"}),
                "http://example.com/jd_video.mp4"
            )
        )
        attempt_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Act 1: GET /api/intro/history/{attempt_id} for valid attempt
    valid_resp = client.get(f"/api/intro/history/{attempt_id}?session_id={session_id}")

    # Assert 1: Returns correct attempt detail
    assert valid_resp.status_code == 200
    valid_data = valid_resp.json()
    assert valid_data["id"] == attempt_id
    assert valid_data["user_id"] == session_id
    assert valid_data["score"] == 90
    assert valid_data["passed"] is True

    # Act 2: GET /api/intro/history/999999 for non-existent attempt
    invalid_resp = client.get(f"/api/intro/history/999999?session_id={session_id}")

    # Assert 2: Returns 404 Not Found
    assert invalid_resp.status_code == 404
    assert invalid_resp.json()["detail"] == "Intro attempt not found"

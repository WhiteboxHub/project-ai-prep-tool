import json
import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_candidate
from db.connection import get_db_connection

def test_get_stage_questions_uninitialized(client: TestClient):
    # Arrange: Uninitialized session_id without API key
    session_id = "99903"
    stage_name = "System Design"

    # Act: GET /api/interview/stage-questions
    response = client.get(f"/api/interview/stage-questions?session_id={session_id}&stage_name={stage_name}")

    # Assert: Fails cleanly with 500 when API key is missing
    assert response.status_code == 500
    assert "detail" in response.json()


def test_evaluate_live_uninitialized(client: TestClient):
    # Arrange: Live evaluation request without API key
    payload = {
        "session_id": "99904",
        "current_question": "Explain RAG architecture and chunking strategies.",
        "user_answer": "RAG chunks text, stores embeddings in vector DB, and retrieves relevant chunks for LLM prompt context.",
        "stage_name": "Technical"
    }

    # Act: POST /api/interview/evaluate-live
    response = client.post("/api/interview/evaluate-live", json=payload)

    # Assert: Fails cleanly with 500 when API key is missing
    assert response.status_code == 500
    assert "detail" in response.json()


def test_complete_interview_uninitialized(client: TestClient):
    # Arrange: Candidate setup without API key
    candidate_info = create_test_candidate("interview_comp@example.com", "Interview Comp User")
    mid = str(candidate_info["marketing_id"])
    cid = candidate_info["candidate_id"]

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO aiprep_tool_project_context
               (candidate_id, product, architecture, role, company_name, domain)
               VALUES (%s, %s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE product=VALUES(product)""",
            (cid, "AI Agent System", "Multi-Agent", "Lead Engineer", "TechCorp", "AI")
        )
    conn.commit()
    conn.close()

    payload = {"session_id": mid}

    # Act: POST /api/interview/complete
    response = client.post("/api/interview/complete", json=payload)

    # Assert: Returns 500 due to missing API key
    assert response.status_code == 500
    assert "detail" in response.json()


def test_get_final_report(client: TestClient):
    # Arrange: Seed candidate, project context, intro evaluation, and completion attempt
    candidate_info = create_test_candidate("final_report@example.com", "Final Report User")
    mid = str(candidate_info["marketing_id"])
    cid = candidate_info["candidate_id"]

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO aiprep_tool_project_context
               (candidate_id, product, architecture, role, company_name, domain)
               VALUES (%s, %s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE product=VALUES(product)""",
            (cid, "Smart Portal", "Serverless", "Architect", "FinCorp", "Finance")
        )
        cursor.execute(
            """INSERT INTO aiprep_tool_evaluations
               (user_id, type, score, passed, feedback, raw_response)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (mid, "intro", 88, True, json.dumps({"strengths": ["Great articulation"]}), json.dumps({}))
        )
        cursor.execute(
            """INSERT INTO aiprep_tool_attempts
               (candidate_id, attempt_type, attempt_count)
               VALUES (%s, %s, %s)
               ON DUPLICATE KEY UPDATE attempt_count = attempt_count + 1""",
            (cid, "interview_complete", 1)
        )
    conn.commit()
    conn.close()

    # Act: GET /api/report/
    response = client.get(f"/api/report/?session_id={mid}")

    # Assert: Validate complete report payload structure and completion status
    assert response.status_code == 200
    data = response.json()
    assert "resume" in data
    assert "project" in data
    assert "intro_evals" in data
    assert "interview_evals" in data
    assert "interview_complete" in data
    assert data["interview_complete"] is True
    assert data["project"]["product"] == "Smart Portal"

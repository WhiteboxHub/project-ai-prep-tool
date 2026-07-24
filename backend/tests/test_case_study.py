import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_candidate
from db.connection import get_db_connection
from utils.security import encrypt

def test_generate_typed_case_study_uninitialized(client: TestClient):
    # Arrange: Candidate setup without API key
    candidate_info = create_test_candidate("cs_uninit@example.com", "CS Uninit User")
    mid = str(candidate_info["marketing_id"])
    payload = {
        "session_id": mid,
        "case_type": "rag"
    }

    # Act: POST /api/case-study/generate-typed
    response = client.post("/api/case-study/generate-typed", json=payload)

    # Assert: Fails with 401 when API key is missing
    assert response.status_code == 401
    assert "detail" in response.json()
    assert "API key not found" in response.json()["detail"]


def test_generate_typed_case_study_invalid_type(client: TestClient):
    # Arrange: Candidate setup with dummy key in DB
    candidate_info = create_test_candidate("cs_invalid_type@example.com", "CS Invalid Type User")
    mid = str(candidate_info["marketing_id"])
    cid = candidate_info["candidate_id"]

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO candidate_llm_api_keys (candidate_id, provider_name, api_key, model_name)
               VALUES (%s, %s, %s, %s)""",
            (cid, "openai", encrypt("sk-dummykey1234567890"), "gpt-4o")
        )
    conn.commit()
    conn.close()

    payload = {
        "session_id": mid,
        "case_type": "unknown_type_xyz"
    }

    # Act: POST /api/case-study/generate-typed
    response = client.post("/api/case-study/generate-typed", json=payload)

    # Assert: Returns 400 Bad Request for unknown case_type
    assert response.status_code == 400
    assert "Unknown case_type" in response.json()["detail"]


def test_case_study_history(client: TestClient):
    # Arrange: Seed candidate and insert typed case study record into DB
    candidate_info = create_test_candidate("cs_history@example.com", "CS History User")
    mid = str(candidate_info["marketing_id"])
    cid = candidate_info["candidate_id"]

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO aiprep_tool_case_studies (candidate_id, user_id, topic, content)
               VALUES (%s, %s, %s, %s)""",
            (cid, mid, "RAG Case Study", "## 1. BUSINESS PROBLEM & OBJECTIVES\nEnterprise RAG architecture.")
        )
        cs_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Act: GET /api/case-study/history
    response = client.get(f"/api/case-study/history?session_id={mid}")

    # Assert: Returns case study history matching inserted record
    assert response.status_code == 200
    data = response.json()
    assert "case_studies" in data
    studies = data["case_studies"]
    assert len(studies) >= 1
    target = next((s for s in studies if s["id"] == cs_id), None)
    assert target is not None
    assert target["topic"] == "RAG Case Study"
    assert "Enterprise RAG architecture" in target["content"]

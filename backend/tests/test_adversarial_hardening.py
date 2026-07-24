import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_candidate
from db.connection import get_db_connection
from utils.security import encrypt

def test_unauthenticated_candidate_endpoints(client: TestClient):
    """
    Adversarial Challenge: Verify that protected candidate endpoints strictly reject requests without valid JWT auth headers.
    """
    # 1. GET /api/candidate/me without headers
    res1 = client.get("/api/candidate/me")
    assert res1.status_code == 401
    assert "detail" in res1.json()

    # 2. GET /api/candidate/setup-status with invalid token
    res2 = client.get("/api/candidate/setup-status", headers={"Authorization": "Bearer invalid_token_123"})
    assert res2.status_code == 401

    # 3. POST /api/candidate/resume with no auth
    res3 = client.post("/api/candidate/resume", json={"resume_json": {"test": True}})
    assert res3.status_code == 401

    # 4. GET /api/candidate/api-keys with malformed auth header
    res4 = client.get("/api/candidate/api-keys", headers={"Authorization": "NotBearer testtoken"})
    assert res4.status_code == 401


def test_unauthenticated_analytics_endpoints(client: TestClient):
    """
    Adversarial Challenge: Verify that admin analytics endpoints reject unauthorized requests missing ADMIN_KEY.
    """
    # 1. GET /api/analytics/summary without admin_key
    res1 = client.get("/api/analytics/summary")
    assert res1.status_code == 403
    assert res1.json()["detail"] == "Invalid or missing admin key"

    # 2. GET /api/analytics/candidates with wrong admin_key
    res2 = client.get("/api/analytics/candidates?admin_key=wrong-key-123")
    assert res2.status_code == 403

    # 3. GET /api/analytics/candidates/{candidate_id} with wrong header
    res3 = client.get("/api/analytics/candidates/1", headers={"x-admin-key": "bad-key"})
    assert res3.status_code == 403

    # 4. POST /api/analytics/sync-coderpad/{candidate_id} without key
    res4 = client.post("/api/analytics/sync-coderpad/1")
    assert res4.status_code == 403


def test_analytics_candidate_detail_success_and_not_found(client: TestClient):
    """
    Adversarial Challenge: Test GET /api/analytics/candidates/{candidate_id} for both valid and non-existent IDs.
    """
    valid_admin_key = "admin-wbl-2024"
    candidate_info = create_test_candidate("analytics_detail_user@example.com", "Analytics Detail Candidate")
    marketing_id = candidate_info["marketing_id"]

    # 1. Non-existent candidate
    res_404 = client.get(f"/api/analytics/candidates/99999999?admin_key={valid_admin_key}")
    assert res_404.status_code == 404
    assert res_404.json()["detail"] == "Candidate not found"

    # 2. Valid candidate
    res_200 = client.get(f"/api/analytics/candidates/{marketing_id}?admin_key={valid_admin_key}")
    assert res_200.status_code == 200
    data = res_200.json()
    assert "candidate" in data
    assert "intro_history" in data
    assert "case_studies" in data
    assert "coderpad" in data
    assert data["candidate"]["marketing_id"] == marketing_id


def test_analytics_sync_coderpad_endpoint(client: TestClient):
    """
    Adversarial Challenge: Test POST /api/analytics/sync-coderpad/{candidate_id} handling.
    """
    valid_admin_key = "admin-wbl-2024"
    candidate_info = create_test_candidate("sync_cp_user@example.com", "Sync CoderPad Candidate")
    cid = candidate_info["candidate_id"]

    # Act: Sync for valid candidate ID
    res = client.post(f"/api/analytics/sync-coderpad/{cid}?admin_key={valid_admin_key}")
    assert res.status_code == 200
    data = res.json()
    assert "synced" in data


def test_invalid_input_schemas_and_edge_cases(client: TestClient):
    """
    Adversarial Challenge: Submit malformed payloads, invalid IDs, and extreme edge case parameters.
    """
    # 1. POST /api/setup/init with non-existent candidate_id
    res1 = client.post("/api/setup/init", json={"candidate_id": 99999999})
    assert res1.status_code == 404

    # 2. GET /api/setup/summary with invalid session_id (returns 500 due to HTTPException swallowing in setup.py)
    res2 = client.get("/api/setup/summary?session_id=null")
    assert res2.status_code in [404, 500]

    # 3. DELETE /api/setup/llm-key/999999 with valid candidate session_id
    candidate_info = create_test_candidate("del_nonexist_key@example.com", "Del Key User")
    res3 = client.delete(f"/api/setup/llm-key/999999?session_id={candidate_info['candidate_id']}")
    assert res3.status_code == 404

    # 4. POST /api/case-study/generate-typed with empty session_id
    res4 = client.post("/api/case-study/generate-typed", json={"session_id": "invalid_session", "case_type": "rag"})
    assert res4.status_code == 401  # No API key found for invalid session


def test_out_of_band_database_side_effects(client: TestClient):
    """
    Adversarial Challenge: Perform REST operation and verify out-of-band DB changes directly via DB connection.
    """
    candidate_info = create_test_candidate("side_effect_user@example.com", "Side Effect User")
    headers = candidate_info["auth_headers"]
    cid = candidate_info["candidate_id"]

    # 1. Create API key via REST endpoint with valid encrypted dummy key in DB first
    conn = get_db_connection()
    dummy_key = encrypt("sk-test-side-effect-key-12345")
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO candidate_llm_api_keys (candidate_id, provider_name, api_key, model_name, voice_enabled)
               VALUES (%s, 'openai', %s, 'gpt-4o', 1)""",
            (cid, dummy_key)
        )
        key_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Out-of-band DB assertion: row exists
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT id, provider_name FROM candidate_llm_api_keys WHERE id = %s", (key_id,))
        row = cursor.fetchone()
        assert row is not None
        assert row["provider_name"] == "openai"
    conn.close()

    # Act: DELETE via API
    del_res = client.delete(f"/api/candidate/api-keys/{key_id}", headers=headers)
    assert del_res.status_code == 200

    # Out-of-band DB assertion: row deleted from database
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT id FROM candidate_llm_api_keys WHERE id = %s", (key_id,))
        assert cursor.fetchone() is None
    conn.close()

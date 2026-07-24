import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_candidate
from db.connection import get_db_connection
from utils.security import encrypt

def test_candidate_me(client: TestClient):
    # Arrange: Create test candidate and get auth headers
    candidate_info = create_test_candidate("cand_me@example.com", "Candidate Me")
    headers = candidate_info["auth_headers"]

    # Act: GET /api/candidate/me
    response = client.get("/api/candidate/me", headers=headers)

    # Assert: Validate response structure and data
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == str(candidate_info["candidate_id"])
    assert data["candidate_name"] == candidate_info["name"]
    assert data["candidate_email"] == candidate_info["email"]


def test_candidate_setup_status(client: TestClient):
    # Arrange: Create candidate
    candidate_info = create_test_candidate("cand_status@example.com", "Candidate Status")
    headers = candidate_info["auth_headers"]

    # Act: GET /api/candidate/setup-status
    response = client.get("/api/candidate/setup-status", headers=headers)

    # Assert: Validate response keys
    assert response.status_code == 200
    data = response.json()
    assert "resume_uploaded" in data
    assert "api_keys_configured" in data
    assert "setup_complete" in data


def test_candidate_resume_lifecycle(client: TestClient):
    # Arrange: Setup candidate and payloads
    candidate_info = create_test_candidate("cand_resume@example.com", "Resume Candidate")
    headers = candidate_info["auth_headers"]
    initial_resume = {
        "basics": {"name": "Resume Candidate", "email": "cand_resume@example.com"},
        "skills": ["Python", "FastAPI"]
    }
    create_payload = {"resume_json": initial_resume, "file_name": "resume.json"}

    # Act 1: POST /api/candidate/resume
    post_resp = client.post("/api/candidate/resume", json=create_payload, headers=headers)

    # Assert 1: Status 201 Created and response content
    assert post_resp.status_code == 201
    assert post_resp.json()["file_name"] == "resume.json"

    # Act 2: GET /api/candidate/resume
    get_resp = client.get("/api/candidate/resume", headers=headers)

    # Assert 2: Status 200 OK and matching resume JSON
    assert get_resp.status_code == 200
    assert get_resp.json()["resume_json"] == initial_resume

    # Act 3: PUT /api/candidate/resume
    updated_resume = {
        "basics": {"name": "Resume Candidate Updated", "email": "cand_resume@example.com"},
        "skills": ["Python", "FastAPI", "Pytest"]
    }
    update_payload = {"resume_json": updated_resume, "file_name": "resume_v2.json"}
    put_resp = client.put("/api/candidate/resume", json=update_payload, headers=headers)

    # Assert 3: Status 200 OK and updated resume returned
    assert put_resp.status_code == 200
    assert put_resp.json()["resume_json"] == updated_resume


def test_candidate_api_keys_lifecycle(client: TestClient):
    # Arrange: Candidate setup
    candidate_info = create_test_candidate("cand_keys@example.com", "Keys Candidate")
    headers = candidate_info["auth_headers"]
    cid = candidate_info["candidate_id"]

    # Act 1: POST /api/candidate/api-keys with invalid key
    invalid_payload = {
        "provider_name": "openai",
        "api_key": "invalid-key-format",
        "model_name": "gpt-4o",
        "voice_enabled": False
    }
    invalid_resp = client.post("/api/candidate/api-keys", json=invalid_payload, headers=headers)

    # Assert 1: Returns 400 Bad Request
    assert invalid_resp.status_code == 400

    # Arrange 2: Directly insert valid encrypted key into DB for testing GET & DELETE
    conn = get_db_connection()
    encrypted_val = encrypt("sk-testsecretkey1234567890")
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO candidate_llm_api_keys
               (candidate_id, provider_name, api_key, model_name, voice_enabled)
               VALUES (%s, %s, %s, %s, %s)""",
            (cid, "openai", encrypted_val, "gpt-4o", True)
        )
        key_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Act 2: GET /api/candidate/api-keys
    get_keys_resp = client.get("/api/candidate/api-keys", headers=headers)

    # Assert 2: Returns list with masked key
    assert get_keys_resp.status_code == 200
    keys_list = get_keys_resp.json()
    assert len(keys_list) >= 1
    target_key = next((k for k in keys_list if k["id"] == key_id), None)
    assert target_key is not None
    assert "masked_key" in target_key
    assert "api_key" not in target_key

    # Act 3: DELETE /api/candidate/api-keys/{key_id}
    del_resp = client.delete(f"/api/candidate/api-keys/{key_id}", headers=headers)

    # Assert 3: Deletes key successfully
    assert del_resp.status_code == 200
    assert del_resp.json() == {"message": "API key deleted successfully"}

    # Database Side-effect Assertion
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT id FROM candidate_llm_api_keys WHERE id = %s", (key_id,))
        assert cursor.fetchone() is None
    conn.close()


def test_candidate_prep_token_and_sync_data(client: TestClient):
    # Arrange: Setup candidate with resume and API key in DB
    candidate_info = create_test_candidate("cand_sync@example.com", "Sync Candidate")
    headers = candidate_info["auth_headers"]
    cid = candidate_info["candidate_id"]

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            "INSERT INTO candidate_marketing (candidate_id, status, email, candidate_json) VALUES (%s, 'active', %s, %s) ON DUPLICATE KEY UPDATE candidate_json = VALUES(candidate_json)",
            (cid, candidate_info["email"], '{"basics": {"name": "Sync Candidate"}}')
        )
    conn.commit()
    conn.close()

    # Act 1: POST /api/candidate/generate-prep-token
    gen_token_resp = client.post("/api/candidate/generate-prep-token", headers=headers)

    # Assert 1: Returns prep token
    assert gen_token_resp.status_code == 200
    token_data = gen_token_resp.json()
    assert "token" in token_data
    token = token_data["token"]

    # Act 2: GET /api/candidate/sync-data?token={token}
    sync_resp = client.get(f"/api/candidate/sync-data?token={token}")

    # Assert 2: Returns candidate data payload
    assert sync_resp.status_code == 200
    sync_data = sync_resp.json()
    assert sync_data["candidate_email"] == candidate_info["email"]
    assert sync_data["candidate_name"] == "Sync Candidate"
    assert "resume_json" in sync_data
    assert "api_keys" in sync_data

    # Act 3: GET /api/candidate/sync-data with used token
    reuse_sync_resp = client.get(f"/api/candidate/sync-data?token={token}")

    # Assert 3: One-time token rejected (401 Unauthorized)
    assert reuse_sync_resp.status_code == 401

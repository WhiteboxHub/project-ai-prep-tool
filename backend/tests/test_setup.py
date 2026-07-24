import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_candidate
from db.connection import get_db_connection

def test_health_check(client: TestClient):
    # Arrange: Endpoint path
    endpoint = "/health"

    # Act: Perform GET request
    response = client.get(endpoint)

    # Assert: Validate status code and JSON schema
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_endpoint(client: TestClient):
    # Arrange: Endpoint path
    endpoint = "/"

    # Act: Perform GET request
    response = client.get(endpoint)

    # Assert: Validate response structure
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["message"] == "AI Candidate Evaluation System Online"
    assert data["version"] == "2.0.0"


def test_setup_init(client: TestClient):
    # Arrange: Create test candidate and payload
    candidate_info = create_test_candidate("setup_init_user@example.com", "Init User")
    payload = {"candidate_id": candidate_info["candidate_id"]}

    # Act: POST to /api/setup/init
    response = client.post("/api/setup/init", json=payload)

    # Assert: Check session_id is returned matching candidate_marketing ID
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["session_id"] == str(candidate_info["marketing_id"])


def test_setup_validate_invalid_key(client: TestClient):
    # Arrange: Prepare candidate and invalid validation request
    candidate_info = create_test_candidate("setup_val_user@example.com", "Val User")
    payload = {
        "api_key": "sk-invalidkeyformat123456",
        "api_provider": "openai",
        "session_id": str(candidate_info["candidate_id"]),
        "model_name": "gpt-4o",
        "voice_enabled": True
    }

    # Act: POST to /api/setup/validate
    response = client.post("/api/setup/validate", json=payload)

    # Assert: Reject invalid key (status code 400)
    assert response.status_code == 400
    assert "detail" in response.json()


def test_setup_summary(client: TestClient):
    # Arrange: Create candidate
    candidate_info = create_test_candidate("setup_summary_user@example.com", "Summary User")
    session_id = str(candidate_info["marketing_id"])

    # Act: GET /api/setup/summary
    response = client.get(f"/api/setup/summary?session_id={session_id}")

    # Assert: Validate JSON summary structure
    assert response.status_code == 200
    data = response.json()
    assert "candidate_name" in data
    assert "candidate_email" in data
    assert "has_api_key" in data
    assert "llm_keys" in data


def test_setup_extraction_status(client: TestClient):
    # Arrange: Session ID
    candidate_info = create_test_candidate("setup_ext_user@example.com", "Ext User")
    session_id = str(candidate_info["candidate_id"])

    # Act: GET /api/setup/extraction-status
    response = client.get(f"/api/setup/extraction-status?session_id={session_id}")

    # Assert: Validate extraction status
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["completed", "pending", "failed"]


def test_setup_init_and_summary(client: TestClient):
    # Arrange: Candidate ID payload
    candidate_info = create_test_candidate("setup_initsum_user@example.com", "InitSum User")
    payload = {"candidate_id": candidate_info["candidate_id"]}

    # Act: POST /api/setup/init-and-summary
    response = client.post("/api/setup/init-and-summary", json=payload)

    # Assert: Validate response structure
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert "summary" in data
    assert data["session_id"] == str(candidate_info["marketing_id"])


def test_setup_delete_llm_key(client: TestClient):
    # Arrange: Insert candidate and a test API key row into DB
    candidate_info = create_test_candidate("setup_delkey_user@example.com", "DelKey User")
    cid = candidate_info["candidate_id"]
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            "INSERT INTO candidate_llm_api_keys (candidate_id, provider_name, api_key, model_name) VALUES (%s, %s, %s, %s)",
            (cid, "openai", "encrypted_dummy_key", "gpt-4o")
        )
        key_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Act: DELETE /api/setup/llm-key/{key_id}
    response = client.delete(f"/api/setup/llm-key/{key_id}?session_id={cid}")

    # Assert: Returns 200 and key deleted from DB
    assert response.status_code == 200
    assert response.json() == {"ok": True, "message": "API key deleted"}

    # Database Side-effect Assertion
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT id FROM candidate_llm_api_keys WHERE id = %s", (key_id,))
        assert cursor.fetchone() is None
    conn.close()

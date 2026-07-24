import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_candidate
from db.connection import get_db_connection

def test_save_and_evaluate_project_uninitialized(client: TestClient):
    # Arrange: Candidate setup without API key in DB
    candidate_info = create_test_candidate("proj_eval_uninit@example.com", "Proj Uninit User")
    mid = str(candidate_info["marketing_id"])
    payload = {
        "user_id": mid,
        "product": "Enterprise RAG Assistant",
        "architecture": "LangChain + VectorDB",
        "business_value": "Accelerated internal knowledge retrieval",
        "role": "AI Engineer",
        "impact": "Reduced support ticket resolution time by 40%"
    }

    # Act: POST /api/project/
    response = client.post("/api/project/", json=payload)

    # Assert: Fails cleanly with 500 when API key is missing
    assert response.status_code == 500
    assert "detail" in response.json()
    assert "Project evaluation failed" in response.json()["detail"]


def test_get_project_history(client: TestClient):
    # Arrange: Create candidate and insert project context into DB
    candidate_info = create_test_candidate("proj_history@example.com", "Proj Hist User")
    mid = candidate_info["marketing_id"]
    cid = candidate_info["candidate_id"]

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO aiprep_tool_project_context
               (candidate_id, product, architecture, business_value, role, impact, company_name, domain)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE product=VALUES(product)""",
            (cid, "DocSearch AI", "Vector Search", "Search efficiency", "ML Architect", "High", "Acme Corp", "Enterprise Tech")
        )
    conn.commit()
    conn.close()

    # Act: GET /api/project/history
    response = client.get(f"/api/project/history?session_id={mid}")

    # Assert: Validate JSON structure and has_project flag
    assert response.status_code == 200
    data = response.json()
    assert "has_project" in data
    assert "completed" in data
    assert "aiprep_tool_case_studies" in data
    assert data["has_project"] is True


def test_get_context(client: TestClient):
    # Arrange: Setup candidate and project context
    candidate_info = create_test_candidate("proj_context@example.com", "Context User")
    mid = str(candidate_info["marketing_id"])
    cid = candidate_info["candidate_id"]

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO aiprep_tool_project_context
               (candidate_id, product, architecture, role, company_name, domain)
               VALUES (%s, %s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE product=VALUES(product)""",
            (cid, "Smart Support Bot", "Microservices", "Lead Developer", "FinTech Inc", "Finance")
        )
    conn.commit()
    conn.close()

    # Act: GET /api/context/{user_id}
    response = client.get(f"/api/context/{mid}")

    # Assert: Returns candidate context payload
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


def test_get_latest_project(client: TestClient):
    # Arrange: Setup candidate with project context
    candidate_info = create_test_candidate("latest_proj@example.com", "Latest Proj User")
    mid = str(candidate_info["marketing_id"])
    cid = candidate_info["candidate_id"]

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            """INSERT INTO aiprep_tool_project_context
               (candidate_id, product, architecture, business_value, role, impact, company_name, domain, tech_stack)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE product=VALUES(product)""",
            (cid, "Fraud Detection System", "Kafka + PyTorch", "Fraud reduction", "Data Scientist", "Saved $2M", "BankCo", "Banking", "Python, PyTorch, Kafka")
        )
    conn.commit()
    conn.close()

    # Act: GET /api/resume/latest-project
    response = client.get(f"/api/resume/latest-project?session_id={mid}")

    # Assert: Returns detailed project context JSON
    assert response.status_code == 200
    data = response.json()
    assert data["company_name"] == "BankCo"
    assert data["domain"] == "Banking"
    assert data["product"] == "Fraud Detection System"
    assert data["role"] == "Data Scientist"

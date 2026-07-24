import pytest
from fastapi.testclient import TestClient

def test_health_check(client: TestClient):
    """
    Test GET /health endpoint returns 200 OK and status ok.
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_root_endpoint(client: TestClient):
    """
    Test GET / endpoint returns 200 OK and expected system info.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["message"] == "AI Candidate Evaluation System Online"
    assert data["version"] == "2.0.0"

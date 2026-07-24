import pytest
from fastapi.testclient import TestClient
import httpx
from main import app
from db.init_db import init_db

import os
from jose import jwt
from db.connection import get_db_connection

@pytest.fixture(scope="session", autouse=True)
def db_fixture():
    """
    Fixture for database setup using init_db.
    """
    try:
        init_db()
    except Exception as e:
        print(f"Database initialization fixture note: {e}")

@pytest.fixture
def client():
    """
    Pytest fixture for FastAPI TestClient.
    """
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
async def async_client():
    """
    Pytest fixture for httpx AsyncClient.
    """
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

def create_test_candidate(email: str = "testuser@example.com", name: str = "Test Candidate") -> dict:
    """
    Helper function to seed a candidate, authuser, and candidate_marketing row in DB
    and generate a valid WBL JWT header for testing.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM candidate WHERE email = %s", (email,))
            row = cursor.fetchone()
            if row:
                cid = row["id"]
            else:
                cursor.execute("INSERT INTO candidate (full_name, email) VALUES (%s, %s)", (name, email))
                cid = cursor.lastrowid

            cursor.execute("SELECT id FROM authuser WHERE uname = %s", (email,))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO authuser (uname) VALUES (%s)", (email,))

            cursor.execute("SELECT id FROM candidate_marketing WHERE candidate_id = %s AND status = 'active' LIMIT 1", (cid,))
            cm_row = cursor.fetchone()
            if cm_row:
                cm_id = cm_row["id"]
            else:
                cursor.execute("INSERT INTO candidate_marketing (candidate_id, status, email) VALUES (%s, 'active', %s)", (cid, email))
                cm_id = cursor.lastrowid
        conn.commit()
    finally:
        conn.close()

    secret_key = os.getenv("WBL_SECRET_KEY", "69f19af7f440cef746e7b2af42835c5351fdd4e174c5bcf4307d01e6936edeca")
    token = jwt.encode({"sub": email}, secret_key, algorithm="HS256")

    return {
        "candidate_id": cid,
        "marketing_id": cm_id,
        "email": email,
        "name": name,
        "auth_headers": {"Authorization": f"Bearer {token}"}
    }


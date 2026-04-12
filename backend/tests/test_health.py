"""End-to-end test for the `/health` endpoint via FastAPI TestClient."""

from app import __version__
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_health_returns_ok_with_db_reachable():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body == {"status": "ok", "database": "ok", "version": __version__}

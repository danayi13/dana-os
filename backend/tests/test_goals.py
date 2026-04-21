"""Tests for goals CRUD and lifecycle transitions."""

from typing import Any

from fastapi.testclient import TestClient


def _create_goal(client: TestClient, **kwargs: object) -> dict[str, Any]:
    payload: dict[str, Any] = {"year": 2026, "type": "binary", "name": "Test goal", **kwargs}
    resp = client.post("/goals", json=payload)
    assert resp.status_code == 201
    return resp.json()


def test_create_binary_goal(client: TestClient) -> None:
    data = _create_goal(client, name="Ship MVP")
    assert data["name"] == "Ship MVP"
    assert data["status"] == "active"
    assert data["type"] == "binary"


def test_create_milestone_goal(client: TestClient) -> None:
    data = _create_goal(client, type="milestone", name="Run 500km", target_value=500.0)
    assert data["target_value"] == 500.0


def test_list_goals_filter_year(client: TestClient) -> None:
    _create_goal(client, year=2025, name="Old goal")
    _create_goal(client, year=2026, name="New goal")
    resp = client.get("/goals?year=2026")
    assert resp.status_code == 200
    years = {g["year"] for g in resp.json()}
    assert years == {2026}


def test_list_goals_filter_status(client: TestClient) -> None:
    goal = _create_goal(client, name="To archive")
    client.post(f"/goals/{goal['id']}/archive")
    resp = client.get("/goals?status_filter=archived")
    ids = [g["id"] for g in resp.json()]
    assert goal["id"] in ids


def test_get_goal_not_found(client: TestClient) -> None:
    resp = client.get("/goals/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


def test_update_goal(client: TestClient) -> None:
    goal = _create_goal(client, name="Original")
    resp = client.patch(f"/goals/{goal['id']}", json={"name": "Updated"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated"


def test_delete_goal(client: TestClient) -> None:
    goal = _create_goal(client, name="To delete")
    assert client.delete(f"/goals/{goal['id']}").status_code == 204
    assert client.get(f"/goals/{goal['id']}").status_code == 404


def test_delete_goal_cleans_up_nudges(client: TestClient) -> None:
    goal = _create_goal(client, name="Cleanup test")
    goal_id = goal["id"]
    client.post(
        "/nudges/reminders",
        json={"subject_type": "goal", "subject_id": goal_id, "interval_days": 30},
    )
    assert client.delete(f"/goals/{goal_id}").status_code == 204
    reminders = client.get("/nudges/reminders").json()
    assert not any(r["subject_id"] == goal_id for r in reminders)


def test_complete_goal(client: TestClient) -> None:
    goal = _create_goal(client, name="To complete")
    resp = client.post(f"/goals/{goal['id']}/complete")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["completed_at"] is not None


def test_complete_goal_idempotent_returns_409(client: TestClient) -> None:
    goal = _create_goal(client, name="Double complete")
    client.post(f"/goals/{goal['id']}/complete")
    resp = client.post(f"/goals/{goal['id']}/complete")
    assert resp.status_code == 409


def test_archive_goal(client: TestClient) -> None:
    goal = _create_goal(client, name="To archive")
    resp = client.post(f"/goals/{goal['id']}/archive")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "archived"
    assert data["archived_at"] is not None


def test_progress_milestone(client: TestClient) -> None:
    goal = _create_goal(client, type="milestone", name="Run 500km", target_value=500.0)
    resp = client.patch(f"/goals/{goal['id']}/progress", json={"current_value": 42.5})
    assert resp.status_code == 200
    assert resp.json()["current_value"] == 42.5


def test_progress_binary_returns_400(client: TestClient) -> None:
    goal = _create_goal(client, type="binary", name="Binary goal")
    resp = client.patch(f"/goals/{goal['id']}/progress", json={"current_value": 1.0})
    assert resp.status_code == 400

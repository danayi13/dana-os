"""Tests for vocal lesson CRUD, backfill, stats, and sheets sync."""

from datetime import date
from unittest.mock import MagicMock

from app.dependencies import get_vocal_sheets_sync
from app.main import app
from app.services.sheets_sync import SheetsSync
from fastapi.testclient import TestClient

# ── CRUD ───────────────────────────────────────────────────────────────────────


def test_create_lesson(client: TestClient) -> None:
    resp = client.post(
        "/vocal-lessons",
        json={"date": "2026-03-01", "repertoire": ["Ave Maria"], "reflection": "Good session"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["date"] == "2026-03-01"
    assert data["repertoire"] == ["Ave Maria"]
    assert data["reflection"] == "Good session"
    assert "id" in data


def test_create_lesson_minimal(client: TestClient) -> None:
    resp = client.post("/vocal-lessons", json={"date": "2026-03-02"})
    assert resp.status_code == 201
    assert resp.json()["repertoire"] is None
    assert resp.json()["reflection"] is None


def test_create_duplicate_date_conflicts(client: TestClient) -> None:
    client.post("/vocal-lessons", json={"date": "2026-04-01"})
    resp = client.post("/vocal-lessons", json={"date": "2026-04-01"})
    assert resp.status_code == 409


def test_list_lessons(client: TestClient) -> None:
    client.post("/vocal-lessons", json={"date": "2026-02-01"})
    client.post("/vocal-lessons", json={"date": "2026-02-08"})
    resp = client.get("/vocal-lessons")
    assert resp.status_code == 200
    dates = [lesson["date"] for lesson in resp.json()]
    assert "2026-02-01" in dates
    assert "2026-02-08" in dates


def test_list_lessons_date_filter(client: TestClient) -> None:
    client.post("/vocal-lessons", json={"date": "2026-01-01"})
    client.post("/vocal-lessons", json={"date": "2026-06-01"})
    resp = client.get("/vocal-lessons?start=2026-03-01&end=2026-12-31")
    assert resp.status_code == 200
    dates = [lesson["date"] for lesson in resp.json()]
    assert "2026-06-01" in dates
    assert "2026-01-01" not in dates


def test_get_lesson(client: TestClient) -> None:
    resp = client.post("/vocal-lessons", json={"date": "2026-03-10", "reflection": "Felt strong"})
    lesson_id = resp.json()["id"]
    resp = client.get(f"/vocal-lessons/{lesson_id}")
    assert resp.status_code == 200
    assert resp.json()["reflection"] == "Felt strong"


def test_get_lesson_not_found(client: TestClient) -> None:
    resp = client.get("/vocal-lessons/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


def test_update_lesson(client: TestClient) -> None:
    resp = client.post(
        "/vocal-lessons",
        json={"date": "2026-03-15", "repertoire": ["Caro mio ben"]},
    )
    lesson_id = resp.json()["id"]
    resp = client.patch(
        f"/vocal-lessons/{lesson_id}",
        json={"reflection": "Good session"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["reflection"] == "Good session"
    assert data["repertoire"] == ["Caro mio ben"]  # unchanged


def test_delete_lesson(client: TestClient) -> None:
    resp = client.post("/vocal-lessons", json={"date": "2026-03-20"})
    lesson_id = resp.json()["id"]
    assert client.delete(f"/vocal-lessons/{lesson_id}").status_code == 204
    assert client.get(f"/vocal-lessons/{lesson_id}").status_code == 404


# ── Backfill ───────────────────────────────────────────────────────────────────


def test_backfill_creates_missing(client: TestClient) -> None:
    resp = client.post(
        "/vocal-lessons/backfill",
        json=[
            {"date": "2026-01-10", "reflection": "Session A"},
            {"date": "2026-01-17", "reflection": "Session B"},
        ],
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_backfill_updates_existing(client: TestClient) -> None:
    client.post("/vocal-lessons", json={"date": "2026-01-24", "reflection": "old"})
    resp = client.post(
        "/vocal-lessons/backfill",
        json=[{"date": "2026-01-24", "reflection": "updated"}],
    )
    assert resp.status_code == 200
    assert resp.json()[0]["reflection"] == "updated"


def test_backfill_no_duplicates(client: TestClient) -> None:
    client.post(
        "/vocal-lessons/backfill",
        json=[{"date": "2026-02-05"}, {"date": "2026-02-12"}],
    )
    # Second call with same dates should update, not duplicate
    client.post(
        "/vocal-lessons/backfill",
        json=[{"date": "2026-02-05"}, {"date": "2026-02-12"}],
    )
    resp = client.get("/vocal-lessons?start=2026-02-05&end=2026-02-12")
    assert len(resp.json()) == 2  # still 2, not 4


# ── Stats ──────────────────────────────────────────────────────────────────────


def test_stats_empty(client: TestClient) -> None:
    resp = client.get("/vocal-lessons/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_lessons"] == 0
    assert data["monthly_frequency"] == []
    assert data["repertoire_counts"] == []


def test_stats_frequency(client: TestClient) -> None:
    client.post("/vocal-lessons", json={"date": "2026-03-01"})
    client.post("/vocal-lessons", json={"date": "2026-03-08"})
    client.post("/vocal-lessons", json={"date": "2026-04-05"})
    data = client.get("/vocal-lessons/stats").json()
    freq = {entry["month"]: entry["count"] for entry in data["monthly_frequency"]}
    assert freq["2026-03"] == 2
    assert freq["2026-04"] == 1


def test_stats_repertoire_counts(client: TestClient) -> None:
    client.post(
        "/vocal-lessons",
        json={"date": "2026-03-01", "repertoire": ["Ave Maria", "Caro mio ben"]},
    )
    client.post(
        "/vocal-lessons",
        json={"date": "2026-03-08", "repertoire": ["Ave Maria"]},
    )
    data = client.get("/vocal-lessons/stats").json()
    pieces = {entry["piece"]: entry["count"] for entry in data["repertoire_counts"]}
    assert pieces["Ave Maria"] == 2
    assert pieces["Caro mio ben"] == 1


# ── Sheets sync ────────────────────────────────────────────────────────────────


def test_sheets_sync_called_on_create(client: TestClient) -> None:
    mock_sheets = MagicMock(spec=SheetsSync)
    mock_sheets.enabled = True
    app.dependency_overrides[get_vocal_sheets_sync] = lambda: mock_sheets

    try:
        client.post(
            "/vocal-lessons",
            json={"date": "2026-05-01", "repertoire": ["Somewhere"], "reflection": "Great"},
        )
        mock_sheets.write_vocal_lesson.assert_called_once()
        call_kwargs = mock_sheets.write_vocal_lesson.call_args
        assert call_kwargs.kwargs["reflection"] == "Great"
    finally:
        app.dependency_overrides.pop(get_vocal_sheets_sync, None)


def test_sheets_sync_disabled_noop() -> None:
    sync = SheetsSync(credentials_path=None, sheet_id=None)
    # Should not raise
    sync.write_vocal_lesson(
        lesson_date=date(2026, 5, 1),
        repertoire=["Ave Maria"],
        reflection="Felt confident",
    )

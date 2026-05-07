"""Tests for climbing tracker: gyms, sessions, stats, nudge, and sheets sync."""

import uuid
from datetime import date, timedelta
from unittest.mock import MagicMock

from app.dependencies import get_climbing_sheets_sync
from app.main import app
from app.models.nudge import ReminderConfig
from app.routers.climbing import CLIMBING_SUBJECT_ID
from app.services.sheets_sync import SheetsSync
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# ── Gym CRUD ──────────────────────────────────────────────────────────────────


def test_create_gym_recurring(client: TestClient) -> None:
    resp = client.post("/climbing/gyms", json={"name": "Movement", "gym_type": "recurring"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Movement"
    assert data["gym_type"] == "recurring"
    assert data["location"] is None


def test_create_gym_infrequent_with_location(client: TestClient) -> None:
    resp = client.post(
        "/climbing/gyms",
        json={"name": "Brooklyn Boulders", "location": "New York, NY", "gym_type": "infrequent"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["gym_type"] == "infrequent"
    assert data["location"] == "New York, NY"


def test_list_gyms(client: TestClient) -> None:
    client.post("/climbing/gyms", json={"name": "Gym A", "gym_type": "recurring"})
    client.post("/climbing/gyms", json={"name": "Gym B", "gym_type": "infrequent"})
    resp = client.get("/climbing/gyms")
    assert resp.status_code == 200
    names = [g["name"] for g in resp.json()]
    assert "Gym A" in names
    assert "Gym B" in names


def test_update_gym(client: TestClient) -> None:
    created = client.post(
        "/climbing/gyms", json={"name": "Old Name", "gym_type": "recurring"}
    ).json()
    resp = client.patch(
        f"/climbing/gyms/{created['id']}",
        json={"name": "New Name", "location": "Austin, TX"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"
    assert resp.json()["location"] == "Austin, TX"


def test_delete_gym_no_sessions(client: TestClient) -> None:
    created = client.post(
        "/climbing/gyms", json={"name": "Empty Gym", "gym_type": "recurring"}
    ).json()
    resp = client.delete(f"/climbing/gyms/{created['id']}")
    assert resp.status_code == 204


def test_delete_gym_blocked_by_sessions(client: TestClient) -> None:
    gym = client.post("/climbing/gyms", json={"name": "Busy Gym", "gym_type": "recurring"}).json()
    client.post(
        "/climbing/sessions",
        json={"date": "2025-01-10", "gym_id": gym["id"]},
    )
    resp = client.delete(f"/climbing/gyms/{gym['id']}")
    assert resp.status_code == 409


def test_get_gym_not_found(client: TestClient) -> None:
    resp = client.patch(f"/climbing/gyms/{uuid.uuid4()}", json={"name": "X"})
    assert resp.status_code == 404


# ── Session CRUD ──────────────────────────────────────────────────────────────


def test_create_session_minimal(client: TestClient) -> None:
    resp = client.post("/climbing/sessions", json={"date": "2025-06-01"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["date"] == "2025-06-01"
    assert data["gym_id"] is None
    assert data["max_grade"] is None


def test_create_session_full(client: TestClient) -> None:
    gym = client.post("/climbing/gyms", json={"name": "Test Gym", "gym_type": "recurring"}).json()
    resp = client.post(
        "/climbing/sessions",
        json={
            "date": "2025-06-15",
            "gym_id": gym["id"],
            "duration_minutes": 90,
            "max_grade": "V5",
            "companions": ["Alex"],
            "notes": "Sent my first V5!",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["max_grade"] == "V5"
    assert data["duration_minutes"] == 90
    assert data["gym_name"] == "Test Gym"
    assert data["companions"] == ["Alex"]


def test_create_session_null_grade_allowed(client: TestClient) -> None:
    resp = client.post(
        "/climbing/sessions",
        json={"date": "2024-01-01", "duration_minutes": 60},
    )
    assert resp.status_code == 201
    assert resp.json()["max_grade"] is None


def test_list_sessions(client: TestClient) -> None:
    client.post("/climbing/sessions", json={"date": "2025-07-01"})
    client.post("/climbing/sessions", json={"date": "2025-08-01"})
    resp = client.get("/climbing/sessions")
    assert resp.status_code == 200
    dates = [s["date"] for s in resp.json()]
    assert "2025-07-01" in dates
    assert "2025-08-01" in dates


def test_list_sessions_date_filter(client: TestClient) -> None:
    client.post("/climbing/sessions", json={"date": "2025-01-10"})
    client.post("/climbing/sessions", json={"date": "2025-12-10"})
    resp = client.get("/climbing/sessions?start=2025-06-01&end=2025-12-31")
    assert resp.status_code == 200
    dates = [s["date"] for s in resp.json()]
    assert "2025-12-10" in dates
    assert "2025-01-10" not in dates


def test_get_session(client: TestClient) -> None:
    created = client.post(
        "/climbing/sessions", json={"date": "2025-09-01", "max_grade": "V3"}
    ).json()
    resp = client.get(f"/climbing/sessions/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["max_grade"] == "V3"


def test_update_session(client: TestClient) -> None:
    created = client.post(
        "/climbing/sessions", json={"date": "2025-09-05", "max_grade": "V2"}
    ).json()
    resp = client.patch(
        f"/climbing/sessions/{created['id']}",
        json={"max_grade": "V4", "notes": "Updated"},
    )
    assert resp.status_code == 200
    assert resp.json()["max_grade"] == "V4"
    assert resp.json()["notes"] == "Updated"


def test_delete_session(client: TestClient) -> None:
    created = client.post("/climbing/sessions", json={"date": "2025-10-01"}).json()
    resp = client.delete(f"/climbing/sessions/{created['id']}")
    assert resp.status_code == 204
    assert client.get(f"/climbing/sessions/{created['id']}").status_code == 404


# ── Stats ─────────────────────────────────────────────────────────────────────


def test_stats_grade_progression_excludes_null_grades(client: TestClient) -> None:
    client.post("/climbing/sessions", json={"date": "2025-01-01"})  # no grade
    client.post("/climbing/sessions", json={"date": "2025-02-01", "max_grade": "V3"})
    client.post("/climbing/sessions", json={"date": "2025-03-01", "max_grade": "V5"})

    stats = client.get("/climbing/sessions/stats").json()
    grades = [p["grade"] for p in stats["grade_progression"]]
    assert "V3" in grades
    assert "V5" in grades
    assert len(grades) == 2  # null-grade session excluded


def test_stats_grade_progression_ordered_by_date(client: TestClient) -> None:
    client.post("/climbing/sessions", json={"date": "2025-03-01", "max_grade": "V4"})
    client.post("/climbing/sessions", json={"date": "2025-01-01", "max_grade": "V2"})

    stats = client.get("/climbing/sessions/stats").json()
    dates = [p["date"] for p in stats["grade_progression"]]
    assert dates == sorted(dates)


def test_stats_monthly_volume(client: TestClient) -> None:
    client.post("/climbing/sessions", json={"date": "2025-04-01", "duration_minutes": 60})
    client.post("/climbing/sessions", json={"date": "2025-04-15", "duration_minutes": 90})
    client.post("/climbing/sessions", json={"date": "2025-05-01", "duration_minutes": 45})

    stats = client.get("/climbing/sessions/stats").json()
    monthly = {m["month"]: m for m in stats["monthly_volume"]}
    assert monthly["2025-04"]["count"] == 2
    assert monthly["2025-04"]["total_minutes"] == 150
    assert monthly["2025-05"]["count"] == 1
    assert monthly["2025-05"]["total_minutes"] == 45


def test_stats_monthly_volume_null_duration(client: TestClient) -> None:
    client.post("/climbing/sessions", json={"date": "2025-06-01"})  # no duration
    stats = client.get("/climbing/sessions/stats").json()
    monthly = {m["month"]: m for m in stats["monthly_volume"]}
    assert monthly["2025-06"]["count"] == 1
    assert monthly["2025-06"]["total_minutes"] is None


def test_stats_gym_breakdown(client: TestClient) -> None:
    gym = client.post("/climbing/gyms", json={"name": "Stats Gym", "gym_type": "recurring"}).json()
    client.post(
        "/climbing/sessions",
        json={"date": "2025-07-01", "gym_id": gym["id"], "duration_minutes": 60},
    )
    client.post(
        "/climbing/sessions",
        json={"date": "2025-07-15", "gym_id": gym["id"], "duration_minutes": 90},
    )

    stats = client.get("/climbing/sessions/stats").json()
    gym_row = next(g for g in stats["gym_stats"] if g["gym_id"] == gym["id"])
    assert gym_row["visit_count"] == 2
    assert gym_row["total_minutes"] == 150
    assert gym_row["last_visit"] == "2025-07-15"
    assert gym_row["days_since_last"] is not None


def test_stats_gym_breakdown_split_by_type(client: TestClient) -> None:
    client.post("/climbing/gyms", json={"name": "Regular", "gym_type": "recurring"})
    client.post("/climbing/gyms", json={"name": "Travel", "gym_type": "infrequent"})

    stats = client.get("/climbing/sessions/stats").json()
    types = {g["name"]: g["gym_type"] for g in stats["gym_stats"]}
    assert types["Regular"] == "recurring"
    assert types["Travel"] == "infrequent"


def test_stats_first_per_grade(client: TestClient) -> None:
    # V3 first logged in Jan, V5 logged in Feb — first_per_grade should reflect this
    client.post("/climbing/sessions", json={"date": "2025-01-10", "max_grade": "V3"})
    client.post("/climbing/sessions", json={"date": "2025-02-05", "max_grade": "V5"})
    client.post("/climbing/sessions", json={"date": "2025-03-01", "max_grade": "V3"})  # re-log V3

    stats = client.get("/climbing/sessions/stats").json()
    fpg = {row["grade"]: row["first_date"] for row in stats["first_per_grade"]}
    assert fpg["V3"] == "2025-01-10"
    assert fpg["V5"] == "2025-02-05"
    assert len(stats["first_per_grade"]) == 2  # no dupe


def test_stats_first_per_grade_sorted_ascending(client: TestClient) -> None:
    client.post("/climbing/sessions", json={"date": "2025-01-01", "max_grade": "V5"})
    client.post("/climbing/sessions", json={"date": "2025-01-02", "max_grade": "V2"})

    stats = client.get("/climbing/sessions/stats").json()
    grade_ints = [row["grade_int"] for row in stats["first_per_grade"]]
    assert grade_ints == sorted(grade_ints)


def test_stats_total_counters(client: TestClient) -> None:
    client.post("/climbing/sessions", json={"date": "2025-08-01", "duration_minutes": 60})
    client.post("/climbing/sessions", json={"date": "2025-08-08", "duration_minutes": 120})

    stats = client.get("/climbing/sessions/stats").json()
    assert stats["total_sessions"] >= 2
    assert stats["total_minutes"] is not None


# ── Nudge ─────────────────────────────────────────────────────────────────────``


def test_nudge_not_stale_after_recent_session(client: TestClient, db: Session) -> None:
    # Set interval to 14 days; log a session today → not stale
    config = (
        db.query(ReminderConfig)
        .filter(
            ReminderConfig.subject_type == "climbing",
            ReminderConfig.subject_id == CLIMBING_SUBJECT_ID,
        )
        .first()
    )
    assert config is not None
    config.interval_days = 14
    db.flush()

    today_str = date.today().isoformat()
    client.post("/climbing/sessions", json={"date": today_str})

    resp = client.get("/climbing/sessions/nudge")
    assert resp.status_code == 200
    assert resp.json()["is_stale"] is False


def test_nudge_stale_after_interval(client: TestClient, db: Session) -> None:
    config = (
        db.query(ReminderConfig)
        .filter(
            ReminderConfig.subject_type == "climbing",
            ReminderConfig.subject_id == CLIMBING_SUBJECT_ID,
        )
        .first()
    )
    assert config is not None
    config.interval_days = 7
    db.flush()

    old_date = (date.today() - timedelta(days=10)).isoformat()
    client.post("/climbing/sessions", json={"date": old_date})

    resp = client.get("/climbing/sessions/nudge")
    assert resp.status_code == 200
    assert resp.json()["is_stale"] is True
    assert resp.json()["days_since_last"] == 10


def test_nudge_snooze_suppresses(client: TestClient, db: Session) -> None:
    config = (
        db.query(ReminderConfig)
        .filter(
            ReminderConfig.subject_type == "climbing",
            ReminderConfig.subject_id == CLIMBING_SUBJECT_ID,
        )
        .first()
    )
    assert config is not None
    config.interval_days = 1
    db.flush()

    old_date = (date.today() - timedelta(days=5)).isoformat()
    client.post("/climbing/sessions", json={"date": old_date})

    # Snooze for 7 days
    snooze_resp = client.post("/climbing/sessions/nudge/snooze", json={"days": 7})
    assert snooze_resp.status_code == 200
    assert snooze_resp.json()["is_stale"] is False


def test_nudge_dismiss_suppresses(client: TestClient, db: Session) -> None:
    config = (
        db.query(ReminderConfig)
        .filter(
            ReminderConfig.subject_type == "climbing",
            ReminderConfig.subject_id == CLIMBING_SUBJECT_ID,
        )
        .first()
    )
    assert config is not None
    config.interval_days = 1
    db.flush()

    old_date = (date.today() - timedelta(days=5)).isoformat()
    client.post("/climbing/sessions", json={"date": old_date})

    dismiss_resp = client.post("/climbing/sessions/nudge/dismiss")
    assert dismiss_resp.status_code == 200
    assert dismiss_resp.json()["is_stale"] is False


def test_nudge_resets_on_new_session(client: TestClient, db: Session) -> None:
    config = (
        db.query(ReminderConfig)
        .filter(
            ReminderConfig.subject_type == "climbing",
            ReminderConfig.subject_id == CLIMBING_SUBJECT_ID,
        )
        .first()
    )
    assert config is not None
    config.interval_days = 1
    db.flush()

    old_date = (date.today() - timedelta(days=5)).isoformat()
    client.post("/climbing/sessions", json={"date": old_date})
    client.post("/climbing/sessions/nudge/dismiss")

    # Logging a new session resets the nudge
    today_str = date.today().isoformat()
    client.post("/climbing/sessions", json={"date": today_str})

    nudge_resp = client.get("/climbing/sessions/nudge")
    # After logging today, nudge_state should be active (reset), and not stale
    assert nudge_resp.json()["is_stale"] is False


# ── Reminder config ───────────────────────────────────────────────────────────


def test_reminder_config_seeded(client: TestClient) -> None:
    resp = client.get("/climbing/sessions/reminder")
    assert resp.status_code == 200
    data = resp.json()
    assert data["interval_days"] == 14
    assert data["enabled"] is True


def test_reminder_config_update(client: TestClient) -> None:
    resp = client.patch("/climbing/sessions/reminder", json={"interval_days": 21, "enabled": False})
    assert resp.status_code == 200
    data = resp.json()
    assert data["interval_days"] == 21
    assert data["enabled"] is False


# ── Sheets sync graceful degradation ─────────────────────────────────────────


def test_sheets_sync_disabled_no_error(client: TestClient) -> None:
    mock_sheets = MagicMock(spec=SheetsSync)
    mock_sheets.enabled = False
    mock_sheets.write_climbing_session.return_value = None

    app.dependency_overrides[get_climbing_sheets_sync] = lambda: mock_sheets
    try:
        resp = client.post("/climbing/sessions", json={"date": "2025-11-01", "max_grade": "V4"})
        assert resp.status_code == 201
        mock_sheets.write_climbing_session.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_climbing_sheets_sync, None)


def test_sheets_sync_called_on_update(client: TestClient) -> None:
    mock_sheets = MagicMock(spec=SheetsSync)
    mock_sheets.write_climbing_session.return_value = None

    app.dependency_overrides[get_climbing_sheets_sync] = lambda: mock_sheets
    try:
        created = client.post("/climbing/sessions", json={"date": "2025-11-10"}).json()
        client.patch(f"/climbing/sessions/{created['id']}", json={"max_grade": "V6"})
        assert mock_sheets.write_climbing_session.call_count == 2
    finally:
        app.dependency_overrides.pop(get_climbing_sheets_sync, None)


# ── Session 404 ───────────────────────────────────────────────────────────────


def test_get_session_not_found(client: TestClient) -> None:
    resp = client.get(f"/climbing/sessions/{uuid.uuid4()}")
    assert resp.status_code == 404


def test_delete_session_not_found(client: TestClient) -> None:
    resp = client.delete(f"/climbing/sessions/{uuid.uuid4()}")
    assert resp.status_code == 404


def test_update_session_not_found(client: TestClient) -> None:
    resp = client.patch(f"/climbing/sessions/{uuid.uuid4()}", json={"max_grade": "V3"})
    assert resp.status_code == 404


def test_create_session_invalid_gym_id(client: TestClient) -> None:
    resp = client.post(
        "/climbing/sessions",
        json={"date": "2025-06-01", "gym_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 404


def test_update_session_invalid_gym_id(client: TestClient) -> None:
    created = client.post("/climbing/sessions", json={"date": "2025-06-01"}).json()
    resp = client.patch(
        f"/climbing/sessions/{created['id']}",
        json={"gym_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 404


# ── Stats edge cases ──────────────────────────────────────────────────────────


def test_stats_empty(client: TestClient) -> None:
    stats = client.get("/climbing/sessions/stats").json()
    assert stats["total_sessions"] == 0
    assert stats["total_minutes"] is None
    assert stats["grade_progression"] == []
    assert stats["monthly_volume"] == []
    assert stats["first_per_grade"] == []
    assert stats["companion_stats"] == []


# ── Companion stats ───────────────────────────────────────────────────────────


def test_stats_companion_counts(client: TestClient) -> None:
    client.post(
        "/climbing/sessions",
        json={"date": "2025-01-01", "companions": ["Alex", "Sam"]},
    )
    client.post(
        "/climbing/sessions",
        json={"date": "2025-02-01", "companions": ["Alex"]},
    )
    client.post("/climbing/sessions", json={"date": "2025-03-01"})  # no companions

    stats = client.get("/climbing/sessions/stats").json()
    by_name = {c["name"]: c for c in stats["companion_stats"]}

    assert "Alex" in by_name
    assert by_name["Alex"]["session_count"] == 2
    assert "Sam" in by_name
    assert by_name["Sam"]["session_count"] == 1


def test_stats_companion_last_climbed(client: TestClient) -> None:
    client.post("/climbing/sessions", json={"date": "2025-01-01", "companions": ["Jordan"]})
    client.post("/climbing/sessions", json={"date": "2025-06-01", "companions": ["Jordan"]})

    stats = client.get("/climbing/sessions/stats").json()
    jordan = next(c for c in stats["companion_stats"] if c["name"] == "Jordan")
    assert jordan["last_climbed"] == "2025-06-01"


def test_stats_companions_sorted_by_count_desc(client: TestClient) -> None:
    client.post("/climbing/sessions", json={"date": "2025-01-01", "companions": ["A"]})
    client.post("/climbing/sessions", json={"date": "2025-02-01", "companions": ["A"]})
    client.post("/climbing/sessions", json={"date": "2025-03-01", "companions": ["A"]})
    client.post("/climbing/sessions", json={"date": "2025-04-01", "companions": ["B"]})

    stats = client.get("/climbing/sessions/stats").json()
    counts = [c["session_count"] for c in stats["companion_stats"]]
    assert counts == sorted(counts, reverse=True)
    assert stats["companion_stats"][0]["name"] == "A"


def test_stats_null_companions_excluded(client: TestClient) -> None:
    client.post("/climbing/sessions", json={"date": "2025-01-01"})  # companions=None
    client.post("/climbing/sessions", json={"date": "2025-02-01", "companions": []})

    stats = client.get("/climbing/sessions/stats").json()
    assert stats["companion_stats"] == []


# ── Nudge edge cases ──────────────────────────────────────────────────────────


def test_nudge_no_sessions(client: TestClient, db: Session) -> None:
    config = (
        db.query(ReminderConfig)
        .filter(
            ReminderConfig.subject_type == "climbing",
            ReminderConfig.subject_id == CLIMBING_SUBJECT_ID,
        )
        .first()
    )
    assert config is not None
    config.interval_days = 14
    db.flush()

    resp = client.get("/climbing/sessions/nudge")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_stale"] is True  # enabled + no sessions → stale
    assert data["days_since_last"] is None
    assert data["last_session_date"] is None


def test_nudge_reset_reactivates(client: TestClient, db: Session) -> None:
    config = (
        db.query(ReminderConfig)
        .filter(
            ReminderConfig.subject_type == "climbing",
            ReminderConfig.subject_id == CLIMBING_SUBJECT_ID,
        )
        .first()
    )
    assert config is not None
    config.interval_days = 1
    db.flush()

    old_date = (date.today() - timedelta(days=5)).isoformat()
    client.post("/climbing/sessions", json={"date": old_date})
    client.post("/climbing/sessions/nudge/dismiss")
    assert client.get("/climbing/sessions/nudge").json()["is_stale"] is False

    client.post("/climbing/sessions/nudge/reset")
    assert client.get("/climbing/sessions/nudge").json()["is_stale"] is True

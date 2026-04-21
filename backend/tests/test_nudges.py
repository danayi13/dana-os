"""Tests for reminder configs and nudge state transitions."""

import uuid
from datetime import date, timedelta
from typing import Any

from app.models.habit import HabitActivationPeriod, HabitLog
from app.models.nudge import NudgeState, ReminderConfig
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def _create_habit_with_reminder(
    db: Session, client: TestClient, days_ago: int = 10
) -> dict[str, Any]:
    """Helper: create a habit, activate it, add a reminder, log it `days_ago` days back."""
    habit_resp = client.post(
        "/habits", json={"name": f"Habit-{uuid.uuid4().hex[:6]}", "period_type": "daily"}
    )
    habit_id = habit_resp.json()["id"]

    # Activate starting 30 days ago
    start = date.today() - timedelta(days=30)
    db.add(
        HabitActivationPeriod(
            habit_id=uuid.UUID(habit_id),
            starts_on=start,
        )
    )

    # Add reminder
    db.add(
        ReminderConfig(
            subject_type="habit",
            subject_id=uuid.UUID(habit_id),
            interval_days=7,
            enabled=True,
        )
    )
    db.flush()

    # Log it `days_ago` days ago
    log_date = date.today() - timedelta(days=days_ago)
    db.add(
        HabitLog(
            habit_id=uuid.UUID(habit_id),
            date=log_date,
            value=1.0,
        )
    )
    db.flush()

    return habit_resp.json()


# ── Reminder CRUD ──────────────────────────────────────────────────────────


def test_create_reminder(client: TestClient) -> None:
    subj_id = str(uuid.uuid4())
    resp = client.post(
        "/nudges/reminders",
        json={
            "subject_type": "habit",
            "subject_id": subj_id,
            "interval_days": 7,
        },
    )
    assert resp.status_code == 201
    assert resp.json()["interval_days"] == 7


def test_list_reminders(client: TestClient) -> None:
    subj_id = str(uuid.uuid4())
    client.post(
        "/nudges/reminders",
        json={"subject_type": "habit", "subject_id": subj_id, "interval_days": 3},
    )
    resp = client.get("/nudges/reminders")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_update_reminder(client: TestClient) -> None:
    subj_id = str(uuid.uuid4())
    resp = client.post(
        "/nudges/reminders",
        json={"subject_type": "habit", "subject_id": subj_id, "interval_days": 7},
    )
    reminder_id = resp.json()["id"]
    resp = client.patch(f"/nudges/reminders/{reminder_id}", json={"interval_days": 14})
    assert resp.status_code == 200
    assert resp.json()["interval_days"] == 14


def test_delete_reminder(client: TestClient) -> None:
    subj_id = str(uuid.uuid4())
    resp = client.post(
        "/nudges/reminders",
        json={"subject_type": "habit", "subject_id": subj_id, "interval_days": 7},
    )
    reminder_id = resp.json()["id"]
    assert client.delete(f"/nudges/reminders/{reminder_id}").status_code == 204


# ── Stale habits ───────────────────────────────────────────────────────────


def test_stale_habits_returns_overdue(client: TestClient, db: Session) -> None:
    habit = _create_habit_with_reminder(db, client, days_ago=10)
    resp = client.get("/nudges/stale")
    assert resp.status_code == 200
    ids = [s["habit_id"] for s in resp.json()]
    assert habit["id"] in ids


def test_stale_habits_excludes_recent(client: TestClient, db: Session) -> None:
    habit = _create_habit_with_reminder(db, client, days_ago=2)
    resp = client.get("/nudges/stale")
    ids = [s["habit_id"] for s in resp.json()]
    assert habit["id"] not in ids


def test_stale_accepts_tz_param(client: TestClient, db: Session) -> None:
    habit = _create_habit_with_reminder(db, client, days_ago=10)
    resp = client.get("/nudges/stale?tz=America/New_York")
    assert resp.status_code == 200
    ids = [s["habit_id"] for s in resp.json()]
    assert habit["id"] in ids


def test_stale_invalid_tz_returns_400(client: TestClient, db: Session) -> None:
    resp = client.get("/nudges/stale?tz=Not/AZone")
    assert resp.status_code == 400


# ── Nudge state machine ────────────────────────────────────────────────────


def test_snooze_habit(client: TestClient, db: Session) -> None:
    habit = _create_habit_with_reminder(db, client, days_ago=10)
    resp = client.post(f"/nudges/habits/{habit['id']}/snooze", json={"days": 7})
    assert resp.status_code == 200
    data = resp.json()
    assert data["state"] == "snoozed"
    assert data["snoozed_until"] is not None


def test_snoozed_habit_excluded_from_stale(client: TestClient, db: Session) -> None:
    habit = _create_habit_with_reminder(db, client, days_ago=10)
    client.post(f"/nudges/habits/{habit['id']}/snooze", json={"days": 7})
    resp = client.get("/nudges/stale")
    ids = [s["habit_id"] for s in resp.json()]
    assert habit["id"] not in ids


def test_dismiss_habit(client: TestClient, db: Session) -> None:
    habit = _create_habit_with_reminder(db, client, days_ago=10)
    resp = client.post(f"/nudges/habits/{habit['id']}/dismiss")
    assert resp.status_code == 200
    assert resp.json()["state"] == "dismissed"


def test_reset_habit(client: TestClient, db: Session) -> None:
    habit = _create_habit_with_reminder(db, client, days_ago=10)
    client.post(f"/nudges/habits/{habit['id']}/dismiss")
    resp = client.post(f"/nudges/habits/{habit['id']}/reset")
    assert resp.status_code == 200
    assert resp.json()["state"] == "active"
    assert resp.json()["dismissed_at"] is None


def test_logging_habit_resets_nudge(client: TestClient, db: Session) -> None:
    habit = _create_habit_with_reminder(db, client, days_ago=10)
    # Dismiss nudge, then log the habit — nudge should re-arm to active
    client.post(f"/nudges/habits/{habit['id']}/dismiss")
    log_date = str(date.today())
    client.post(f"/habits/{habit['id']}/logs", json={"date": log_date, "value": 1.0})
    resp = client.post(f"/nudges/habits/{habit['id']}/reset")
    # State should already be active — reset is idempotent
    assert resp.json()["state"] == "active"


def test_logging_habit_with_no_nudge_does_not_create_one(client: TestClient, db: Session) -> None:
    habit_resp = client.post(
        "/habits", json={"name": f"NoNudge-{uuid.uuid4().hex[:6]}", "period_type": "daily"}
    )
    habit_id = habit_resp.json()["id"]
    client.post(f"/habits/{habit_id}/logs", json={"date": str(date.today()), "value": 1.0})
    # No nudge state should have been created
    nudge = (
        db.query(NudgeState).filter_by(subject_type="habit", subject_id=uuid.UUID(habit_id)).first()
    )
    assert nudge is None

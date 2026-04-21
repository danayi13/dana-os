"""Tests for habit definitions, activation periods, logs, and stats."""

from datetime import date

from app.models.habit import HabitDefinition, HabitLog
from app.services import habit_calc
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_create_habit(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Run", "period_type": "daily"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Run"
    assert data["period_type"] == "daily"
    assert "id" in data


def test_list_habits(client: TestClient) -> None:
    client.post("/habits", json={"name": "Meditate", "period_type": "daily"})
    resp = client.get("/habits")
    assert resp.status_code == 200
    names = [h["name"] for h in resp.json()]
    assert "Meditate" in names


def test_get_habit_not_found(client: TestClient) -> None:
    resp = client.get("/habits/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


def test_update_habit(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Walk", "period_type": "daily"})
    habit_id = resp.json()["id"]
    resp = client.patch(f"/habits/{habit_id}", json={"name": "Walk 10k steps"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Walk 10k steps"


def test_delete_habit(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Temp", "period_type": "daily"})
    habit_id = resp.json()["id"]
    assert client.delete(f"/habits/{habit_id}").status_code == 204
    assert client.get(f"/habits/{habit_id}").status_code == 404


def test_delete_habit_cleans_up_nudges(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Cleanup test", "period_type": "daily"})
    habit_id = resp.json()["id"]
    client.post(
        "/nudges/reminders",
        json={"subject_type": "habit", "subject_id": habit_id, "interval_days": 7},
    )
    client.post(f"/nudges/habits/{habit_id}/snooze", json={"days": 1})
    assert client.delete(f"/habits/{habit_id}").status_code == 204
    # Reminder config and nudge state should be gone
    reminders = client.get("/nudges/reminders").json()
    assert not any(r["subject_id"] == habit_id for r in reminders)


# ── Activation periods ─────────────────────────────────────────────────────


def test_activate_habit(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Swim", "period_type": "weekly"})
    habit_id = resp.json()["id"]
    resp = client.post(f"/habits/{habit_id}/activate", json={"starts_on": "2026-01-01"})
    assert resp.status_code == 201
    assert resp.json()["starts_on"] == "2026-01-01"
    assert resp.json()["archived_at"] is None


def test_archive_activation(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Yoga", "period_type": "daily"})
    habit_id = resp.json()["id"]
    resp = client.post(f"/habits/{habit_id}/activate", json={"starts_on": "2026-01-01"})
    period_id = resp.json()["id"]
    resp = client.delete(f"/habits/{habit_id}/activate/{period_id}")
    assert resp.status_code == 200
    assert resp.json()["archived_at"] is not None


def test_archive_already_archived(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Stretch", "period_type": "daily"})
    habit_id = resp.json()["id"]
    resp = client.post(f"/habits/{habit_id}/activate", json={"starts_on": "2026-01-01"})
    period_id = resp.json()["id"]
    client.delete(f"/habits/{habit_id}/activate/{period_id}")
    resp = client.delete(f"/habits/{habit_id}/activate/{period_id}")
    assert resp.status_code == 409


# ── Logs ───────────────────────────────────────────────────────────────────


def test_log_habit(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Read", "period_type": "daily"})
    habit_id = resp.json()["id"]
    resp = client.post(f"/habits/{habit_id}/logs", json={"date": "2026-04-01", "value": 1.0})
    assert resp.status_code == 201
    assert resp.json()["date"] == "2026-04-01"


def test_log_duplicate_returns_409(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Journal", "period_type": "daily"})
    habit_id = resp.json()["id"]
    client.post(f"/habits/{habit_id}/logs", json={"date": "2026-04-01"})
    resp = client.post(f"/habits/{habit_id}/logs", json={"date": "2026-04-01"})
    assert resp.status_code == 409


def test_update_log(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Lift", "period_type": "daily"})
    habit_id = resp.json()["id"]
    resp = client.post(f"/habits/{habit_id}/logs", json={"date": "2026-04-01", "value": 1.0})
    log_id = resp.json()["id"]
    resp = client.patch(f"/habits/{habit_id}/logs/{log_id}", json={"value": 2.0})
    assert resp.status_code == 200
    assert resp.json()["value"] == 2.0


def test_delete_log(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Bike", "period_type": "daily"})
    habit_id = resp.json()["id"]
    resp = client.post(f"/habits/{habit_id}/logs", json={"date": "2026-04-01"})
    log_id = resp.json()["id"]
    assert client.delete(f"/habits/{habit_id}/logs/{log_id}").status_code == 204


def test_backfill_logs(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Sleep", "period_type": "daily"})
    habit_id = resp.json()["id"]
    entries = [{"date": f"2026-03-{d:02d}"} for d in range(1, 8)]
    resp = client.post(f"/habits/{habit_id}/logs/backfill", json=entries)
    assert resp.status_code == 200
    assert len(resp.json()) == 7


def test_backfill_skips_existing(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Hydrate", "period_type": "daily"})
    habit_id = resp.json()["id"]
    client.post(f"/habits/{habit_id}/logs", json={"date": "2026-03-01"})
    resp = client.post(
        f"/habits/{habit_id}/logs/backfill",
        json=[{"date": "2026-03-01"}, {"date": "2026-03-02"}],
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1  # only the new date


def test_list_logs_date_filter(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Cold shower", "period_type": "daily"})
    habit_id = resp.json()["id"]
    for d in range(1, 6):
        client.post(f"/habits/{habit_id}/logs", json={"date": f"2026-04-{d:02d}"})
    resp = client.get(f"/habits/{habit_id}/logs?start=2026-04-02&end=2026-04-04")
    assert resp.status_code == 200
    assert len(resp.json()) == 3


# ── Stats ──────────────────────────────────────────────────────────────────


def test_stats_empty(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "Stats test", "period_type": "daily"})
    habit_id = resp.json()["id"]
    resp = client.get(f"/habits/{habit_id}/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["weekly_total"] == 0.0
    assert data["current_streak"] == 0


def test_weekly_total_ref_date_selects_correct_week(client: TestClient, db: Session) -> None:
    """weekly_total counts only logs falling in the ISO week of ref_date.

    Uses direct service calls with explicit ref_date values so the test is
    independent of the server clock — this is the core logic the tz param relies on.
    """
    habit = HabitDefinition(name="ref_date test", period_type="daily")
    db.add(habit)
    db.flush()

    # Log Mon-Wed of 2026-W15 (Apr 6-8)
    for d_str in ["2026-04-06", "2026-04-07", "2026-04-08"]:
        db.add(HabitLog(habit_id=habit.id, date=date.fromisoformat(d_str), value=1.0))
    db.flush()

    # ref_date inside W15 → all three logs visible
    assert habit_calc.weekly_total(db, habit.id, ref_date=date(2026, 4, 8)) == 3.0

    # ref_date in W16 (starts Apr 13) → logs are last week, total = 0
    assert habit_calc.weekly_total(db, habit.id, ref_date=date(2026, 4, 13)) == 0.0


def test_stats_tz_param_accepted(client: TestClient) -> None:
    """?tz= is wired through to the stats endpoint and returns 200."""
    resp = client.post("/habits", json={"name": "TZ smoke", "period_type": "daily"})
    habit_id = resp.json()["id"]
    assert client.get(f"/habits/{habit_id}/stats?tz=America/New_York").status_code == 200
    assert client.get(f"/habits/{habit_id}/stats?tz=Asia/Tokyo").status_code == 200


def test_stats_invalid_tz_returns_400(client: TestClient) -> None:
    resp = client.post("/habits", json={"name": "TZ invalid", "period_type": "daily"})
    habit_id = resp.json()["id"]
    resp = client.get(f"/habits/{habit_id}/stats?tz=Not/AZone")
    assert resp.status_code == 400

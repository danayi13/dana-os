"""Nudge / reminder service — staleness detection and state transitions."""

from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import NudgeStateEnum
from app.models.habit import HabitActivationPeriod, HabitDefinition, HabitLog
from app.models.nudge import NudgeState, ReminderConfig
from app.schemas.nudge import NudgeStateOut, StaleHabitOut


def _utcnow() -> datetime:
    return datetime.now(tz=UTC)


def get_stale_habits(db: Session, today: date | None = None) -> list[StaleHabitOut]:
    """Return active habits whose last log is older than their reminder interval.

    A habit is included if:
    - it has at least one active activation period (starts_on ≤ today, ends_on
      is NULL or ≥ today, archived_at is NULL)
    - it has a ReminderConfig with enabled=True
    - the most recent HabitLog date is older than interval_days ago, or no log
      exists at all
    - its NudgeState is not "snoozed" (snoozed_until in the future) or "dismissed"

    Pass `today` from the client's local date (via `?tz=`) to avoid off-by-one-day
    issues at UTC midnight boundaries.
    """
    today = today or date.today()

    active_habit_ids: list[Any] = list(
        db.execute(
            select(HabitActivationPeriod.habit_id).where(
                HabitActivationPeriod.starts_on <= today,
                (HabitActivationPeriod.ends_on == None) | (HabitActivationPeriod.ends_on >= today),  # noqa: E711
                HabitActivationPeriod.archived_at == None,  # noqa: E711
            )
        )
        .scalars()
        .all()
    )

    if not active_habit_ids:
        return []

    configs = (
        db.execute(
            select(ReminderConfig).where(
                ReminderConfig.subject_type == "habit",
                ReminderConfig.subject_id.in_(active_habit_ids),
                ReminderConfig.enabled == True,  # noqa: E712
            )
        )
        .scalars()
        .all()
    )

    stale: list[StaleHabitOut] = []
    now = _utcnow()

    for config in configs:
        habit_id = config.subject_id

        latest_log = (
            db.execute(
                select(HabitLog).where(HabitLog.habit_id == habit_id).order_by(HabitLog.date.desc())
            )
            .scalars()
            .first()
        )

        last_logged = latest_log.created_at if latest_log else None
        last_date = latest_log.date if latest_log else None
        days_since = (today - last_date).days if last_date else 9999

        if days_since < config.interval_days:
            continue

        nudge = (
            db.execute(
                select(NudgeState).where(
                    NudgeState.subject_type == "habit",
                    NudgeState.subject_id == habit_id,
                )
            )
            .scalars()
            .first()
        )

        # Skip snoozed or dismissed nudges
        if nudge:
            if nudge.state == NudgeStateEnum.dismissed:
                continue
            if (
                nudge.state == NudgeStateEnum.snoozed
                and nudge.snoozed_until
                and nudge.snoozed_until > now
            ):
                continue

        habit = db.get(HabitDefinition, habit_id)
        if not habit:
            continue

        stale.append(
            StaleHabitOut(
                habit_id=habit_id,
                habit_name=habit.name,
                last_logged=last_logged,
                days_since_logged=days_since,
                nudge_state=NudgeStateOut.model_validate(nudge) if nudge else None,
            )
        )

    return stale


def _get_or_create_nudge(db: Session, subject_type: str, subject_id: Any) -> NudgeState:
    nudge = (
        db.execute(
            select(NudgeState).where(
                NudgeState.subject_type == subject_type,
                NudgeState.subject_id == subject_id,
            )
        )
        .scalars()
        .first()
    )

    if not nudge:
        nudge = NudgeState(
            subject_type=subject_type,
            subject_id=subject_id,
            state=NudgeStateEnum.active,
        )
        db.add(nudge)
        db.flush()

    return nudge


def snooze(db: Session, subject_type: str, subject_id: Any, days: int) -> NudgeState:
    nudge = _get_or_create_nudge(db, subject_type, subject_id)
    nudge.state = NudgeStateEnum.snoozed
    nudge.snoozed_until = _utcnow() + timedelta(days=days)
    nudge.updated_at = _utcnow()
    db.flush()
    return nudge


def dismiss(db: Session, subject_type: str, subject_id: Any) -> NudgeState:
    nudge = _get_or_create_nudge(db, subject_type, subject_id)
    nudge.state = NudgeStateEnum.dismissed
    nudge.dismissed_at = _utcnow()
    nudge.updated_at = _utcnow()
    db.flush()
    return nudge


def reset(db: Session, subject_type: str, subject_id: Any) -> NudgeState:
    nudge = _get_or_create_nudge(db, subject_type, subject_id)
    nudge.state = NudgeStateEnum.active
    nudge.snoozed_until = None
    nudge.dismissed_at = None
    nudge.updated_at = _utcnow()
    db.flush()
    return nudge


def reset_if_exists(db: Session, subject_type: str, subject_id: Any) -> None:
    """Re-arm an existing nudge without creating one if absent."""
    nudge = (
        db.execute(
            select(NudgeState).where(
                NudgeState.subject_type == subject_type,
                NudgeState.subject_id == subject_id,
            )
        )
        .scalars()
        .first()
    )
    if nudge:
        nudge.state = NudgeStateEnum.active
        nudge.snoozed_until = None
        nudge.dismissed_at = None
        nudge.updated_at = _utcnow()
        db.flush()

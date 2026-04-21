"""Habit definitions, activation periods, and logs."""

import uuid
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.dependencies import get_sheets_sync
from app.models.habit import HabitActivationPeriod, HabitDefinition, HabitLog
from app.models.nudge import NudgeState, ReminderConfig
from app.schemas.habit import (
    ActivationPeriodCreate,
    ActivationPeriodOut,
    HabitDefinitionCreate,
    HabitDefinitionOut,
    HabitDefinitionUpdate,
    HabitLogCreate,
    HabitLogOut,
    HabitLogUpdate,
    HabitStatsOut,
)
from app.services import habit_calc
from app.services import nudges as nudge_svc
from app.services.sheets_sync import SheetsSync
from app.utils import local_today

router = APIRouter(prefix="/habits", tags=["habits"])


def _get_habit_or_404(db: Session, habit_id: uuid.UUID) -> HabitDefinition:
    habit = db.get(HabitDefinition, habit_id)
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    return habit


# ── Definitions ────────────────────────────────────────────────────────────


@router.get("", response_model=list[HabitDefinitionOut])
def list_habits(db: Session = Depends(get_db)) -> list[HabitDefinition]:
    return list(db.execute(select(HabitDefinition).order_by(HabitDefinition.name)).scalars().all())


@router.post("", response_model=HabitDefinitionOut, status_code=status.HTTP_201_CREATED)
def create_habit(body: HabitDefinitionCreate, db: Session = Depends(get_db)) -> HabitDefinition:
    habit = HabitDefinition(**body.model_dump())
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.get("/{habit_id}", response_model=HabitDefinitionOut)
def get_habit(habit_id: uuid.UUID, db: Session = Depends(get_db)) -> HabitDefinition:
    return _get_habit_or_404(db, habit_id)


@router.patch("/{habit_id}", response_model=HabitDefinitionOut)
def update_habit(
    habit_id: uuid.UUID, body: HabitDefinitionUpdate, db: Session = Depends(get_db)
) -> HabitDefinition:
    habit = _get_habit_or_404(db, habit_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(habit, field, value)
    db.commit()
    db.refresh(habit)
    return habit


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit(habit_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    habit = _get_habit_or_404(db, habit_id)
    # nudge_states and reminder_config have no FK to habit_definitions (generic
    # subject pattern), so clean them up explicitly before deleting the habit.
    db.execute(
        delete(NudgeState).where(
            NudgeState.subject_type == "habit", NudgeState.subject_id == habit_id
        )
    )
    db.execute(
        delete(ReminderConfig).where(
            ReminderConfig.subject_type == "habit", ReminderConfig.subject_id == habit_id
        )
    )
    db.delete(habit)
    db.commit()


# ── Activation periods ─────────────────────────────────────────────────────


@router.post(
    "/{habit_id}/activate",
    response_model=ActivationPeriodOut,
    status_code=status.HTTP_201_CREATED,
)
def activate_habit(
    habit_id: uuid.UUID, body: ActivationPeriodCreate, db: Session = Depends(get_db)
) -> HabitActivationPeriod:
    _get_habit_or_404(db, habit_id)
    period = HabitActivationPeriod(habit_id=habit_id, **body.model_dump())
    db.add(period)
    db.commit()
    db.refresh(period)
    return period


@router.delete(
    "/{habit_id}/activate/{period_id}",
    response_model=ActivationPeriodOut,
)
def archive_activation(
    habit_id: uuid.UUID, period_id: uuid.UUID, db: Session = Depends(get_db)
) -> HabitActivationPeriod:
    _get_habit_or_404(db, habit_id)
    period = db.get(HabitActivationPeriod, period_id)
    if not period or period.habit_id != habit_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Activation period not found"
        )
    if period.archived_at:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already archived")
    period.archived_at = datetime.now(tz=UTC)
    db.commit()
    db.refresh(period)
    return period


@router.get("/{habit_id}/activate", response_model=list[ActivationPeriodOut])
def list_activations(
    habit_id: uuid.UUID, db: Session = Depends(get_db)
) -> list[HabitActivationPeriod]:
    _get_habit_or_404(db, habit_id)
    return list(
        db.execute(
            select(HabitActivationPeriod)
            .where(HabitActivationPeriod.habit_id == habit_id)
            .order_by(HabitActivationPeriod.starts_on.desc())
        )
        .scalars()
        .all()
    )


# ── Logs ───────────────────────────────────────────────────────────────────


@router.get("/{habit_id}/logs", response_model=list[HabitLogOut])
def list_logs(
    habit_id: uuid.UUID,
    start: date | None = None,
    end: date | None = None,
    db: Session = Depends(get_db),
) -> list[HabitLog]:
    _get_habit_or_404(db, habit_id)
    q = select(HabitLog).where(HabitLog.habit_id == habit_id)
    if start:
        q = q.where(HabitLog.date >= start)
    if end:
        q = q.where(HabitLog.date <= end)
    return list(db.execute(q.order_by(HabitLog.date.desc())).scalars().all())


@router.post(
    "/{habit_id}/logs",
    response_model=HabitLogOut,
    status_code=status.HTTP_201_CREATED,
)
def log_habit(
    habit_id: uuid.UUID,
    body: HabitLogCreate,
    db: Session = Depends(get_db),
    sheets: SheetsSync = Depends(get_sheets_sync),
) -> HabitLog:
    habit = _get_habit_or_404(db, habit_id)
    existing = (
        db.execute(
            select(HabitLog).where(HabitLog.habit_id == habit_id, HabitLog.date == body.date)
        )
        .scalars()
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Log already exists for {body.date}. Use PATCH to update.",
        )
    log = HabitLog(habit_id=habit_id, **body.model_dump())
    db.add(log)
    nudge_svc.reset_if_exists(db, "habit", habit_id)
    db.commit()
    db.refresh(log)
    _sync_log_to_sheet(sheets, habit, body.date, body.value, body.notes)
    return log


@router.post("/{habit_id}/logs/backfill", response_model=list[HabitLogOut])
def backfill_logs(
    habit_id: uuid.UUID,
    entries: list[HabitLogCreate],
    db: Session = Depends(get_db),
    sheets: SheetsSync = Depends(get_sheets_sync),
) -> list[HabitLog]:
    """Upsert multiple log entries — creates missing, skips existing."""
    habit = _get_habit_or_404(db, habit_id)
    created: list[HabitLog] = []
    for entry in entries:
        existing = (
            db.execute(
                select(HabitLog).where(HabitLog.habit_id == habit_id, HabitLog.date == entry.date)
            )
            .scalars()
            .first()
        )
        if existing:
            continue
        log = HabitLog(habit_id=habit_id, **entry.model_dump())
        db.add(log)
        created.append(log)
    if created:
        nudge_svc.reset_if_exists(db, "habit", habit_id)
    db.commit()
    for log in created:
        db.refresh(log)
        _sync_log_to_sheet(sheets, habit, log.date, log.value, log.notes)
    return created


@router.patch("/{habit_id}/logs/{log_id}", response_model=HabitLogOut)
def update_log(
    habit_id: uuid.UUID,
    log_id: uuid.UUID,
    body: HabitLogUpdate,
    db: Session = Depends(get_db),
) -> HabitLog:
    _get_habit_or_404(db, habit_id)
    log = db.get(HabitLog, log_id)
    if not log or log.habit_id != habit_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{habit_id}/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(habit_id: uuid.UUID, log_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    _get_habit_or_404(db, habit_id)
    log = db.get(HabitLog, log_id)
    if not log or log.habit_id != habit_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
    db.delete(log)
    db.commit()


# ── Stats ──────────────────────────────────────────────────────────────────


@router.get("/{habit_id}/stats", response_model=HabitStatsOut)
def get_stats(
    habit_id: uuid.UUID,
    tz: str | None = None,
    db: Session = Depends(get_db),
) -> HabitStatsOut:
    """Return habit stats for the client's current ISO week.

    Pass `?tz=America/Los_Angeles` (any IANA timezone) so the server computes
    week boundaries in the client's local time instead of server UTC.
    """
    _get_habit_or_404(db, habit_id)
    ref_date = local_today(tz)
    return HabitStatsOut(
        habit_id=habit_id,
        weekly_total=habit_calc.weekly_total(db, habit_id, ref_date),
        weekly_average=habit_calc.weekly_average(db, habit_id, ref_date=ref_date),
        current_streak=habit_calc.current_streak(db, habit_id, ref_date),
    )


def _sync_log_to_sheet(
    sheets: SheetsSync,
    habit: HabitDefinition,
    log_date: date,
    value: float,
    notes: str | None,
) -> None:
    """Write a log entry to the habits spreadsheet if the habit has sheet_col configured."""
    cfg: dict[str, str] = habit.period_config or {}
    col = cfg.get("sheet_col")
    if not col:
        return
    sheet_type = cfg.get("sheet_type", "numeric")
    if sheet_type == "checkbox":
        cell_value: object = "TRUE"
    elif sheet_type == "text":
        cell_value = notes or ""
    else:
        cell_value = value
    tab = get_settings().habits_sheet_tab
    sheets.write_habit_log(log_date, tab, col, cell_value)

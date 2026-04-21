"""Nudge and reminder configuration endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.nudge import NudgeState, ReminderConfig
from app.schemas.nudge import (
    NudgeStateOut,
    ReminderConfigCreate,
    ReminderConfigOut,
    ReminderConfigUpdate,
    SnoozeRequest,
    StaleHabitOut,
)
from app.services import nudges as nudge_svc
from app.utils import local_today

router = APIRouter(prefix="/nudges", tags=["nudges"])


# ── Reminder configs ───────────────────────────────────────────────────────


@router.get("/reminders", response_model=list[ReminderConfigOut])
def list_reminders(db: Session = Depends(get_db)) -> list[ReminderConfig]:
    return list(db.execute(select(ReminderConfig)).scalars().all())


@router.post("/reminders", response_model=ReminderConfigOut, status_code=status.HTTP_201_CREATED)
def create_reminder(body: ReminderConfigCreate, db: Session = Depends(get_db)) -> ReminderConfig:
    config = ReminderConfig(**body.model_dump())
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@router.patch("/reminders/{reminder_id}", response_model=ReminderConfigOut)
def update_reminder(
    reminder_id: uuid.UUID, body: ReminderConfigUpdate, db: Session = Depends(get_db)
) -> ReminderConfig:
    config = db.get(ReminderConfig, reminder_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Reminder config not found"
        )
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(config, field, value)
    db.commit()
    db.refresh(config)
    return config


@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(reminder_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    config = db.get(ReminderConfig, reminder_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Reminder config not found"
        )
    db.delete(config)
    db.commit()


# ── Stale habits ───────────────────────────────────────────────────────────


@router.get("/stale", response_model=list[StaleHabitOut])
def list_stale_habits(
    tz: str | None = None,
    db: Session = Depends(get_db),
) -> list[StaleHabitOut]:
    return nudge_svc.get_stale_habits(db, today=local_today(tz))


# ── Nudge state machine ────────────────────────────────────────────────────


@router.post("/habits/{habit_id}/snooze", response_model=NudgeStateOut)
def snooze_habit(
    habit_id: uuid.UUID, body: SnoozeRequest, db: Session = Depends(get_db)
) -> NudgeState:
    nudge = nudge_svc.snooze(db, "habit", habit_id, body.days)
    db.commit()
    db.refresh(nudge)
    return nudge


@router.post("/habits/{habit_id}/dismiss", response_model=NudgeStateOut)
def dismiss_habit(habit_id: uuid.UUID, db: Session = Depends(get_db)) -> NudgeState:
    nudge = nudge_svc.dismiss(db, "habit", habit_id)
    db.commit()
    db.refresh(nudge)
    return nudge


@router.post("/habits/{habit_id}/reset", response_model=NudgeStateOut)
def reset_habit(habit_id: uuid.UUID, db: Session = Depends(get_db)) -> NudgeState:
    nudge = nudge_svc.reset(db, "habit", habit_id)
    db.commit()
    db.refresh(nudge)
    return nudge

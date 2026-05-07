"""Pydantic schemas for the climbing tracker."""

import json
import uuid
from datetime import date as _Date
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import GymType, VGrade


def _parse_companions(raw: Any) -> list[str] | None:
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str) and raw not in ("", "null"):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, list) else None
        except (ValueError, TypeError):
            pass
    return None


# ── Gyms ──────────────────────────────────────────────────────────────────────


class GymCreate(BaseModel):
    name: str
    location: str | None = None
    gym_type: GymType = GymType.recurring


class GymUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    gym_type: GymType | None = None


class GymOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    location: str | None
    gym_type: GymType
    created_at: datetime


# ── Sessions ──────────────────────────────────────────────────────────────────


class ClimbingSessionCreate(BaseModel):
    date: _Date
    gym_id: uuid.UUID | None = None
    duration_minutes: int | None = None
    max_grade: VGrade | None = None
    companions: list[str] | None = None
    notes: str | None = None


class ClimbingSessionUpdate(BaseModel):
    date: _Date | None = None
    gym_id: uuid.UUID | None = None
    duration_minutes: int | None = None
    max_grade: VGrade | None = None
    companions: list[str] | None = None
    notes: str | None = None


class ClimbingSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    date: _Date
    gym_id: uuid.UUID | None
    gym_name: str | None = None
    duration_minutes: int | None
    max_grade: VGrade | None
    companions: list[str] | None
    notes: str | None
    created_at: datetime

    @classmethod
    def from_orm_with_gym(cls, session: object) -> "ClimbingSessionOut":
        from app.models.climbing import ClimbingSession

        s: ClimbingSession = session  # type: ignore[assignment]
        companions = _parse_companions(s.companions)
        return cls(
            id=s.id,
            date=s.date,
            gym_id=s.gym_id,
            gym_name=s.gym.name if s.gym else None,
            duration_minutes=s.duration_minutes,
            max_grade=s.max_grade,
            companions=companions,
            notes=s.notes,
            created_at=s.created_at,
        )


# ── Stats ─────────────────────────────────────────────────────────────────────


class GradeProgressionPoint(BaseModel):
    date: _Date
    grade: VGrade
    grade_int: int


class MonthlyVolume(BaseModel):
    month: str  # "YYYY-MM"
    count: int
    total_minutes: int | None


class GymStats(BaseModel):
    gym_id: uuid.UUID
    name: str
    gym_type: GymType
    visit_count: int
    total_minutes: int | None
    last_visit: _Date | None
    days_since_last: int | None


class FirstPerGrade(BaseModel):
    grade: VGrade
    grade_int: int
    first_date: _Date


class CompanionStats(BaseModel):
    name: str
    session_count: int
    last_climbed: _Date | None


class ClimbingStatsOut(BaseModel):
    grade_progression: list[GradeProgressionPoint]
    monthly_volume: list[MonthlyVolume]
    gym_stats: list[GymStats]
    first_per_grade: list[FirstPerGrade]
    companion_stats: list[CompanionStats]
    total_sessions: int
    total_minutes: int | None


# ── Nudge ─────────────────────────────────────────────────────────────────────


class ClimbingNudgeOut(BaseModel):
    is_stale: bool
    days_since_last: int | None
    last_session_date: _Date | None
    nudge_state: str | None  # "active" | "snoozed" | "dismissed" | None
    snoozed_until: datetime | None = None


class ClimbingReminderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    interval_days: int
    enabled: bool


class ClimbingReminderUpdate(BaseModel):
    interval_days: int | None = None
    enabled: bool | None = None


class SnoozeRequest(BaseModel):
    days: int

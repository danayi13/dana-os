import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import GoalDirection, PeriodType

__all__ = ["GoalDirection", "PeriodType"]


# ── HabitDefinition ────────────────────────────────────────────────────────


class HabitDefinitionCreate(BaseModel):
    name: str
    description: str | None = None
    period_type: PeriodType
    unit: str | None = None
    target: float | None = None
    direction: GoalDirection = GoalDirection.track
    period_config: dict[str, Any] | None = None


class HabitDefinitionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    period_type: PeriodType | None = None
    unit: str | None = None
    target: float | None = None
    direction: GoalDirection | None = None
    period_config: dict[str, Any] | None = None


class HabitDefinitionOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    period_type: PeriodType
    unit: str | None
    target: float | None
    direction: GoalDirection
    period_config: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── HabitActivationPeriod ──────────────────────────────────────────────────


class ActivationPeriodCreate(BaseModel):
    starts_on: date
    ends_on: date | None = None


class ActivationPeriodOut(BaseModel):
    id: uuid.UUID
    habit_id: uuid.UUID
    starts_on: date
    ends_on: date | None
    archived_at: datetime | None

    model_config = {"from_attributes": True}


# ── HabitLog ───────────────────────────────────────────────────────────────


class HabitLogCreate(BaseModel):
    date: date
    value: float = Field(default=1.0, gt=0)
    notes: str | None = None


class HabitLogUpdate(BaseModel):
    value: float | None = Field(default=None, gt=0)
    notes: str | None = None


class HabitLogOut(BaseModel):
    id: uuid.UUID
    habit_id: uuid.UUID
    date: date
    value: float
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Computed stats ─────────────────────────────────────────────────────────


class HabitStatsOut(BaseModel):
    habit_id: uuid.UUID
    weekly_total: float
    weekly_average: float
    current_streak: int

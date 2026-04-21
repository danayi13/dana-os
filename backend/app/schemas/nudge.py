import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import NudgeStateEnum

__all__ = ["NudgeStateEnum"]


class SnoozeDuration(int, enum.Enum):
    one_day = 1
    three_days = 3
    one_week = 7
    two_weeks = 14


class ReminderConfigCreate(BaseModel):
    subject_type: str
    subject_id: uuid.UUID
    interval_days: int = Field(gt=0)
    enabled: bool = True


class ReminderConfigUpdate(BaseModel):
    interval_days: int | None = Field(default=None, gt=0)
    enabled: bool | None = None


class ReminderConfigOut(BaseModel):
    id: uuid.UUID
    subject_type: str
    subject_id: uuid.UUID
    interval_days: int
    enabled: bool

    model_config = {"from_attributes": True}


class SnoozeRequest(BaseModel):
    days: SnoozeDuration


class NudgeStateOut(BaseModel):
    id: uuid.UUID
    subject_type: str
    subject_id: uuid.UUID
    state: NudgeStateEnum
    snoozed_until: datetime | None
    dismissed_at: datetime | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class StaleHabitOut(BaseModel):
    habit_id: uuid.UUID
    habit_name: str
    last_logged: datetime | None
    days_since_logged: int
    nudge_state: NudgeStateOut | None

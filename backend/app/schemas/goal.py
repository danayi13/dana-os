import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import GoalDirection, GoalStatus, GoalType

__all__ = ["GoalDirection", "GoalStatus", "GoalType"]


class GoalCreate(BaseModel):
    year: int
    type: GoalType
    name: str
    direction: GoalDirection = GoalDirection.at_least
    target_value: float | None = None
    current_value: float | None = None
    linked_module: str | None = None
    notes: str | None = None


class GoalUpdate(BaseModel):
    name: str | None = None
    direction: GoalDirection | None = None
    target_value: float | None = None
    current_value: float | None = None
    linked_module: str | None = None
    notes: str | None = None
    status: GoalStatus | None = None


class GoalProgressUpdate(BaseModel):
    current_value: float


class GoalOut(BaseModel):
    id: uuid.UUID
    year: int
    type: GoalType
    name: str
    direction: GoalDirection
    target_value: float | None
    current_value: float | None
    linked_module: str | None
    status: GoalStatus
    notes: str | None
    completed_at: datetime | None
    archived_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}

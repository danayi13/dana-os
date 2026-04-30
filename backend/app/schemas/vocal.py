import uuid
from datetime import date as Date
from datetime import datetime

from pydantic import BaseModel


class VocalLessonCreate(BaseModel):
    date: Date
    repertoire: list[str] | None = None
    reflection: str | None = None


class VocalLessonUpdate(BaseModel):
    date: Date | None = None
    repertoire: list[str] | None = None
    reflection: str | None = None


class VocalLessonOut(BaseModel):
    id: uuid.UUID
    date: Date
    repertoire: list[str] | None
    reflection: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MonthlyFrequency(BaseModel):
    month: str  # "2026-03"
    count: int


class RepertoirePiece(BaseModel):
    piece: str
    count: int


class VocalStatsOut(BaseModel):
    monthly_frequency: list[MonthlyFrequency]
    repertoire_counts: list[RepertoirePiece]
    total_lessons: int
    lessons_this_year: int

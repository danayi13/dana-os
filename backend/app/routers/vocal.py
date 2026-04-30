"""Vocal lesson CRUD + stats."""

import uuid
from collections import Counter
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.dependencies import get_vocal_sheets_sync
from app.models.vocal import VocalLesson
from app.schemas.vocal import (
    MonthlyFrequency,
    RepertoirePiece,
    VocalLessonCreate,
    VocalLessonOut,
    VocalLessonUpdate,
    VocalStatsOut,
)
from app.services.sheets_sync import SheetsSync

router = APIRouter(prefix="/vocal-lessons", tags=["vocal"])


def _get_or_404(db: Session, lesson_id: uuid.UUID) -> VocalLesson:
    lesson = db.get(VocalLesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson


@router.get("", response_model=list[VocalLessonOut])
def list_lessons(
    start: date | None = None,
    end: date | None = None,
    db: Session = Depends(get_db),
) -> list[VocalLesson]:
    q = select(VocalLesson)
    if start:
        q = q.where(VocalLesson.date >= start)
    if end:
        q = q.where(VocalLesson.date <= end)
    return list(db.execute(q.order_by(VocalLesson.date.desc())).scalars().all())


# /stats must be declared before /{lesson_id} to avoid route shadowing
@router.get("/stats", response_model=VocalStatsOut)
def get_stats(db: Session = Depends(get_db)) -> VocalStatsOut:
    all_lessons = list(db.execute(select(VocalLesson).order_by(VocalLesson.date)).scalars().all())

    monthly: Counter[str] = Counter()
    for lesson in all_lessons:
        monthly[lesson.date.strftime("%Y-%m")] += 1
    monthly_frequency = [MonthlyFrequency(month=m, count=c) for m, c in sorted(monthly.items())]

    piece_counter: Counter[str] = Counter()
    for lesson in all_lessons:
        for piece in lesson.repertoire or []:
            piece_counter[piece] += 1
    repertoire_counts = [RepertoirePiece(piece=p, count=c) for p, c in piece_counter.most_common()]

    this_year = datetime.now(tz=UTC).year
    lessons_this_year = sum(1 for lesson in all_lessons if lesson.date.year == this_year)

    return VocalStatsOut(
        monthly_frequency=monthly_frequency,
        repertoire_counts=repertoire_counts,
        total_lessons=len(all_lessons),
        lessons_this_year=lessons_this_year,
    )


@router.post("/backfill", response_model=list[VocalLessonOut])
def backfill_lessons(
    entries: list[VocalLessonCreate],
    db: Session = Depends(get_db),
    sheets: SheetsSync = Depends(get_vocal_sheets_sync),
) -> list[VocalLesson]:
    """Upsert multiple lessons by date — creates missing, updates existing."""
    upserted: list[VocalLesson] = []
    for entry in entries:
        existing = (
            db.execute(select(VocalLesson).where(VocalLesson.date == entry.date)).scalars().first()
        )
        if existing:
            for field, value in entry.model_dump(exclude_unset=True).items():
                setattr(existing, field, value)
            upserted.append(existing)
        else:
            lesson = VocalLesson(**entry.model_dump())
            db.add(lesson)
            upserted.append(lesson)
    db.commit()
    for lesson in upserted:
        db.refresh(lesson)
        _sync_to_sheet(sheets, lesson)
    return upserted


@router.post("", response_model=VocalLessonOut, status_code=status.HTTP_201_CREATED)
def create_lesson(
    body: VocalLessonCreate,
    db: Session = Depends(get_db),
    sheets: SheetsSync = Depends(get_vocal_sheets_sync),
) -> VocalLesson:
    existing = (
        db.execute(select(VocalLesson).where(VocalLesson.date == body.date)).scalars().first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Lesson already exists for {body.date}. Use PATCH to update.",
        )
    lesson = VocalLesson(**body.model_dump())
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    _sync_to_sheet(sheets, lesson)
    return lesson


@router.get("/{lesson_id}", response_model=VocalLessonOut)
def get_lesson(lesson_id: uuid.UUID, db: Session = Depends(get_db)) -> VocalLesson:
    return _get_or_404(db, lesson_id)


@router.patch("/{lesson_id}", response_model=VocalLessonOut)
def update_lesson(
    lesson_id: uuid.UUID,
    body: VocalLessonUpdate,
    db: Session = Depends(get_db),
    sheets: SheetsSync = Depends(get_vocal_sheets_sync),
) -> VocalLesson:
    lesson = _get_or_404(db, lesson_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)
    db.commit()
    db.refresh(lesson)
    _sync_to_sheet(sheets, lesson)
    return lesson


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(lesson_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    lesson = _get_or_404(db, lesson_id)
    db.delete(lesson)
    db.commit()


def _sync_to_sheet(sheets: SheetsSync, lesson: VocalLesson) -> None:
    tab = get_settings().vocal_sheet_tab
    sheets.write_vocal_lesson(
        lesson_date=lesson.date,
        repertoire=lesson.repertoire,
        reflection=lesson.reflection,
        tab=tab,
    )

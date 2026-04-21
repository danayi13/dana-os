"""Habit statistics calculations."""

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.habit import HabitLog


def weekly_total(db: Session, habit_id: object, ref_date: date | None = None) -> float:
    """Sum of log values for the ISO week containing `ref_date` (default today)."""
    ref = ref_date or date.today()
    week_start = ref - timedelta(days=ref.weekday())
    week_end = week_start + timedelta(days=6)

    rows = (
        db.execute(
            select(HabitLog.value).where(
                HabitLog.habit_id == habit_id,
                HabitLog.date >= week_start,
                HabitLog.date <= week_end,
            )
        )
        .scalars()
        .all()
    )
    return sum(rows)


def weekly_average(
    db: Session, habit_id: object, weeks: int = 4, ref_date: date | None = None
) -> float:
    """Mean weekly total over the last `weeks` ISO weeks (not counting current)."""
    today = ref_date or date.today()
    current_week_start = today - timedelta(days=today.weekday())

    totals: list[float] = []
    for i in range(1, weeks + 1):
        week_start = current_week_start - timedelta(weeks=i)
        week_end = week_start + timedelta(days=6)
        rows = (
            db.execute(
                select(HabitLog.value).where(
                    HabitLog.habit_id == habit_id,
                    HabitLog.date >= week_start,
                    HabitLog.date <= week_end,
                )
            )
            .scalars()
            .all()
        )
        totals.append(sum(rows))

    return sum(totals) / len(totals) if totals else 0.0


def current_streak(db: Session, habit_id: object, ref_date: date | None = None) -> int:
    """Number of consecutive days ending today (or yesterday) with a log entry."""
    today = ref_date or date.today()
    logged_dates: set[date] = set(
        db.execute(select(HabitLog.date).where(HabitLog.habit_id == habit_id)).scalars().all()
    )

    streak = 0
    check = today
    # If today not logged yet, start streak check from yesterday
    if check not in logged_dates:
        check = today - timedelta(days=1)

    while check in logged_dates:
        streak += 1
        check -= timedelta(days=1)

    return streak

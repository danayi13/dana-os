"""Climbing tracker — gyms, sessions, stats, and nudge."""

import uuid
from collections import defaultdict
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_climbing_sheets_sync
from app.models.climbing import ClimbingSession, Gym
from app.models.enums import VGrade
from app.models.nudge import NudgeState, ReminderConfig
from app.schemas.climbing import (
    ClimbingNudgeOut,
    ClimbingReminderOut,
    ClimbingReminderUpdate,
    ClimbingSessionCreate,
    ClimbingSessionOut,
    ClimbingSessionUpdate,
    ClimbingStatsOut,
    CompanionStats,
    FirstPerGrade,
    GradeProgressionPoint,
    GymCreate,
    GymOut,
    GymStats,
    GymUpdate,
    MonthlyVolume,
    SnoozeRequest,
)
from app.services import nudges as nudge_svc
from app.services.sheets_sync import SheetsSync

router = APIRouter(prefix="/climbing", tags=["climbing"])

# Fixed UUID that identifies the single climbing ReminderConfig + NudgeState.
# Must match CLIMBING_SUBJECT_ID in migration 0004.
CLIMBING_SUBJECT_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


# ── Helpers ───────────────────────────────────────────────────────────────────


def _get_gym_or_404(db: Session, gym_id: uuid.UUID) -> Gym:
    gym = db.get(Gym, gym_id)
    if not gym:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
    return gym


def _get_session_or_404(db: Session, session_id: uuid.UUID) -> ClimbingSession:
    s = db.get(ClimbingSession, session_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return s


def _get_reminder_config(db: Session) -> ReminderConfig:
    config = (
        db.execute(
            select(ReminderConfig).where(
                ReminderConfig.subject_type == "climbing",
                ReminderConfig.subject_id == CLIMBING_SUBJECT_ID,
            )
        )
        .scalars()
        .first()
    )
    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Climbing reminder config not seeded — run alembic upgrade head",
        )
    return config


def _sync_session(
    sheets: SheetsSync,
    session: ClimbingSession,
    settings_tab: str,
) -> None:
    from app.config import get_settings

    tab = get_settings().climbing_sheet_tab
    gym_name = session.gym.name if session.gym else None
    sheets.write_climbing_session(
        session_date=session.date,
        gym_name=gym_name,
        duration_minutes=session.duration_minutes,
        companions=session.companions,
        notes=session.notes,
        tab=tab,
    )


# ── Gyms ──────────────────────────────────────────────────────────────────────


@router.get("/gyms", response_model=list[GymOut])
def list_gyms(db: Session = Depends(get_db)) -> list[Gym]:
    return list(db.execute(select(Gym).order_by(Gym.gym_type, Gym.name)).scalars().all())


@router.post("/gyms", response_model=GymOut, status_code=status.HTTP_201_CREATED)
def create_gym(body: GymCreate, db: Session = Depends(get_db)) -> Gym:
    gym = Gym(**body.model_dump())
    db.add(gym)
    db.commit()
    db.refresh(gym)
    return gym


@router.patch("/gyms/{gym_id}", response_model=GymOut)
def update_gym(gym_id: uuid.UUID, body: GymUpdate, db: Session = Depends(get_db)) -> Gym:
    gym = _get_gym_or_404(db, gym_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(gym, field, value)
    db.commit()
    db.refresh(gym)
    return gym


@router.delete("/gyms/{gym_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gym(gym_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    gym = _get_gym_or_404(db, gym_id)
    has_sessions = (
        db.execute(select(ClimbingSession.id).where(ClimbingSession.gym_id == gym_id).limit(1))
        .scalars()
        .first()
    )
    if has_sessions:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete gym with existing sessions. Reassign sessions first.",
        )
    db.delete(gym)
    db.commit()


# ── Sessions ──────────────────────────────────────────────────────────────────


@router.get("/sessions", response_model=list[ClimbingSessionOut])
def list_sessions(
    start: date | None = None,
    end: date | None = None,
    db: Session = Depends(get_db),
) -> list[ClimbingSessionOut]:
    q = select(ClimbingSession)
    if start:
        q = q.where(ClimbingSession.date >= start)
    if end:
        q = q.where(ClimbingSession.date <= end)
    sessions = list(db.execute(q.order_by(ClimbingSession.date.desc())).scalars().all())
    return [ClimbingSessionOut.from_orm_with_gym(s) for s in sessions]


# /stats and /nudge must be declared before /{session_id} to avoid shadowing
@router.get("/sessions/stats", response_model=ClimbingStatsOut)
def get_stats(db: Session = Depends(get_db)) -> ClimbingStatsOut:
    all_sessions = list(
        db.execute(select(ClimbingSession).order_by(ClimbingSession.date)).scalars().all()
    )

    # Grade progression — exclude sessions without a grade
    grade_progression = [
        GradeProgressionPoint(
            date=s.date,
            grade=s.max_grade,
            grade_int=s.max_grade.to_int(),
        )
        for s in all_sessions
        if s.max_grade is not None
    ]

    # Monthly volume
    monthly: dict[str, dict[str, int | None]] = defaultdict(
        lambda: {"count": 0, "total_minutes": None}
    )
    for s in all_sessions:
        key = s.date.strftime("%Y-%m")
        monthly[key]["count"] = int(monthly[key]["count"] or 0) + 1  # type: ignore[arg-type]
        if s.duration_minutes is not None:
            prev = monthly[key]["total_minutes"] or 0
            monthly[key]["total_minutes"] = int(prev) + s.duration_minutes
    monthly_volume = [
        MonthlyVolume(
            month=m,
            count=int(v["count"] or 0),
            total_minutes=int(v["total_minutes"]) if v["total_minutes"] is not None else None,
        )
        for m, v in sorted(monthly.items())
    ]

    # Gym stats
    all_gyms = list(db.execute(select(Gym)).scalars().all())
    today = date.today()
    gym_stats_list: list[GymStats] = []
    for gym in all_gyms:
        gym_sessions = [s for s in all_sessions if s.gym_id == gym.id]
        if not gym_sessions:
            gym_stats_list.append(
                GymStats(
                    gym_id=gym.id,
                    name=gym.name,
                    gym_type=gym.gym_type,
                    visit_count=0,
                    total_minutes=None,
                    last_visit=None,
                    days_since_last=None,
                )
            )
            continue
        total_min = sum(s.duration_minutes for s in gym_sessions if s.duration_minutes is not None)
        last_visit = max(s.date for s in gym_sessions)
        gym_stats_list.append(
            GymStats(
                gym_id=gym.id,
                name=gym.name,
                gym_type=gym.gym_type,
                visit_count=len(gym_sessions),
                total_minutes=total_min or None,
                last_visit=last_visit,
                days_since_last=(today - last_visit).days,
            )
        )
    gym_stats_list.sort(key=lambda g: (-g.visit_count, g.name))

    # First per grade — earliest session for each V-grade
    first_per_grade_map: dict[VGrade, date] = {}
    for s in all_sessions:
        if s.max_grade is not None and s.max_grade not in first_per_grade_map:
            first_per_grade_map[s.max_grade] = s.date
    first_per_grade = sorted(
        [
            FirstPerGrade(grade=g, grade_int=g.to_int(), first_date=d)
            for g, d in first_per_grade_map.items()
        ],
        key=lambda x: x.grade_int,
    )

    total_minutes_all = sum(
        s.duration_minutes for s in all_sessions if s.duration_minutes is not None
    )

    # Companion frequency — unnest the JSONB companions array and count per name
    companion_rows = db.execute(
        text(
            "SELECT companion, COUNT(*) AS session_count, MAX(date) AS last_climbed"
            " FROM climbing_sessions,"
            " LATERAL jsonb_array_elements_text(companions::jsonb) AS companion"
            " WHERE companions IS NOT NULL"
            "   AND jsonb_typeof(companions::jsonb) = 'array'"
            " GROUP BY companion"
            " ORDER BY session_count DESC, companion"
        )
    ).fetchall()
    companion_stats = [
        CompanionStats(name=row[0], session_count=row[1], last_climbed=row[2])
        for row in companion_rows
    ]

    return ClimbingStatsOut(
        grade_progression=grade_progression,
        monthly_volume=monthly_volume,
        gym_stats=gym_stats_list,
        first_per_grade=first_per_grade,
        companion_stats=companion_stats,
        total_sessions=len(all_sessions),
        total_minutes=total_minutes_all or None,
    )


@router.get("/sessions/nudge", response_model=ClimbingNudgeOut)
def get_nudge(db: Session = Depends(get_db)) -> ClimbingNudgeOut:
    config = _get_reminder_config(db)

    latest = (
        db.execute(select(ClimbingSession).order_by(ClimbingSession.date.desc()).limit(1))
        .scalars()
        .first()
    )

    today = date.today()
    last_date = latest.date if latest else None
    days_since = (today - last_date).days if last_date else None

    is_stale = config.enabled and (days_since is None or days_since >= config.interval_days)

    nudge = (
        db.execute(
            select(NudgeState).where(
                NudgeState.subject_type == "climbing",
                NudgeState.subject_id == CLIMBING_SUBJECT_ID,
            )
        )
        .scalars()
        .first()
    )

    now = datetime.now(tz=UTC)
    nudge_state_str: str | None = None
    snoozed_until: datetime | None = None

    if nudge and is_stale:
        from app.models.enums import NudgeStateEnum

        if nudge.state == NudgeStateEnum.dismissed:
            is_stale = False
        elif (
            nudge.state == NudgeStateEnum.snoozed
            and nudge.snoozed_until
            and nudge.snoozed_until > now
        ):
            is_stale = False
            snoozed_until = nudge.snoozed_until
        nudge_state_str = nudge.state.value if nudge else None

    return ClimbingNudgeOut(
        is_stale=is_stale,
        days_since_last=days_since,
        last_session_date=last_date,
        nudge_state=nudge_state_str,
        snoozed_until=snoozed_until,
    )


@router.post("/sessions/nudge/snooze", response_model=ClimbingNudgeOut)
def snooze_nudge(body: SnoozeRequest, db: Session = Depends(get_db)) -> ClimbingNudgeOut:
    nudge_svc.snooze(db, "climbing", CLIMBING_SUBJECT_ID, body.days)
    db.commit()
    return get_nudge(db)


@router.post("/sessions/nudge/dismiss", response_model=ClimbingNudgeOut)
def dismiss_nudge(db: Session = Depends(get_db)) -> ClimbingNudgeOut:
    nudge_svc.dismiss(db, "climbing", CLIMBING_SUBJECT_ID)
    db.commit()
    return get_nudge(db)


@router.post("/sessions/nudge/reset", response_model=ClimbingNudgeOut)
def reset_nudge(db: Session = Depends(get_db)) -> ClimbingNudgeOut:
    nudge_svc.reset(db, "climbing", CLIMBING_SUBJECT_ID)
    db.commit()
    return get_nudge(db)


@router.get("/sessions/reminder", response_model=ClimbingReminderOut)
def get_reminder(db: Session = Depends(get_db)) -> ReminderConfig:
    return _get_reminder_config(db)


@router.patch("/sessions/reminder", response_model=ClimbingReminderOut)
def update_reminder(body: ClimbingReminderUpdate, db: Session = Depends(get_db)) -> ReminderConfig:
    config = _get_reminder_config(db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(config, field, value)
    db.commit()
    db.refresh(config)
    return config


@router.post("/sessions", response_model=ClimbingSessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    body: ClimbingSessionCreate,
    db: Session = Depends(get_db),
    sheets: SheetsSync = Depends(get_climbing_sheets_sync),
) -> ClimbingSessionOut:
    if body.gym_id:
        _get_gym_or_404(db, body.gym_id)
    session = ClimbingSession(**body.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    nudge_svc.reset_if_exists(db, "climbing", CLIMBING_SUBJECT_ID)
    db.commit()
    from app.config import get_settings

    _sync_session(sheets, session, get_settings().climbing_sheet_tab)
    return ClimbingSessionOut.from_orm_with_gym(session)


@router.get("/sessions/{session_id}", response_model=ClimbingSessionOut)
def get_session(session_id: uuid.UUID, db: Session = Depends(get_db)) -> ClimbingSessionOut:
    return ClimbingSessionOut.from_orm_with_gym(_get_session_or_404(db, session_id))


@router.patch("/sessions/{session_id}", response_model=ClimbingSessionOut)
def update_session(
    session_id: uuid.UUID,
    body: ClimbingSessionUpdate,
    db: Session = Depends(get_db),
    sheets: SheetsSync = Depends(get_climbing_sheets_sync),
) -> ClimbingSessionOut:
    session = _get_session_or_404(db, session_id)
    if body.gym_id is not None:
        _get_gym_or_404(db, body.gym_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    db.commit()
    db.refresh(session)
    from app.config import get_settings

    _sync_session(sheets, session, get_settings().climbing_sheet_tab)
    return ClimbingSessionOut.from_orm_with_gym(session)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    session = _get_session_or_404(db, session_id)
    db.delete(session)
    db.commit()

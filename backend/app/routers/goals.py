"""Goals CRUD + lifecycle transitions."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.enums import GoalStatus, GoalType
from app.models.goal import Goal
from app.models.nudge import NudgeState, ReminderConfig
from app.schemas.goal import GoalCreate, GoalOut, GoalProgressUpdate, GoalUpdate

router = APIRouter(prefix="/goals", tags=["goals"])


def _get_goal_or_404(db: Session, goal_id: uuid.UUID) -> Goal:
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    return goal


@router.get("", response_model=list[GoalOut])
def list_goals(
    year: int | None = None,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
) -> list[Goal]:
    q = select(Goal)
    if year is not None:
        q = q.where(Goal.year == year)
    if status_filter:
        q = q.where(Goal.status == status_filter)
    return list(db.execute(q.order_by(Goal.year.desc(), Goal.name)).scalars().all())


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(body: GoalCreate, db: Session = Depends(get_db)) -> Goal:
    goal = Goal(**body.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/{goal_id}", response_model=GoalOut)
def get_goal(goal_id: uuid.UUID, db: Session = Depends(get_db)) -> Goal:
    return _get_goal_or_404(db, goal_id)


@router.patch("/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: uuid.UUID, body: GoalUpdate, db: Session = Depends(get_db)) -> Goal:
    goal = _get_goal_or_404(db, goal_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    goal = _get_goal_or_404(db, goal_id)
    db.execute(
        delete(NudgeState).where(
            NudgeState.subject_type == "goal", NudgeState.subject_id == goal_id
        )
    )
    db.execute(
        delete(ReminderConfig).where(
            ReminderConfig.subject_type == "goal", ReminderConfig.subject_id == goal_id
        )
    )
    db.delete(goal)
    db.commit()


@router.post("/{goal_id}/complete", response_model=GoalOut)
def complete_goal(goal_id: uuid.UUID, db: Session = Depends(get_db)) -> Goal:
    goal = _get_goal_or_404(db, goal_id)
    if goal.status == GoalStatus.completed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Goal already completed")
    goal.status = GoalStatus.completed
    goal.completed_at = datetime.now(tz=UTC)
    db.commit()
    db.refresh(goal)
    return goal


@router.post("/{goal_id}/archive", response_model=GoalOut)
def archive_goal(goal_id: uuid.UUID, db: Session = Depends(get_db)) -> Goal:
    goal = _get_goal_or_404(db, goal_id)
    if goal.status == GoalStatus.archived:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Goal already archived")
    goal.status = GoalStatus.archived
    goal.archived_at = datetime.now(tz=UTC)
    db.commit()
    db.refresh(goal)
    return goal


@router.patch("/{goal_id}/progress", response_model=GoalOut)
def update_progress(
    goal_id: uuid.UUID, body: GoalProgressUpdate, db: Session = Depends(get_db)
) -> Goal:
    goal = _get_goal_or_404(db, goal_id)
    if goal.type != GoalType.milestone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Progress tracking is only available for milestone goals",
        )
    goal.current_value = body.current_value
    db.commit()
    db.refresh(goal)
    return goal

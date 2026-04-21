import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from app.db import Base
from app.models.enums import GoalDirection, GoalStatus, GoalType


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    year: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    type: Mapped[GoalType] = mapped_column(
        sa.Enum(GoalType, native_enum=False, create_constraint=False), nullable=False
    )
    name: Mapped[str] = mapped_column(sa.String, nullable=False)
    direction: Mapped[GoalDirection] = mapped_column(
        sa.Enum(GoalDirection, native_enum=False, create_constraint=False),
        nullable=False,
        server_default=GoalDirection.at_least.value,
    )
    target_value: Mapped[float | None] = mapped_column(sa.Float, nullable=True)
    current_value: Mapped[float | None] = mapped_column(sa.Float, nullable=True)
    linked_module: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    status: Mapped[GoalStatus] = mapped_column(
        sa.Enum(GoalStatus, native_enum=False, create_constraint=False),
        nullable=False,
        server_default=GoalStatus.active.value,
    )
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=text("now()"), nullable=False
    )

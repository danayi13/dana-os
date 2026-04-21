import uuid
from datetime import date as dt_date
from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.db import Base
from app.models.enums import GoalDirection, PeriodType


class HabitDefinition(Base):
    __tablename__ = "habit_definitions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    name: Mapped[str] = mapped_column(sa.String, nullable=False)
    description: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    period_type: Mapped[PeriodType] = mapped_column(
        sa.Enum(PeriodType, native_enum=False, create_constraint=False), nullable=False
    )
    unit: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    target: Mapped[float | None] = mapped_column(sa.Float, nullable=True)
    direction: Mapped[GoalDirection] = mapped_column(
        sa.Enum(GoalDirection, native_enum=False, create_constraint=False),
        nullable=False,
        server_default=GoalDirection.track.value,
    )
    period_config: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=text("now()"), nullable=False
    )

    activation_periods: Mapped[list["HabitActivationPeriod"]] = relationship(
        "HabitActivationPeriod",
        back_populates="habit",
        order_by="HabitActivationPeriod.starts_on",
        cascade="all, delete-orphan",
    )
    logs: Mapped[list["HabitLog"]] = relationship(
        "HabitLog", back_populates="habit", cascade="all, delete-orphan"
    )


class HabitActivationPeriod(Base):
    __tablename__ = "habit_activation_periods"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    habit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("habit_definitions.id"), nullable=False
    )
    starts_on: Mapped[dt_date] = mapped_column(sa.Date, nullable=False)
    ends_on: Mapped[dt_date | None] = mapped_column(sa.Date, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)

    habit: Mapped["HabitDefinition"] = relationship(
        "HabitDefinition", back_populates="activation_periods"
    )


class HabitLog(Base):
    __tablename__ = "habit_logs"
    __table_args__ = (sa.UniqueConstraint("habit_id", "date", name="uq_habit_logs_habit_date"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    habit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("habit_definitions.id"), nullable=False
    )
    date: Mapped[dt_date] = mapped_column(sa.Date, nullable=False)
    value: Mapped[float] = mapped_column(sa.Float, nullable=False, server_default="1.0")
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=text("now()"), nullable=False
    )

    habit: Mapped["HabitDefinition"] = relationship("HabitDefinition", back_populates="logs")

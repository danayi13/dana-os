import uuid
from datetime import date as dt_date
from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.db import Base
from app.models.enums import GymType, VGrade


class Gym(Base):
    __tablename__ = "gyms"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    name: Mapped[str] = mapped_column(sa.String, nullable=False)
    location: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    gym_type: Mapped[GymType] = mapped_column(
        sa.Enum(GymType, native_enum=True, name="gym_type"),
        nullable=False,
        server_default=GymType.recurring.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=text("now()"), nullable=False
    )

    sessions: Mapped[list["ClimbingSession"]] = relationship(
        "ClimbingSession", back_populates="gym", lazy="noload"
    )


class ClimbingSession(Base):
    __tablename__ = "climbing_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    date: Mapped[dt_date] = mapped_column(sa.Date, nullable=False)
    gym_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        sa.ForeignKey("gyms.id", name="fk_climbing_sessions_gym_id"),
        nullable=True,
    )
    duration_minutes: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    max_grade: Mapped[VGrade | None] = mapped_column(
        sa.Enum(VGrade, native_enum=True, name="vgrade"),
        nullable=True,
    )
    companions: Mapped[list[Any] | None] = mapped_column(JSONB, nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=text("now()"), nullable=False
    )

    gym: Mapped[Gym | None] = relationship("Gym", back_populates="sessions", lazy="joined")

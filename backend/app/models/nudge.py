import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from app.db import Base
from app.models.enums import NudgeStateEnum


class ReminderConfig(Base):
    __tablename__ = "reminder_config"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    subject_type: Mapped[str] = mapped_column(sa.String, nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    interval_days: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    enabled: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default="true")


class NudgeState(Base):
    __tablename__ = "nudge_states"
    __table_args__ = (
        sa.UniqueConstraint("subject_type", "subject_id", name="uq_nudge_states_subject"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    subject_type: Mapped[str] = mapped_column(sa.String, nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    state: Mapped[NudgeStateEnum] = mapped_column(
        sa.Enum(NudgeStateEnum, native_enum=False, create_constraint=False),
        nullable=False,
        server_default=NudgeStateEnum.active.value,
    )
    snoozed_until: Mapped[datetime | None] = mapped_column(
        sa.DateTime(timezone=True), nullable=True
    )
    dismissed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=text("now()"), nullable=False
    )

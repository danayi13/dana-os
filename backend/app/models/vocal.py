import uuid
from datetime import date as dt_date
from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from app.db import Base


class VocalLesson(Base):
    __tablename__ = "vocal_lessons"
    __table_args__ = (sa.UniqueConstraint("date", name="uq_vocal_lessons_date"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    date: Mapped[dt_date] = mapped_column(sa.Date, nullable=False)
    repertoire: Mapped[list[Any] | None] = mapped_column(JSONB, nullable=True)
    reflection: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=text("now()"), nullable=False
    )

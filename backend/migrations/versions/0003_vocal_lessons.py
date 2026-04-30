"""vocal lessons

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-27

Tables introduced:
  vocal_lessons — one row per lesson; unique on date.
  Fields: date, repertoire (JSONB list of piece names), reflection/notes.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision: str = "0003"
down_revision: str | Sequence[str] | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "vocal_lessons",
        sa.Column(
            "id",
            pg.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("repertoire", pg.JSONB(), nullable=True),
        sa.Column("reflection", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("date", name="uq_vocal_lessons_date"),
    )
    op.create_index("ix_vocal_lessons_date", "vocal_lessons", ["date"])


def downgrade() -> None:
    op.drop_index("ix_vocal_lessons_date", table_name="vocal_lessons")
    op.drop_table("vocal_lessons")

"""climbing tracker

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-30

Tables introduced:
  gyms           — gym lookup; split into recurring / infrequent.
  climbing_sessions — one row per session; gym_id nullable (for ungymmed
                    outdoor / travel sessions); max_grade nullable (old
                    sessions may not have grade info).

Seed:
  One ReminderConfig row for the climbing module (subject_type='climbing',
  subject_id=CLIMBING_SUBJECT_ID, interval_days=14). The climbing router
  reads/updates this row by its fixed subject_id so the user can configure
  the rest interval from the UI without knowing the row's primary key.
"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision: str = "0004"
down_revision: str | Sequence[str] | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Fixed UUID that identifies the single climbing ReminderConfig row.
# Must match CLIMBING_SUBJECT_ID in routers/climbing.py.
CLIMBING_SUBJECT_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


def upgrade() -> None:
    # ── enums ──────────────────────────────────────────────────────────────
    vgrade_enum = pg.ENUM(
        "V0",
        "V1",
        "V2",
        "V3",
        "V4",
        "V5",
        "V6",
        "V7",
        "V8",
        "V9",
        "V10",
        "V11",
        "V12",
        "V13",
        "V14",
        "V15",
        "V16",
        "V17",
        name="vgrade",
    )
    vgrade_enum.create(op.get_bind(), checkfirst=True)

    gym_type_enum = pg.ENUM("recurring", "infrequent", name="gym_type")
    gym_type_enum.create(op.get_bind(), checkfirst=True)

    # ── gyms ───────────────────────────────────────────────────────────────
    op.create_table(
        "gyms",
        sa.Column(
            "id",
            pg.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column(
            "gym_type",
            pg.ENUM("recurring", "infrequent", name="gym_type", create_type=False),
            nullable=False,
            server_default="recurring",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ── climbing_sessions ──────────────────────────────────────────────────
    op.create_table(
        "climbing_sessions",
        sa.Column(
            "id",
            pg.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column(
            "gym_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("gyms.id", name="fk_climbing_sessions_gym_id"),
            nullable=True,
        ),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column(
            "max_grade",
            pg.ENUM(
                "V0",
                "V1",
                "V2",
                "V3",
                "V4",
                "V5",
                "V6",
                "V7",
                "V8",
                "V9",
                "V10",
                "V11",
                "V12",
                "V13",
                "V14",
                "V15",
                "V16",
                "V17",
                name="vgrade",
                create_type=False,
            ),
            nullable=True,
        ),
        sa.Column("companions", pg.JSONB(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_climbing_sessions_date_gym",
        "climbing_sessions",
        ["date", "gym_id"],
    )

    # ── seed: climbing ReminderConfig (14-day default rest interval) ───────
    op.execute(
        sa.text(
            "INSERT INTO reminder_config (id, subject_type, subject_id, interval_days, enabled) "
            "SELECT uuid_generate_v4(), 'climbing', cast(:subject_id as uuid), 14, true "
            "WHERE NOT EXISTS ("
            "  SELECT 1 FROM reminder_config "
            "  WHERE subject_type = 'climbing' AND subject_id = cast(:subject_id as uuid)"
            ")"
        ).bindparams(subject_id=str(CLIMBING_SUBJECT_ID))
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM reminder_config WHERE subject_type = 'climbing'"))
    op.drop_index("ix_climbing_sessions_date_gym", table_name="climbing_sessions")
    op.drop_table("climbing_sessions")
    op.drop_table("gyms")

    op.execute(sa.text("DROP TYPE IF EXISTS vgrade"))
    op.execute(sa.text("DROP TYPE IF EXISTS gym_type"))

"""habits and goals

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-19

Tables introduced:
  habit_definitions         — habit template (name, period type, target, direction)
  habit_activation_periods  — one row per active window; restart = new row
  habit_logs                — one row per entry; unique on (habit_id, date)
  goals                     — yearly binary/milestone goals (with direction)
  reminder_config           — generic per-subject reminder interval
  nudge_states              — generic snooze/dismiss state machine
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "habit_definitions",
        sa.Column(
            "id",
            pg.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("period_type", sa.String(), nullable=False),
        sa.Column("unit", sa.String(), nullable=True),
        sa.Column("target", sa.Float(), nullable=True),
        sa.Column("direction", sa.String(), nullable=False, server_default="track"),
        sa.Column("period_config", pg.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "habit_activation_periods",
        sa.Column(
            "id",
            pg.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "habit_id", pg.UUID(as_uuid=True), sa.ForeignKey("habit_definitions.id"), nullable=False
        ),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_habit_activation_periods_habit_id", "habit_activation_periods", ["habit_id"]
    )

    op.create_table(
        "habit_logs",
        sa.Column(
            "id",
            pg.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "habit_id", pg.UUID(as_uuid=True), sa.ForeignKey("habit_definitions.id"), nullable=False
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("value", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("habit_id", "date", name="uq_habit_logs_habit_date"),
    )
    op.create_index("ix_habit_logs_date_habit_id", "habit_logs", ["date", "habit_id"])

    op.create_table(
        "goals",
        sa.Column(
            "id",
            pg.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("direction", sa.String(), nullable=False, server_default="at_least"),
        sa.Column("target_value", sa.Float(), nullable=True),
        sa.Column("current_value", sa.Float(), nullable=True),
        sa.Column("linked_module", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "reminder_config",
        sa.Column(
            "id",
            pg.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("subject_type", sa.String(), nullable=False),
        sa.Column("subject_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("interval_days", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
    )

    op.create_table(
        "nudge_states",
        sa.Column(
            "id",
            pg.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("subject_type", sa.String(), nullable=False),
        sa.Column("subject_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("state", sa.String(), nullable=False, server_default="active"),
        sa.Column("snoozed_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("subject_type", "subject_id", name="uq_nudge_states_subject"),
    )


def downgrade() -> None:
    op.drop_table("nudge_states")
    op.drop_table("reminder_config")
    op.drop_table("goals")
    op.drop_index("ix_habit_logs_date_habit_id", table_name="habit_logs")
    op.drop_table("habit_logs")
    op.drop_index("ix_habit_activation_periods_habit_id", table_name="habit_activation_periods")
    op.drop_table("habit_activation_periods")
    op.drop_table("habit_definitions")

"""baseline

Revision ID: 0001
Revises:
Create Date: 2026-04-12

Intentionally empty. This migration exists so every environment has a known
starting point on the alembic_version timeline. Real tables land in later
phase PRs.

Date-spine convention (from spec §"Reporting / analytics"): time-series
models join against a pre-built `dim_date` table rather than generating
date ranges at query time. When the first date-dimension migration is
written, it should populate `dim_date` from e.g. 2020-01-01 through
today + 5 years on upgrade, and `DELETE FROM dim_date` on downgrade.
"""

from collections.abc import Sequence

revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

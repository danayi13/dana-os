"""Pytest fixtures for Dana OS backend.

Strategy:
- `/health` tests use FastAPI's TestClient, which hits the production-config
  engine pointed at `dana_os` — fine because `/health` is read-only.
- Tests that mutate (DDL, INSERT) use the `test_engine` fixture pointed at
  `dana_os_test`, a separate database provisioned by `backend/sql/init.sql`
  specifically so tests can CREATE TABLE without polluting `dana_os`.
- The session-scoped `test_engine` fixture runs alembic `upgrade head` against
  `dana_os_test` before any tests run. The baseline migration is empty today
  but this plumbing means real migrations will be exercised by CI from day one.
"""

from collections.abc import Generator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from app.config import get_settings
from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import make_url

_BACKEND_DIR = Path(__file__).resolve().parents[1]
_TEST_DB_NAME = "dana_os_test"


def _to_test_url(url: str) -> str:
    """Return `url` with the database name swapped to `dana_os_test`.

    Parses via SQLAlchemy rather than string-replacing so we don't also
    rewrite `dana_os` substrings inside the username (e.g. `dana_os_ro`).
    """
    return make_url(url).set(database=_TEST_DB_NAME).render_as_string(hide_password=False)


@pytest.fixture(scope="session")
def test_db_url() -> str:
    return _to_test_url(get_settings().database_url)


@pytest.fixture(scope="session")
def test_db_url_ro() -> str:
    return _to_test_url(get_settings().database_url_ro)


@pytest.fixture(scope="session")
def test_engine(test_db_url: str) -> Generator[Engine, None, None]:
    """Read/write engine against `dana_os_test`, with alembic migrations applied."""
    alembic_cfg = Config(str(_BACKEND_DIR / "alembic.ini"))
    alembic_cfg.set_main_option("sqlalchemy.url", test_db_url)
    command.upgrade(alembic_cfg, "head")

    engine = create_engine(test_db_url, future=True)
    yield engine
    engine.dispose()


@pytest.fixture(scope="session")
def test_ro_engine(test_db_url_ro: str) -> Generator[Engine, None, None]:
    """Read-only engine against `dana_os_test`, using the `dana_os_ro` postgres role."""
    engine = create_engine(test_db_url_ro, future=True)
    yield engine
    engine.dispose()

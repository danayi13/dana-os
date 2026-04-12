"""Integration tests pinning the behavior of `backend/sql/init.sql`.

These catch regressions in the Phase 0 database bootstrap:
- Required extensions are installed.
- The read-only user can SELECT from tables created by the app user
  (proving ALTER DEFAULT PRIVILEGES is wired correctly).
- The read-only user is blocked from INSERT and CREATE TABLE — the security
  boundary that the Phase 12 NLP query path relies on.

They run against `dana_os_test` so the DDL they exercise never touches
the main `dana_os` database.
"""

import pytest
from sqlalchemy import Engine, text
from sqlalchemy.exc import ProgrammingError

pytestmark = pytest.mark.integration


REQUIRED_EXTENSIONS = {"uuid-ossp", "pg_trgm"}


def _installed_extensions(engine: Engine) -> set[str]:
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT extname FROM pg_extension")).scalars().all()
    return set(rows)


def test_required_extensions_installed_on_test_db(test_engine: Engine):
    assert REQUIRED_EXTENSIONS.issubset(_installed_extensions(test_engine))


def test_app_user_can_create_and_insert(test_engine: Engine):
    with test_engine.begin() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS _bootstrap_rw (id int)"))
        conn.execute(text("INSERT INTO _bootstrap_rw VALUES (1)"))
        rows = conn.execute(text("SELECT id FROM _bootstrap_rw")).scalars().all()
        conn.execute(text("DROP TABLE _bootstrap_rw"))
    assert rows == [1]


def test_ro_user_can_select_from_app_created_table(test_engine: Engine, test_ro_engine: Engine):
    """ALTER DEFAULT PRIVILEGES means new app-created tables are SELECTable by ro."""
    with test_engine.begin() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS _bootstrap_ro_read (id int)"))
        conn.execute(text("INSERT INTO _bootstrap_ro_read VALUES (42)"))
    try:
        with test_ro_engine.connect() as conn:
            rows = conn.execute(text("SELECT id FROM _bootstrap_ro_read")).scalars().all()
        assert rows == [42]
    finally:
        with test_engine.begin() as conn:
            conn.execute(text("DROP TABLE _bootstrap_ro_read"))


def test_ro_user_cannot_insert(test_engine: Engine, test_ro_engine: Engine):
    with test_engine.begin() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS _bootstrap_ro_insert (id int)"))
    try:
        with (
            pytest.raises(ProgrammingError, match="permission denied"),
            test_ro_engine.begin() as conn,
        ):
            conn.execute(text("INSERT INTO _bootstrap_ro_insert VALUES (1)"))
    finally:
        with test_engine.begin() as conn:
            conn.execute(text("DROP TABLE _bootstrap_ro_insert"))


def test_ro_user_cannot_create_table(test_ro_engine: Engine):
    with (
        pytest.raises(ProgrammingError, match="permission denied"),
        test_ro_engine.begin() as conn,
    ):
        conn.execute(text("CREATE TABLE _bootstrap_ro_should_fail (id int)"))

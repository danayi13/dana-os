"""SQLAlchemy 2.x engines and session factories.

Two engines are intentional:
- `engine` uses `DATABASE_URL` (dana_os_app, read/write) and is what FastAPI
  routes and Alembic migrations use.
- `ro_engine` uses `DATABASE_URL_RO` (dana_os_ro, read-only). The Phase 12
  NLP query path will use it so LLM-generated SQL cannot mutate data — the
  guarantee is enforced by postgres grants, not application code.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

_settings = get_settings()

engine = create_engine(
    _settings.database_url,
    pool_pre_ping=True,
    future=True,
)
ro_engine = create_engine(
    _settings.database_url_ro,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
ReadOnlySessionLocal = sessionmaker(bind=ro_engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Root declarative base. All ORM models inherit from this."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a read/write session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_ro_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a read-only session (for NLP query path)."""
    db = ReadOnlySessionLocal()
    try:
        yield db
    finally:
        db.close()

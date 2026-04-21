"""Alembic migration environment.

Configured to pull the database URL from `app.config.Settings` (pydantic-settings)
rather than alembic.ini, so there's a single source of truth for connection
info. `target_metadata = Base.metadata` enables `alembic revision --autogenerate`.
"""

from logging.config import fileConfig

from alembic import context
from app.config import get_settings
from app.db import Base
from sqlalchemy import engine_from_config, pool

# Alembic Config object — access to alembic.ini values.
config = context.config

# Inject the URL from settings only when alembic.ini still has the placeholder.
# Test fixtures call `config.set_main_option("sqlalchemy.url", test_db_url)` before
# invoking `command.upgrade`, so we must not overwrite their value.
_PLACEHOLDER = "driver://user:pass@localhost/dbname"
if (config.get_main_option("sqlalchemy.url") or "") in ("", _PLACEHOLDER):
    config.set_main_option("sqlalchemy.url", get_settings().database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Importing models here ensures their tables register on Base.metadata before
# autogenerate inspects it. Add new model module imports as phases introduce them.
import app.models  # noqa: F401, E402  # pyright: ignore[reportUnusedImport]

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL to stdout without connecting to a database."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Open a real connection and run migrations against it."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

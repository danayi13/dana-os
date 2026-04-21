"""Typed application settings, loaded from the repo-root `.env` via pydantic-settings."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# .env lives at the repo root (one level up from backend/). Resolve from this
# file so `pytest` and `uvicorn` both find it regardless of cwd.
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # pydantic-settings matches env vars case-insensitively by default,
    # so `database_url` reads DATABASE_URL, `database_url_ro` reads DATABASE_URL_RO, etc.
    database_url: str
    database_url_ro: str
    google_sheets_credentials_path: str | None = None
    habits_sheet_id: str | None = None
    habits_sheet_tab: str = "2026"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]

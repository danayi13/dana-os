"""Typed application settings, loaded from the repo-root `.env` via pydantic-settings."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
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

    database_url: str = Field(..., alias="DATABASE_URL")
    database_url_ro: str = Field(..., alias="DATABASE_URL_RO")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

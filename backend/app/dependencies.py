"""FastAPI dependency providers shared across routers."""

from functools import lru_cache

from app.config import get_settings
from app.services.sheets_sync import SheetsSync


@lru_cache(maxsize=1)
def get_sheets_sync() -> SheetsSync:
    s = get_settings()
    return SheetsSync(s.google_sheets_credentials_path, s.habits_sheet_id)


@lru_cache(maxsize=1)
def get_vocal_sheets_sync() -> SheetsSync:
    s = get_settings()
    return SheetsSync(s.google_sheets_credentials_path, s.vocal_sheet_id)

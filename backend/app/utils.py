from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException


def local_today(tz: str | None) -> date:
    if tz is None:
        return date.today()
    try:
        return datetime.now(ZoneInfo(tz)).date()
    except ZoneInfoNotFoundError as e:
        raise HTTPException(status_code=400, detail=f"Unknown timezone: {tz!r}") from e

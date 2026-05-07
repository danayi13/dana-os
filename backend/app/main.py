"""FastAPI entrypoint."""

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.exceptions import HTTPException

from app import __version__
from app.config import get_settings
from app.db import engine
from app.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.routers import climbing, goals, habits, nudges, vocal

app = FastAPI(title="Dana OS", version=__version__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(habits.router)
app.include_router(goals.router)
app.include_router(nudges.router)
app.include_router(vocal.router)
app.include_router(climbing.router)


@app.get("/config/sheet-urls")
def sheet_urls() -> dict[str, str | None]:
    """Return Google Sheets URLs for each tracker so the frontend can link to them."""
    s = get_settings()

    def _url(sheet_id: str | None) -> str | None:
        if not sheet_id:
            return None
        return f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"

    return {
        "habits": _url(s.habits_sheet_id),
        "vocal": _url(s.vocal_sheet_id),
        "climbing": _url(s.climbing_sheet_id),
    }


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness + DB reachability probe.

    Returns `{status, database, version}`. `database` is "ok" if a
    `SELECT 1` succeeds, "error" otherwise — the endpoint itself still
    returns 200 so a healthcheck can distinguish "app up / db down" from
    "app down".
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"
    return {"status": "ok", "database": db_status, "version": __version__}

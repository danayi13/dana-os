"""FastAPI entrypoint."""

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.exceptions import HTTPException

from app import __version__
from app.db import engine
from app.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)

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

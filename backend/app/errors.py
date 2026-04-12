"""Uniform JSON error envelope.

Every error response has the shape:

    {"error": {"type": "<ErrorClass>", "message": "<human-readable>"}}

Routes should raise HTTPException or let framework exceptions bubble up;
the handlers registered in `main.py` wrap them in this envelope.
"""

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException


def _envelope(error_type: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"type": error_type, "message": message}},
    )


async def http_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    # exc typed as Exception for pylance typing
    assert isinstance(exc, HTTPException)
    return _envelope("HTTPException", exc.detail, exc.status_code)


async def validation_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    # exc typed as Exception for pylance typing
    assert isinstance(exc, RequestValidationError)
    return _envelope("ValidationError", str(exc.errors()), 422)


async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    return _envelope("InternalServerError", str(exc) or "internal error", 500)

from typing import Any, Dict, Optional

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def error_payload(
    code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "ok": False,
        "code": code,
        "message": message,
    }
    if details is not None:
        payload["details"] = details
    return payload


def _http_error_code(status_code: int) -> str:
    if status_code == 404:
        return "NOT_FOUND"
    if status_code == 405:
        return "METHOD_NOT_ALLOWED"
    if status_code == 503:
        return "SERVICE_NOT_READY"
    if status_code >= 500:
        return "SERVER_ERROR"
    return "HTTP_ERROR"


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=jsonable_encoder(
            error_payload(
                "VALIDATION_ERROR",
                "Request validation failed.",
                {"errors": exc.errors()},
            )
        ),
    )


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    detail = exc.detail
    details: Optional[Dict[str, Any]] = None
    message = str(detail) if detail else "HTTP error."

    if isinstance(detail, dict):
        details = detail
        message = (
            "Service is not ready."
            if exc.status_code == 503
            else str(detail.get("message") or detail.get("detail") or "HTTP error.")
        )

    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder(
            error_payload(_http_error_code(exc.status_code), message, details)
        ),
    )


async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content=jsonable_encoder(error_payload("BAD_REQUEST", str(exc))),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=jsonable_encoder(
            error_payload("INTERNAL_ERROR", "Internal server error.")
        ),
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(ValueError, value_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

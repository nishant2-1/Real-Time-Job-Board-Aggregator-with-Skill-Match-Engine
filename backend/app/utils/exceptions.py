from http import HTTPStatus

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

ERROR_SCHEMA_EXAMPLE = {
    "error": {
        "code": "not_found",
        "message": "Resource not found",
        "details": [],
    }
}


def _error_response(code: str, message: str, details: list[str], status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "details": details}},
    )


async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = HTTPStatus(exc.status_code).name.lower()
    return _error_response(code=code, message=str(exc.detail), details=[], status_code=exc.status_code)


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    detail_messages = [f"{'.'.join(map(str, err['loc']))}: {err['msg']}" for err in exc.errors()]
    return _error_response(
        code="validation_error",
        message="Invalid request payload",
        details=detail_messages,
        status_code=422,
    )


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return _error_response(
        code="internal_server_error",
        message="Unexpected server error",
        details=[str(exc)],
        status_code=500,
    )

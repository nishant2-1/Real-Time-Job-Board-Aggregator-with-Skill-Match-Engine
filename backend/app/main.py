import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.router import api_router
from app.core.config import settings
from app.utils.exceptions import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.utils.logging import configure_logging, request_id_ctx_var


configure_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name, version=settings.app_version)
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit_default])
app.state.limiter = limiter

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    request_id_ctx_var.set(request_id)
    start_time = time.perf_counter()

    response = await call_next(request)

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request_complete",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(elapsed_ms, 2),
        },
    )
    return response


app.include_router(api_router)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}

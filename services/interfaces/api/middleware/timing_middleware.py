"""Request timing ASGI middleware.

Measures request duration, adds response headers, and logs via structlog.
"""

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from infrastructure.config import settings

logger = structlog.get_logger()


class TimingMiddleware(BaseHTTPMiddleware):
    """Add request timing headers and structured logging to every request."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not settings.enable_request_timing:
            return await call_next(request)

        request_id = str(uuid.uuid4())
        start = time.monotonic()

        response = await call_next(request)

        duration_ms = round((time.monotonic() - start) * 1000, 2)

        response.headers["X-Request-Id"] = request_id
        response.headers["X-Request-Duration-Ms"] = str(duration_ms)

        slow = duration_ms > settings.slow_request_threshold_ms

        logger.info(
            "http.request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            request_id=request_id,
            slow_request=slow or None,
        )

        return response

"""
Per-IP sliding window rate limiter for Mr.Roast.
Supports in-memory tracking with automatic cleanup.
"""

import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request

# Deque of timestamps per client IP
_rate_limits: dict[str, deque[float]] = defaultdict(deque)


def get_client_ip(request: Request) -> str:
    """Extract client IP honoring X-Forwarded-For when present."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # First IP in chain is the true client IP
        return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


def check_rate_limit(request: Request, limit: int, window_seconds: int = 60, detail: str = "Slow down. Inner peace takes time."):
    """
    Check if the client IP has exceeded the allowed number of requests in the sliding window.
    Raises HTTPException(429) if limit exceeded.
    """
    import os
    if os.getenv("DISABLE_RATE_LIMIT") == "1":
        return

    ip = get_client_ip(request)
    now = time.time()
    q = _rate_limits[ip]

    # Purge timestamps outside the window
    cutoff = now - window_seconds
    while q and q[0] < cutoff:
        q.popleft()

    if len(q) >= limit:
        raise HTTPException(
            status_code=429,
            detail=detail
        )

    q.append(now)

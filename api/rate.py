"""
Per-IP sliding window rate limiter for LoveBite.
Supports in-memory tracking with automatic memory leak prevention.
"""

import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request

# Deque of timestamps per client IP
_rate_limits: dict[str, deque[float]] = defaultdict(deque)
_last_prune: float = time.time()


def get_client_ip(request: Request) -> str:
    """Extract real client IP accounting for Render proxy headers."""
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        client_ip = xff.split(",")[0].strip()
        if client_ip:
            return client_ip
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


def check_rate_limit(
    request: Request,
    limit: int = 5,
    window_seconds: int = 60,
    detail: str = "Rate limit exceeded. Your desperation is exhausting our servers. Wait a minute before asking for another burn.",
):
    """
    Check if the client IP has exceeded the allowed quota (5 requests per 60s).
    Raises HTTPException(429) if exceeded. Automatically prunes expired records.
    """
    global _last_prune
    import os
    if os.getenv("DISABLE_RATE_LIMIT") == "1":
        return

    ip = get_client_ip(request)
    now = time.time()
    q = _rate_limits[ip]

    # Purge timestamps outside the window for this IP
    cutoff = now - window_seconds
    while q and q[0] < cutoff:
        q.popleft()

    # Periodic global cleanup every 120 seconds or when table has >500 IPs to prevent memory leaks
    if now - _last_prune > 120 or len(_rate_limits) > 500:
        stale_ips = [k for k, timestamps in _rate_limits.items() if not timestamps or timestamps[-1] < cutoff]
        for k in stale_ips:
            del _rate_limits[k]
        _last_prune = now

    if len(q) >= limit:
        raise HTTPException(
            status_code=429,
            detail=detail,
        )

    q.append(now)

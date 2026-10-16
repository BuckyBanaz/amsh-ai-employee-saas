"""A small in-process sliding-window rate limiter for expensive endpoints (text-to-speech, transcription, outbound calls).

It lives in the API process, so with several workers each has its own counters (limits become per worker). That is enough to stop
credit abuse from one account; move it to Redis if the API is scaled out.
"""

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Deque, Dict, Tuple

from fastapi import HTTPException, status

_hits: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)
_lock = Lock()


def check(bucket: str, key: str, limit: int, window_seconds: int) -> None:
    """Count one hit for `key` in `bucket`; raise 429 when more than `limit` hits fall inside the window."""
    now = time.monotonic()
    with _lock:
        q = _hits[(bucket, key)]
        while q and now - q[0] > window_seconds:
            q.popleft()
        if len(q) >= limit:
            retry = max(1, int(window_seconds - (now - q[0])))
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Try again shortly.", headers={"Retry-After": str(retry)})
        q.append(now)


def reset() -> None:
    with _lock:
        _hits.clear()

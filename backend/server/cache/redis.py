# Backend cache utilities

# This module provides a simple Redis client singleton using a connection pool.
# It is imported as `from backend.server.cache.redis import get_redis_client`.

import redis
from ..common.config import get_settings

# Initialize a global connection pool lazily.
_redis_pool = None

def _init_pool() -> redis.ConnectionPool:
    """Create a Redis connection pool using settings from the app config.
    The pool is created once and reused across requests.
    """
    settings = get_settings()
    # The REDIS_URL is defined in Settings (e.g., redis://redis:6379/0)
    return redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)

def get_redis_client() -> redis.Redis:
    """Return a Redis client backed by a shared connection pool.

    The client is cheap to create because it reuses the global pool.
    If the pool hasn't been initialized yet, it will be created on first call.
    """
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = _init_pool()
    return redis.Redis(connection_pool=_redis_pool)

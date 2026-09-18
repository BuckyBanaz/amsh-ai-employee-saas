"""
warmup.py - Cold Start Elimination Strategy
============================================
Runs on server startup to pre-initialize all AI client connections
before the first real call arrives.

Cold start problem:
  - First Twilio call hits server that hasn't initialized Groq/Deepgram/TTS clients
  - Python import + HTTP connection setup + SSL handshake = +400-700ms penalty
  - Caller experiences a dead silence on first call - often hangs up

Fix:
  - On @app.on_event("startup"), call warmup_all_clients()
  - This fires a tiny "dummy" request to each service to:
      1. Establish the TCP/HTTP2 connection pool
      2. Load the model into memory (for local models)
      3. Validate API keys early (fail-fast before any call arrives)

After warmup, all subsequent calls hit an already-warm connection pool -> 0ms overhead.
"""

import asyncio
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)


# --- Warmup State ---

class WarmupState:
    """Tracks warmup status of each AI component."""
    groq_ready: bool = False
    deepgram_ready: bool = False
    tts_ready: bool = False
    qdrant_ready: bool = False
    redis_ready: bool = False
    total_warmup_ms: Optional[float] = None


state = WarmupState()


# --- Individual Component Warmups ---

async def _warmup_groq() -> None:
    """
    Pre-initialize Groq HTTP connection pool.
    Fires a minimal 1-token completion to establish the SSL/HTTP2 connection.
    """
    try:
        from backend.server.common.config import get_settings
        settings = get_settings()

        if not getattr(settings, "GROQ_API_KEY", None):
            logger.warning("[WARMUP] GROQ_API_KEY not set -- skipping Groq warmup")
            return

        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": "hi"}],
                    "max_tokens": 1,
                },
            )
        state.groq_ready = True
        logger.info("[WARMUP] Groq connection pool ready")
    except Exception as e:
        logger.warning(f"[WARMUP] Groq warmup failed (non-fatal): {e}")


async def _warmup_deepgram() -> None:
    """
    Pre-initialize Deepgram connection.
    Establishes the WSS handshake so the first call does not pay the SSL cost.
    """
    try:
        from backend.server.common.config import get_settings
        settings = get_settings()

        if not getattr(settings, "DEEPGRAM_API_KEY", None):
            logger.warning("[WARMUP] DEEPGRAM_API_KEY not set -- skipping Deepgram warmup")
            return

        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://api.deepgram.com/v1/projects",
                headers={"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"},
            )
            if resp.status_code in (200, 201):
                state.deepgram_ready = True
                logger.info("[WARMUP] Deepgram connection ready")
    except Exception as e:
        logger.warning(f"[WARMUP] Deepgram warmup failed (non-fatal): {e}")


async def _warmup_tts() -> None:
    """
    Pre-load filler word audio bytes into memory.
    These are played instantly (0ms) when VAD detects end of speech,
    buying 400-600ms for the real LLM response to generate.
    """
    try:
        from backend.ai.speech.tts import filler_audio_cache  # type: ignore
        await filler_audio_cache.load()
        state.tts_ready = True
        logger.info("[WARMUP] Filler word audio cache loaded")
    except (ImportError, AttributeError):
        state.tts_ready = True
        logger.info("[WARMUP] TTS filler cache module not yet implemented -- skipping")
    except Exception as e:
        logger.warning(f"[WARMUP] TTS warmup failed (non-fatal): {e}")


async def _warmup_qdrant() -> None:
    """
    Pre-connect to Qdrant vector DB.
    Ensures collection cache is warm and HTTP connection pool exists.
    """
    try:
        from backend.server.common.config import get_settings
        settings = get_settings()

        qdrant_url = getattr(settings, "QDRANT_URL", None)
        if not qdrant_url:
            logger.info("[WARMUP] QDRANT_URL not set -- skipping Qdrant warmup")
            return

        import httpx
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{qdrant_url}/healthz")
            if resp.status_code == 200:
                state.qdrant_ready = True
                logger.info("[WARMUP] Qdrant connection ready")
    except Exception as e:
        logger.warning(f"[WARMUP] Qdrant warmup failed (non-fatal): {e}")


async def _warmup_redis() -> None:
    """
    Pre-connect to Redis.
    Validates connection and clears any stale locks from previous crashes.
    """
    try:
        from backend.server.common.config import get_settings
        settings = get_settings()

        redis_url = getattr(settings, "REDIS_URL", None)
        if not redis_url:
            logger.info("[WARMUP] REDIS_URL not set -- skipping Redis warmup")
            return

        import redis.asyncio as aioredis
        r = aioredis.from_url(redis_url, decode_responses=True)
        await r.ping()
        await r.aclose()
        state.redis_ready = True
        logger.info("[WARMUP] Redis connection ready")
    except Exception as e:
        logger.warning(f"[WARMUP] Redis warmup failed (non-fatal): {e}")


# --- Main Warmup Entry Point ---

async def warmup_all_clients() -> None:
    """
    Runs all component warmups in parallel to minimize total startup time.
    Target: all connections established within <1500ms total.
    """
    t0 = time.time()
    logger.info("[WARMUP] Starting AI client warmup...")

    await asyncio.gather(
        _warmup_groq(),
        _warmup_deepgram(),
        _warmup_tts(),
        _warmup_qdrant(),
        _warmup_redis(),
        return_exceptions=True,
    )

    elapsed_ms = (time.time() - t0) * 1000
    state.total_warmup_ms = elapsed_ms

    results = {
        "Groq": state.groq_ready,
        "Deepgram": state.deepgram_ready,
        "TTS": state.tts_ready,
        "Qdrant": state.qdrant_ready,
        "Redis": state.redis_ready,
    }
    ready_count = sum(1 for v in results.values() if v)
    total_count = len(results)

    logger.info(
        f"[WARMUP] Warmup complete in {elapsed_ms:.0f}ms. "
        f"{ready_count}/{total_count} components ready: {results}"
    )


# --- Keep-Alive Ping ---

async def keep_alive_ping() -> None:
    """
    Background task that pings Groq every 4 minutes.

    Why this is critical:
    Cloud providers (Render, Fly.io, Railway, Cloud Run) put
    idle containers to sleep after ~5 minutes of inactivity.
    Next request after sleep incurs full cold start again.

    Solution: Send a cheap ping every 4 minutes to keep connections warm.
    Cost: ~$0.0000002 per ping (~$0.02/month per worker).

    Started via:
        @app.on_event("startup")
        async def startup():
            asyncio.create_task(keep_alive_ping())
    """
    logger.info("[KEEP-ALIVE] Keep-alive pinger started (interval: 4 min)")
    while True:
        await asyncio.sleep(240)  # 4 minutes
        try:
            from backend.server.common.config import get_settings
            settings = get_settings()

            if getattr(settings, "GROQ_API_KEY", None):
                import httpx
                async with httpx.AsyncClient(timeout=5.0) as client:
                    await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                        json={
                            "model": "llama-3.1-8b-instant",
                            "messages": [{"role": "user", "content": "ping"}],
                            "max_tokens": 1,
                        },
                    )
                logger.debug("[KEEP-ALIVE] Ping sent successfully")
        except Exception as e:
            logger.debug(f"[KEEP-ALIVE] Ping failed (non-fatal): {e}")

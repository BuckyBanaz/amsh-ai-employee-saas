import asyncio
import logging
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

from backend.server.api.router import api_router
from backend.server.common.config import get_settings
from backend.server.common.warmup import warmup_all_clients, keep_alive_ping, state as warmup_state
from backend.server.database.models import *  # noqa: F401,F403 — registers all tables on Base.metadata
from backend.server.database.session import Base, engine

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "REST API for Amsh — a configuration-driven, multi-vertical AI Receptionist platform "
        "(MVP scope: healthcare/clinic vertical only). See DOCS/05_AMSh_Backend_API_Endpoints.md "
        "in the repo for the full planned surface — this is what's actually built so far."
    ),
    version="0.1.0",
    debug=settings.DEBUG,
    openapi_tags=[
        {"name": "auth", "description": "Registration, login, and the current-session user."},
        {"name": "businesses", "description": "Tenant (clinic) CRUD."},
        {"name": "users", "description": "Team members within a business — owner/admin invites, invitee accepts via /api/auth/accept-invite."},
    ],
)

cors_regex = settings.CORS_ORIGIN_REGEX
if cors_regex and cors_regex.startswith("http://"):
    cors_regex = "https?://" + cors_regex[len("http://"):]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=cors_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    from backend.server.common.config import production_problems

    problems = production_problems(get_settings())
    if problems and get_settings().ENV.lower() in ("production", "prod"):
        raise RuntimeError("Refusing to start in production: " + "; ".join(problems))
    for problem in problems:
        logging.getLogger(__name__).warning("[CONFIG] not production-safe: %s", problem)
    # Schema: Alembic migrations (backend/migrations). Older databases created by create_all are stamped and upgraded.
    # If migrations cannot run, fall back to create_all so the API still starts (new tables only, no column changes).
    try:
        from backend.server.database.migrate import run_migrations

        logging.getLogger(__name__).info("[MIGRATE] database schema: %s", await asyncio.to_thread(run_migrations))
    except Exception:
        logging.getLogger(__name__).exception("[MIGRATE] migrations failed; falling back to create_all")
        Base.metadata.create_all(bind=engine)

    # Pre-initialize all AI client connections to eliminate cold start penalty.
    # Runs Groq, Deepgram, TTS, Qdrant, Redis warmups in parallel.
    await warmup_all_clients()

    if get_settings().REMINDERS_ENABLED:
        from backend.server.workers.jobs.reminders import reminder_loop

        asyncio.create_task(reminder_loop(get_settings().REMINDER_INTERVAL_SECONDS))
        logging.getLogger(__name__).info("[REMINDERS] loop started")

    # Keep-alive pinger: fires every 4 min to prevent cloud containers from sleeping.
    # Without this, idle containers incur +400-700ms cold start on the next call.
    asyncio.create_task(keep_alive_ping())


@app.get("/health", tags=["health"])
def health() -> dict:
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "env": settings.ENV,
        "warmup": {
            "groq": warmup_state.groq_ready,
            "deepgram": warmup_state.deepgram_ready,
            "tts": warmup_state.tts_ready,
            "qdrant": warmup_state.qdrant_ready,
            "redis": warmup_state.redis_ready,
            "warmup_ms": warmup_state.total_warmup_ms,
        },
    }


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


static_dir = os.path.join(os.path.dirname(__file__), "server", "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.include_router(api_router)

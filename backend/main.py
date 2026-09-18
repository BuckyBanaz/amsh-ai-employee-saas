from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import asyncio

from backend.api.router import api_router
from backend.common.config import get_settings
from backend.common.warmup import warmup_all_clients, keep_alive_ping, state as warmup_state
from backend.database.models import *  # noqa: F401,F403 — registers all tables on Base.metadata
from backend.database.session import Base, engine

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    # MVP-stage table creation. Switch to Alembic migrations once the schema
    # needs to evolve without dropping data (spec §13).
    Base.metadata.create_all(bind=engine)

    # Pre-initialize all AI client connections to eliminate cold start penalty.
    # Runs Groq, Deepgram, TTS, Qdrant, Redis warmups in parallel.
    await warmup_all_clients()

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


app.include_router(api_router)

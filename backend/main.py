from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from backend.api.router import api_router
from backend.common.config import get_settings
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
def on_startup() -> None:
    # MVP-stage table creation. Switch to Alembic migrations once the schema
    # needs to evolve without dropping data (spec §13).
    Base.metadata.create_all(bind=engine)


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok", "service": settings.APP_NAME, "env": settings.ENV}


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


app.include_router(api_router)

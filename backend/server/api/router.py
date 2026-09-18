from fastapi import APIRouter

from backend.server.api.routes import agents, businesses, auth, integrations, knowledge, services, staff, users, admin
from backend.ai.realtime.twilio.gateway import router as voice_router

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(businesses.router)
api_router.include_router(users.router)
api_router.include_router(services.router)
api_router.include_router(staff.router)
api_router.include_router(agents.router)
api_router.include_router(knowledge.router)
api_router.include_router(integrations.router)
api_router.include_router(voice_router)
api_router.include_router(admin.router)

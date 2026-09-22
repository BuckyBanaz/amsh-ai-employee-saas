from fastapi import APIRouter

from backend.server.api.routes import agents, appointments, admin, auth, businesses, calls, customers, dashboard_stats, exotel, integrations, knowledge, services, staff, users, voice
from backend.ai.realtime.twilio.gateway import router as voice_stream_router

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(businesses.router)
api_router.include_router(users.router)
api_router.include_router(services.router)
api_router.include_router(staff.router)
api_router.include_router(agents.router)
api_router.include_router(knowledge.router)
api_router.include_router(integrations.router)
api_router.include_router(integrations.wa_webhook_router)
api_router.include_router(appointments.router)
api_router.include_router(calls.router)
api_router.include_router(customers.router)
api_router.include_router(dashboard_stats.router)
api_router.include_router(voice_stream_router)
api_router.include_router(voice.router)
api_router.include_router(exotel.router)
api_router.include_router(admin.router)

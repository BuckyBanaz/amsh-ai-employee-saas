from fastapi import APIRouter

from backend.server.api.routes import (
    admin,
    admin_calls,
    admin_platform_data,
    admin_integrations,
    admin_overview,
    admin_plans,
    admin_tenant_data,
    agents,
    analytics,
    appointments,
    auth,
    billing,
    businesses,
    calendar_feed,
    calls,
    customers,
    dashboard_stats,
    exotel,
    integrations,
    knowledge,
    notifications,
    payments,
    services,
    staff,
    stt,
    users,
    voice,
)
from backend.ai.realtime.twilio.gateway import router as voice_stream_router
from backend.server.api.routes import plans as plans_public
from backend.server.api.routes import languages

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(businesses.router)
api_router.include_router(businesses.dashboard_router)
api_router.include_router(users.router)
api_router.include_router(notifications.router)
api_router.include_router(services.router)
api_router.include_router(services.dashboard_router)
api_router.include_router(staff.router)
api_router.include_router(staff.dashboard_router)
api_router.include_router(staff.doctors_router)
api_router.include_router(agents.router)
api_router.include_router(agents.dashboard_router)
api_router.include_router(knowledge.router)
api_router.include_router(knowledge.dashboard_router)
api_router.include_router(integrations.router)
api_router.include_router(integrations.dashboard_router)
api_router.include_router(integrations.wa_webhook_router)
api_router.include_router(appointments.router)
api_router.include_router(calls.router)
api_router.include_router(calls.recordings_router)
api_router.include_router(customers.router)
api_router.include_router(customers.patients_router)
api_router.include_router(dashboard_stats.router)
api_router.include_router(analytics.router)
api_router.include_router(voice_stream_router)
api_router.include_router(voice.router)
api_router.include_router(stt.router)
api_router.include_router(plans_public.router)
api_router.include_router(languages.router)
api_router.include_router(admin_plans.router)
api_router.include_router(admin_tenant_data.router)
api_router.include_router(admin_overview.router)
api_router.include_router(admin_calls.router)
api_router.include_router(admin_platform_data.router)
api_router.include_router(admin_integrations.router)
api_router.include_router(calendar_feed.router)
api_router.include_router(exotel.router)
api_router.include_router(admin.router)
api_router.include_router(billing.router)
api_router.include_router(payments.router)

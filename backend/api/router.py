from fastapi import APIRouter

from backend.api.routes import agents, businesses, auth, integrations, knowledge, services, staff, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(businesses.router)
api_router.include_router(users.router)
api_router.include_router(services.router)
api_router.include_router(staff.router)
api_router.include_router(agents.router)
api_router.include_router(knowledge.router)
api_router.include_router(integrations.router)

# Not yet built — see DOCS/05_AMSh_Backend_API_Endpoints.md for the full plan:
# calls, conversations, transactions, billing, usage, analytics, verticals,
# admin-users, tickets, announcements, audit, security, health, notifications.

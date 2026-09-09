from fastapi import APIRouter

from backend.api.routes import auth, businesses, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(businesses.router)
api_router.include_router(users.router)

# Not yet built — see DOCS/05_AMSh_Backend_API_Endpoints.md for the full plan:
# agents, calls, conversations, transactions, knowledge, integrations,
# billing, usage, analytics, verticals, admin-users, tickets, announcements,
# audit, security, health, notifications.

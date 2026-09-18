"""Business-membership helpers shared by every /api/businesses/{business_id}/*
route module (users, services, staff, agents, knowledge, integrations)."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.server.database.models.business import Business
from backend.server.database.models.user import User


def get_business_or_404(business_id: str, db: Session) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return business


def require_membership(business_id: str, current_user: User) -> None:
    if current_user.scope != "platform" and current_user.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this business")


def require_owner_or_admin(business_id: str, current_user: User) -> None:
    require_membership(business_id, current_user)
    if current_user.scope != "platform" and current_user.role not in ("owner", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an owner or admin can do this")

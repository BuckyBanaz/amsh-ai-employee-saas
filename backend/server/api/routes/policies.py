"""Policies as the public and the business owner see them.

    GET  /api/policies/public/{key}?country=&vertical=       the published text that applies (public: the site's /legal pages and the sign-up links)
    GET  /api/businesses/{id}/policies                       what applies to this business, whether the signed-in person accepted it, and what the AI does for its region
    POST /api/businesses/{id}/policies/accept                {"version_ids": [...]}: accept (owner or admin)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.server.auth.security import get_current_user
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import policies as svc
from backend.server.services.audit import client_ip

public_router = APIRouter(prefix="/api/policies", tags=["policies"])
business_router = APIRouter(prefix="/api/businesses/{business_id}/policies", tags=["policies"])


class AcceptBody(BaseModel):
    version_ids: List[str]


@public_router.get("/public/{key}")
def public_policy(key: str, country: str = "", vertical: str = "", db: Session = Depends(get_db)):
    """With no country the global text is returned; with one, the most specific text for that region and vertical."""
    for p, v in svc.applicable(db, country, vertical):
        if p.key == key.lower():
            return {"key": p.key, "title": p.title, "version": v.version, "body": v.body, "published_at": svc._iso(v.published_at)}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This policy has not been published")


@business_router.get("")
def my_policies(business_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_membership(business_id, user)
    return svc.business_status(db, get_business_or_404(business_id, db), user)


@business_router.post("/accept")
def accept_policies(business_id: str, body: AcceptBody, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_owner_or_admin(business_id, user)
    business = get_business_or_404(business_id, db)
    try:
        made = svc.accept(db, user, business, body.version_ids, client_ip(request), request.headers.get("user-agent"))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    return {"accepted": made, **svc.business_status(db, business, user)}

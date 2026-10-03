"""Platform admin: the alerts feed (sign-ups, sign-ins, trials, plan changes, tickets, security). Guarded by `require_platform_admin`.

    GET  /api/admin/alerts                 the feed, unread count, per-category counts, providers that need attention
    GET  /api/admin/alerts/unread-count    just the number (the sidebar badge polls this)
    POST /api/admin/alerts/mark-read       everything up to now counts as seen, for this admin
    PUT  /api/admin/alerts/preferences     which categories this admin mutes
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.server.auth.security import require_platform_admin
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import admin_alerts

router = APIRouter(prefix="/api/admin/alerts", tags=["admin-alerts"])


class Preferences(BaseModel):
    muted: List[str] = []


@router.get("")
def list_alerts(category: Optional[str] = None, limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    return admin_alerts.feed(db, admin, category=category, limit=limit)


@router.get("/unread-count")
def alerts_unread(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    return {"unread": admin_alerts.unread_count(db, admin)}


@router.post("/mark-read")
def alerts_mark_read(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    admin_alerts.mark_read(db, admin)
    return {"unread": 0}


@router.put("/preferences")
def alerts_preferences(body: Preferences, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)):
    return {"muted": admin_alerts.set_muted(db, admin, body.muted)}

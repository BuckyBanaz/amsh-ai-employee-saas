"""Support tickets and announcements.

A clinic (`/api/businesses/{business_id}/tickets`; any member):
    POST   .../tickets                    open a ticket
    GET    .../tickets                    this business's tickets
    GET    .../tickets/{id}               one ticket with its conversation (staff-only notes are never shown)
    POST   .../tickets/{id}/messages      reply (reopens a resolved ticket)
    GET    /api/announcements             notices from AMSh that apply to the signed-in user's business

Platform admin (`require_platform_admin`):
    GET    /api/admin/tickets             all tickets (filters: status, priority, category, assignee, business_id, q) with counts by status
    GET    /api/admin/tickets/{id}        conversation including internal notes
    PATCH  /api/admin/tickets/{id}        status, priority, assignee
    POST   /api/admin/tickets/{id}/messages   reply to the clinic or add an internal note
    GET|POST|PATCH|DELETE /api/admin/announcements[/{id}]
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership
from backend.server.auth.security import get_current_user, require_platform_admin
from backend.server.database.models.business import Business
from backend.server.database.models.support import Announcement, SupportTicket, TicketMessage
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services.audit import audit, client_ip

tenant_router = APIRouter(prefix="/api/businesses/{business_id}/tickets", tags=["support"])
admin_router = APIRouter(prefix="/api/admin/tickets", tags=["admin-support"])
announce_admin_router = APIRouter(prefix="/api/admin/announcements", tags=["admin-announcements"])
announce_public_router = APIRouter(prefix="/api/announcements", tags=["announcements"])

CATEGORIES = ("billing", "technical", "ai_quality", "telephony", "account", "other")
PRIORITIES = ("low", "normal", "high", "urgent")
STATUSES = ("open", "in_progress", "waiting", "resolved", "closed")
LEVELS = ("info", "feature", "warning", "critical")
ANNOUNCE_STATUSES = ("draft", "published", "archived")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    return None if dt is None else (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc))


def _iso(dt: Optional[datetime]) -> Optional[str]:
    d = _aware(dt)
    return d.isoformat() if d else None


# ----------------------------------------------------------------------------- tickets

class TicketCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=1, max_length=5000)
    category: Literal["billing", "technical", "ai_quality", "telephony", "account", "other"] = "other"
    priority: Literal["low", "normal", "high", "urgent"] = "normal"


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    internal: bool = False


class TicketPatch(BaseModel):
    status: Optional[Literal["open", "in_progress", "waiting", "resolved", "closed"]] = None
    priority: Optional[Literal["low", "normal", "high", "urgent"]] = None
    assignee_id: Optional[str] = None
    unassign: bool = False


def _ticket_shape(t: SupportTicket, db: Session, *, detail: bool = False, staff: bool = False) -> Dict[str, Any]:
    biz = db.get(Business, t.business_id)
    creator = db.get(User, t.created_by) if t.created_by else None
    assignee = db.get(User, t.assignee_id) if t.assignee_id else None
    msgs = db.scalars(select(TicketMessage).where(TicketMessage.ticket_id == t.id).order_by(TicketMessage.created_at.asc())).all()
    visible = [m for m in msgs if staff or not m.internal]
    out: Dict[str, Any] = {
        "id": t.id, "number": t.number, "subject": t.subject, "category": t.category, "priority": t.priority, "status": t.status,
        "business_id": t.business_id, "business_name": biz.name if biz else None, "requester": creator.name if creator else None,
        "requester_email": creator.email if creator else None, "assignee_id": t.assignee_id, "assignee": assignee.name if assignee else None,
        "created_at": _iso(t.created_at), "updated_at": _iso(t.updated_at), "first_response_at": _iso(t.first_response_at), "resolved_at": _iso(t.resolved_at),
        "message_count": len(visible), "last_message": visible[-1].body[:140] if visible else "",
    }
    if detail:
        out["messages"] = [{"id": m.id, "author": m.author_name, "from_staff": m.from_staff, "internal": m.internal, "body": m.body, "created_at": _iso(m.created_at)} for m in visible]
    return out


def _next_number(db: Session) -> int:
    return (db.scalar(select(func.max(SupportTicket.number))) or 1000) + 1


def _add_message(db: Session, t: SupportTicket, user: User, body: str, *, staff: bool, internal: bool = False) -> TicketMessage:
    m = TicketMessage(ticket_id=t.id, author_id=user.id, author_name=user.name, from_staff=staff, internal=internal, body=body.strip())
    db.add(m)
    t.updated_at = _now()
    if staff and not internal and t.first_response_at is None:
        t.first_response_at = _now()
    return m


@tenant_router.post("", status_code=status.HTTP_201_CREATED)
def open_ticket(business_id: str, body: TicketCreate, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, user)
    t = SupportTicket(number=_next_number(db), business_id=business_id, created_by=user.id, subject=body.subject.strip(), category=body.category, priority=body.priority)
    db.add(t)
    db.flush()
    _add_message(db, t, user, body.body, staff=user.scope == "platform")
    db.commit()
    audit(db, "support.ticket_opened", user, business_id=business_id, target_type="ticket", target_id=t.id, ip=client_ip(request), meta={"number": t.number, "category": t.category})
    return _ticket_shape(t, db, detail=True)


@tenant_router.get("")
def my_tickets(business_id: str, status_: Optional[str] = Query(None, alias="status"), db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, user)
    q = select(SupportTicket).where(SupportTicket.business_id == business_id)
    if status_:
        q = q.where(SupportTicket.status == status_)
    rows = db.scalars(q.order_by(SupportTicket.updated_at.desc()).limit(200)).all()
    return {"items": [_ticket_shape(t, db) for t in rows]}


def _own_ticket(db: Session, business_id: str, ticket_id: str, user: User) -> SupportTicket:
    get_business_or_404(business_id, db)
    require_membership(business_id, user)
    t = db.get(SupportTicket, ticket_id)
    if t is None or t.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return t


@tenant_router.get("/{ticket_id}")
def my_ticket(business_id: str, ticket_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    return _ticket_shape(_own_ticket(db, business_id, ticket_id, user), db, detail=True)


@tenant_router.post("/{ticket_id}/messages", status_code=status.HTTP_201_CREATED)
def reply_as_clinic(business_id: str, ticket_id: str, body: MessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    t = _own_ticket(db, business_id, ticket_id, user)
    _add_message(db, t, user, body.body, staff=False)  # a clinic can never write an internal note
    if t.status in ("waiting", "resolved", "closed"):
        t.status, t.resolved_at = "open", None
    db.commit()
    return _ticket_shape(t, db, detail=True)


@admin_router.get("")
def admin_tickets(
    status_: Optional[str] = Query(None, alias="status"), priority: Optional[str] = None, category: Optional[str] = None, assignee: Optional[str] = None,
    business_id: Optional[str] = None, q: Optional[str] = None, limit: int = Query(100, ge=1, le=200), db: Session = Depends(get_db), admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    conds: List[Any] = []
    if priority:
        conds.append(SupportTicket.priority == priority)
    if category:
        conds.append(SupportTicket.category == category)
    if business_id:
        conds.append(SupportTicket.business_id == business_id)
    if assignee == "me":
        conds.append(SupportTicket.assignee_id == admin.id)
    elif assignee == "unassigned":
        conds.append(SupportTicket.assignee_id.is_(None))
    elif assignee:
        conds.append(SupportTicket.assignee_id == assignee)
    if q:
        matches = [SupportTicket.subject.ilike(f"%{q}%")]
        if q.lstrip("#").isdigit():
            matches.append(SupportTicket.number == int(q.lstrip("#")))
        conds.append(or_(*matches))
    base = select(SupportTicket).where(*conds)
    counts = {s: 0 for s in STATUSES}  # counted over everything the other filters allow, so each tab shows what it would list
    for st in db.scalars(select(SupportTicket.status).where(*conds)).all():
        counts[st] = counts.get(st, 0) + 1
    shown = base.where(SupportTicket.status == status_) if status_ else base
    rows = db.scalars(shown.order_by(SupportTicket.updated_at.desc()).limit(limit)).all()
    staff = db.scalars(select(User).where(User.scope == "platform", User.is_active.is_(True)).order_by(User.name.asc())).all()
    return {"items": [_ticket_shape(t, db) for t in rows], "counts": counts, "total": sum(counts.values()), "staff": [{"id": u.id, "name": u.name} for u in staff],
            "options": {"statuses": list(STATUSES), "priorities": list(PRIORITIES), "categories": list(CATEGORIES)}}


def _admin_ticket(db: Session, ticket_id: str) -> SupportTicket:
    t = db.get(SupportTicket, ticket_id)
    if t is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return t


@admin_router.get("/{ticket_id}")
def admin_ticket(ticket_id: str, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    return _ticket_shape(_admin_ticket(db, ticket_id), db, detail=True, staff=True)


@admin_router.patch("/{ticket_id}")
def admin_patch_ticket(ticket_id: str, body: TicketPatch, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    t = _admin_ticket(db, ticket_id)
    before = {"status": t.status, "priority": t.priority, "assignee_id": t.assignee_id}
    if body.status is not None and body.status != t.status:
        t.status = body.status
        t.resolved_at = _now() if body.status in ("resolved", "closed") else None
    if body.priority is not None:
        t.priority = body.priority
    if body.unassign:
        t.assignee_id = None
    elif body.assignee_id is not None:
        assignee = db.get(User, body.assignee_id)
        if assignee is None or assignee.scope != "platform" or not assignee.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pick an active AMSh staff member")
        t.assignee_id = assignee.id
    t.updated_at = _now()
    db.commit()
    audit(db, "admin.ticket_updated", admin, business_id=t.business_id, target_type="ticket", target_id=t.id, ip=client_ip(request),
          meta={"number": t.number, "before": before, "after": {"status": t.status, "priority": t.priority, "assignee_id": t.assignee_id}})
    return _ticket_shape(t, db, detail=True, staff=True)


@admin_router.post("/{ticket_id}/messages", status_code=status.HTTP_201_CREATED)
def admin_reply(ticket_id: str, body: MessageCreate, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    t = _admin_ticket(db, ticket_id)
    _add_message(db, t, admin, body.body, staff=True, internal=body.internal)
    if not body.internal and t.status == "open":
        t.status = "waiting"  # the next move is the clinic's
    db.commit()
    return _ticket_shape(t, db, detail=True, staff=True)


# ----------------------------------------------------------------------------- announcements

class AnnouncementBody(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    body: str = Field(default="", max_length=2000)
    level: Literal["info", "feature", "warning", "critical"] = "info"
    status: Literal["draft", "published", "archived"] = "draft"
    plans: List[str] = []
    business_ids: List[str] = []
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


def _announcement_shape(a: Announcement) -> Dict[str, Any]:
    aud = a.audience or {}
    return {"id": a.id, "title": a.title, "body": a.body, "level": a.level, "status": a.status, "plans": aud.get("plans", []), "business_ids": aud.get("business_ids", []),
            "starts_at": _iso(a.starts_at), "ends_at": _iso(a.ends_at), "published_at": _iso(a.published_at), "created_at": _iso(a.created_at), "updated_at": _iso(a.updated_at)}


def _is_live(a: Announcement, now: datetime) -> bool:
    return a.status == "published" and (a.starts_at is None or _aware(a.starts_at) <= now) and (a.ends_at is None or _aware(a.ends_at) >= now)


def _applies(a: Announcement, business: Optional[Business]) -> bool:
    aud = a.audience or {}
    plans, ids = [p.lower() for p in aud.get("plans", [])], aud.get("business_ids", [])
    if not plans and not ids:
        return True
    return bool(business) and (business.id in ids or (business.plan or "").lower() in plans)


def _apply(a: Announcement, body: AnnouncementBody) -> None:
    if body.starts_at and body.ends_at and body.ends_at <= body.starts_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The end date must be after the start date")
    a.title, a.body, a.level = body.title.strip(), body.body.strip(), body.level
    a.audience = {"plans": [p.strip().lower() for p in body.plans if p.strip()], "business_ids": [b for b in body.business_ids if b]}
    a.starts_at, a.ends_at = _aware(body.starts_at), _aware(body.ends_at)
    if body.status == "published" and a.status != "published":
        a.published_at = _now()
    a.status = body.status
    a.updated_at = _now()


@announce_admin_router.get("")
def list_announcements(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    rows = db.scalars(select(Announcement).order_by(Announcement.created_at.desc())).all()
    now = _now()
    return {"items": [{**_announcement_shape(a), "live": _is_live(a, now)} for a in rows], "levels": list(LEVELS), "statuses": list(ANNOUNCE_STATUSES)}


@announce_admin_router.post("", status_code=status.HTTP_201_CREATED)
def create_announcement(body: AnnouncementBody, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    a = Announcement(created_by=admin.id)
    _apply(a, body)
    db.add(a)
    db.commit()
    audit(db, "admin.announcement_saved", admin, target_type="announcement", target_id=a.id, ip=client_ip(request), meta={"title": a.title, "status": a.status, "created": True})
    return _announcement_shape(a)


@announce_admin_router.patch("/{announcement_id}")
def update_announcement(announcement_id: str, body: AnnouncementBody, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    a = db.get(Announcement, announcement_id)
    if a is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    _apply(a, body)
    db.commit()
    audit(db, "admin.announcement_saved", admin, target_type="announcement", target_id=a.id, ip=client_ip(request), meta={"title": a.title, "status": a.status})
    return _announcement_shape(a)


@announce_admin_router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(announcement_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> None:
    a = db.get(Announcement, announcement_id)
    if a is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    db.delete(a)
    db.commit()
    audit(db, "admin.announcement_deleted", admin, target_type="announcement", target_id=announcement_id, ip=client_ip(request))


@announce_public_router.get("")
def my_announcements(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    business = db.get(Business, user.business_id) if user.business_id else None
    now = _now()
    rows = db.scalars(select(Announcement).where(Announcement.status == "published").order_by(Announcement.published_at.desc())).all()
    return {"items": [{k: v for k, v in _announcement_shape(a).items() if k in ("id", "title", "body", "level", "published_at", "ends_at")} for a in rows if _is_live(a, now) and _applies(a, business)]}

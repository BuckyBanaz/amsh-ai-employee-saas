"""Message templates API (DOCS/24).

Platform admin (`require_platform_admin`):
    GET    /api/admin/message-templates/meta                        events, channels, variables, languages
    GET    /api/admin/message-templates                             grid: every event x channel with status and languages
    GET    /api/admin/message-templates/{event}/{channel}           one cell, every language (row or built-in default)
    PUT    /api/admin/message-templates/{event}/{channel}           create / update one language (new version)
    DELETE /api/admin/message-templates/{event}/{channel}           back to the built-in default (?language= for one language)
    POST   /api/admin/message-templates/{event}/{channel}/preview   render with a sample patient (nothing is saved)
    POST   /api/admin/message-templates/{event}/{channel}/restore   make an earlier version current again
    GET    /api/admin/message-log                                   delivery log (filters: business_id, event_key, channel, status)

A clinic (`/api/businesses/{business_id}/...`; read: any member, write: owner / admin; clinic-owned events only):
    GET    .../message-templates                                    events with source (own / AMSh default), channels, switches
    GET    .../message-templates/{event}/{channel}                  the template in effect per language
    PUT    .../message-templates/{event}/{channel}                  save the clinic's own version
    DELETE .../message-templates/{event}/{channel}                  "Reset to default"
    POST   .../message-templates/{event}/{channel}/preview | /restore
    GET|PUT .../message-preferences                                 channel order, on/off per event, quiet hours
    GET    .../message-log
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai.lexicon import pack_languages
from backend.server.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.server.auth.security import get_current_user, require_platform_admin
from backend.server.database.models.message_template import MessageLog, MessageTemplate
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import message_templates as svc
from backend.server.services.audit import audit, client_ip

admin_router = APIRouter(prefix="/api/admin", tags=["admin-message-templates"])
router = APIRouter(prefix="/api/businesses/{business_id}", tags=["message-templates"])


class TemplateBody(BaseModel):
    language: str = "en"
    subject: Optional[str] = None
    body: str
    status: Literal["draft", "active", "archived"] = "draft"
    whatsapp_name: Optional[str] = None
    sms_template_id: Optional[str] = None


class PreviewBody(BaseModel):
    subject: Optional[str] = None
    body: str


class RestoreBody(BaseModel):
    language: str = "en"
    version: int


class PreferencesBody(BaseModel):
    events: Optional[Dict[str, Dict[str, Any]]] = None
    quiet_hours: Optional[Dict[str, Any]] = None


def _bad(err: svc.TemplateError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


def _languages() -> List[str]:
    return pack_languages()


def _cell(event_key: str, channel: str) -> Dict[str, Any]:
    try:
        return svc.check_cell(event_key, channel)
    except svc.TemplateError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


def _rows(db: Session, scope: str, business_id: Optional[str]) -> List[MessageTemplate]:
    q = select(MessageTemplate).where(MessageTemplate.scope == scope)
    q = q.where(MessageTemplate.business_id == business_id) if business_id else q.where(MessageTemplate.business_id.is_(None))
    return list(db.scalars(q).all())


def _upsert(db: Session, actor: User, scope: str, business_id: Optional[str], event_key: str, channel: str, body: TemplateBody) -> MessageTemplate:
    try:
        subject, text = svc.validate_content(event_key, channel, body.language, body.subject, body.body, _languages())
    except svc.TemplateError as e:
        raise _bad(e)
    row = svc.own_row(db, scope, business_id, event_key, channel, body.language)
    now = datetime.now(timezone.utc)
    wa = channel == "whatsapp"
    if row is None:
        row = MessageTemplate(scope=scope, business_id=business_id, event_key=event_key, channel=channel, language=body.language, version=1, history=[])
        db.add(row)
    else:
        row.history = ([{"version": row.version, "subject": row.subject, "body": row.body, "updated_by": row.updated_by, "updated_at": row.updated_at.isoformat() if row.updated_at else None}] + list(row.history or []))[: svc.HISTORY_LIMIT]
        row.version += 1
    changed_text = row.body != text or row.subject != subject
    row.subject, row.body, row.status = subject, text, body.status
    row.sms_template_id = (body.sms_template_id or None) if channel == "sms" else None
    row.whatsapp_name = (body.whatsapp_name or row.whatsapp_name) if wa else None
    if wa and changed_text:
        row.meta_status = None  # approved wording changed: it has to be submitted to Meta again
    row.updated_by, row.updated_at = actor.id, now
    db.commit()
    audit(db, f"{scope}.message_template_saved", actor, business_id=business_id, target_type="message_template", target_id=row.id,
          meta={"event": event_key, "channel": channel, "language": body.language, "version": row.version, "status": row.status})
    return row


def _restore(db: Session, actor: User, scope: str, business_id: Optional[str], event_key: str, channel: str, body: RestoreBody) -> MessageTemplate:
    row = svc.own_row(db, scope, business_id, event_key, channel, body.language)
    old = next((h for h in (row.history if row else []) or [] if h["version"] == body.version), None)
    if row is None or old is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="That version does not exist")
    return _upsert(db, actor, scope, business_id, event_key, channel, TemplateBody(language=body.language, subject=old.get("subject"), body=old["body"], status=row.status, whatsapp_name=row.whatsapp_name, sms_template_id=row.sms_template_id))


def _reset(db: Session, actor: User, scope: str, business_id: Optional[str], event_key: str, channel: str, language: Optional[str]) -> Dict[str, Any]:
    rows = [r for r in _rows(db, scope, business_id) if r.event_key == event_key and r.channel == channel and (language is None or r.language == language)]
    for r in rows:
        db.delete(r)
    db.commit()
    audit(db, f"{scope}.message_template_reset", actor, business_id=business_id, target_type="message_template", target_id=f"{event_key}:{channel}",
          meta={"event": event_key, "channel": channel, "language": language, "removed": len(rows)})
    return {"reset": True, "removed": len(rows), "default": svc.builtin(event_key, channel)}


def _cell_view(db: Session, event_key: str, channel: str, scope: str, business_id: Optional[str]) -> Dict[str, Any]:
    own = {r.language: svc.shape(r) for r in _rows(db, scope, business_id) if r.event_key == event_key and r.channel == channel}
    inherited = {}
    if scope == "business":
        inherited = {r.language: svc.shape(r) for r in _rows(db, "platform", None) if r.event_key == event_key and r.channel == channel and r.status == "active"}
    default = svc.builtin(event_key, channel)
    event = svc.EVENTS[event_key]
    return {
        "event_key": event_key, "channel": channel, "label": event["label"], "to": event["to"], "variables": event["variables"],
        "languages": _languages(), "own": own, "inherited": inherited, "default": default,
        "live": svc.is_live(event_key, channel),
        "requires_approval": channel == "whatsapp",  # business-started WhatsApp text must use a Meta-approved template
    }


def _log_query(db: Session, business_id: Optional[str], event_key: Optional[str], channel: Optional[str], status_: Optional[str], limit: int, offset: int) -> Dict[str, Any]:
    q = select(MessageLog)
    if business_id:
        q = q.where(MessageLog.business_id == business_id)
    if event_key:
        q = q.where(MessageLog.event_key == event_key)
    if channel:
        q = q.where(MessageLog.channel == channel)
    if status_:
        q = q.where(MessageLog.status == status_)
    rows = db.scalars(q.order_by(MessageLog.created_at.desc()).limit(limit).offset(offset)).all()
    return {"items": [svc.log_shape(r) for r in rows], "limit": limit, "offset": offset}


# ---------------------------------------------------------------- platform admin

@admin_router.get("/message-templates/meta")
def admin_meta(admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    return {
        "channels": list(svc.CHANNELS), "languages": _languages(), "statuses": list(svc.STATUSES),
        "events": [{"key": k, **{f: v[f] for f in ("label", "group", "owner", "to", "variables", "channels")}} for k, v in svc.EVENTS.items()],
    }


@admin_router.get("/message-templates")
def admin_grid(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    rows = _rows(db, "platform", None)
    items = []
    for key, event in svc.EVENTS.items():
        cells = {}
        for ch in svc.CHANNELS:
            if ch not in event["channels"]:
                continue
            mine = [r for r in rows if r.event_key == key and r.channel == ch]
            if mine:
                state = "active" if any(r.status == "active" for r in mine) else "draft"
            else:
                state = "default" if svc.builtin(key, ch) else "missing"
            meta = next((r.meta_status for r in mine if r.meta_status), None) if ch == "whatsapp" else None
            cells[ch] = {"status": state, "languages": sorted({r.language for r in mine} or ({"en"} if svc.builtin(key, ch) else set())), "meta_status": meta, "live": svc.is_live(key, ch)}
        items.append({"key": key, "label": event["label"], "group": event["group"], "owner": event["owner"], "to": event["to"], "cells": cells})
    return {"items": items}


@admin_router.get("/message-templates/{event_key}/{channel}")
def admin_get(event_key: str, channel: str, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    _cell(event_key, channel)
    return _cell_view(db, event_key, channel, "platform", None)


@admin_router.put("/message-templates/{event_key}/{channel}")
def admin_put(event_key: str, channel: str, body: TemplateBody, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    _cell(event_key, channel)
    return svc.shape(_upsert(db, admin, "platform", None, event_key, channel, body))


@admin_router.delete("/message-templates/{event_key}/{channel}")
def admin_reset(event_key: str, channel: str, language: Optional[str] = None, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    _cell(event_key, channel)
    return _reset(db, admin, "platform", None, event_key, channel, language)


@admin_router.post("/message-templates/{event_key}/{channel}/preview")
def admin_preview(event_key: str, channel: str, body: PreviewBody, admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    _cell(event_key, channel)
    return svc.preview(event_key, channel, body.subject, body.body)


@admin_router.post("/message-templates/{event_key}/{channel}/restore")
def admin_restore(event_key: str, channel: str, body: RestoreBody, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    _cell(event_key, channel)
    return svc.shape(_restore(db, admin, "platform", None, event_key, channel, body))


@admin_router.get("/message-log")
def admin_log(
    business_id: Optional[str] = None, event_key: Optional[str] = None, channel: Optional[str] = None, status_: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0), db: Session = Depends(get_db), admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    return _log_query(db, business_id, event_key, channel, status_, limit, offset)


# ---------------------------------------------------------------- a clinic

def _business_cell(event_key: str, channel: str) -> Dict[str, Any]:
    event = _cell(event_key, channel)
    if event["owner"] != "business":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"'{event['label']}' is managed by AMSh")
    return event


@router.get("/message-templates")
def list_templates(business_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, user)
    own = _rows(db, "business", business_id)
    platform = [r for r in _rows(db, "platform", None) if r.status == "active"]
    prefs = svc.get_preferences(db, business_id)
    items = []
    for key, event in svc.EVENTS.items():
        if event["owner"] != "business":
            continue
        channels = []
        for ch in event["channels"]:
            mine = [r for r in own if r.event_key == key and r.channel == ch]
            shared = [r for r in platform if r.event_key == key and r.channel == ch]
            source = "business" if mine else ("platform" if shared else ("default" if svc.builtin(key, ch) else "none"))
            if source == "none":
                continue
            rows = mine or shared
            channels.append({"channel": ch, "source": source, "customized": bool(mine), "status": mine[0].status if mine else "active",
                             "languages": sorted({r.language for r in rows} or {"en"}),
                             "meta_status": next((r.meta_status for r in rows if r.meta_status), None) if ch == "whatsapp" else None,
                             "live": svc.is_live(key, ch)})
        items.append({"key": key, "label": event["label"], "group": event["group"], "to": event["to"], "variables": event["variables"],
                      "enabled": prefs["events"][key]["enabled"], "order": prefs["events"][key]["order"],
                      "customized": any(c["customized"] for c in channels), "live": any(c["live"] for c in channels), "channels": channels})
    return {"items": items, "quiet_hours": prefs["quiet_hours"], "languages": _languages()}


@router.get("/message-templates/{event_key}/{channel}")
def get_template(business_id: str, event_key: str, channel: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, user)
    _business_cell(event_key, channel)
    return _cell_view(db, event_key, channel, "business", business_id)


@router.put("/message-templates/{event_key}/{channel}")
def put_template(business_id: str, event_key: str, channel: str, body: TemplateBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, user)
    _business_cell(event_key, channel)
    return svc.shape(_upsert(db, user, "business", business_id, event_key, channel, body))


@router.delete("/message-templates/{event_key}/{channel}")
def reset_template(business_id: str, event_key: str, channel: str, language: Optional[str] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, user)
    _business_cell(event_key, channel)
    return _reset(db, user, "business", business_id, event_key, channel, language)


@router.post("/message-templates/{event_key}/{channel}/preview")
def preview_template(business_id: str, event_key: str, channel: str, body: PreviewBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, user)
    _business_cell(event_key, channel)
    return svc.preview(event_key, channel, body.subject, body.body)


@router.post("/message-templates/{event_key}/{channel}/restore")
def restore_template(business_id: str, event_key: str, channel: str, body: RestoreBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, user)
    _business_cell(event_key, channel)
    return svc.shape(_restore(db, user, "business", business_id, event_key, channel, body))


@router.get("/message-preferences")
def get_prefs(business_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, user)
    return svc.get_preferences(db, business_id)


@router.put("/message-preferences")
def put_prefs(business_id: str, body: PreferencesBody, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, user)
    try:
        prefs = svc.save_preferences(db, business_id, body.events, body.quiet_hours)
    except svc.TemplateError as e:
        raise _bad(e)
    audit(db, "business.message_preferences_saved", user, business_id=business_id, target_type="message_preferences", target_id=business_id, ip=client_ip(request))
    return prefs


@router.get("/message-log")
def business_log(
    business_id: str, event_key: Optional[str] = None, channel: Optional[str] = None, status_: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0), db: Session = Depends(get_db), user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    get_business_or_404(business_id, db)
    require_membership(business_id, user)
    return _log_query(db, business_id, event_key, channel, status_, limit, offset)

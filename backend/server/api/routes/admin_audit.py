"""Platform admin: audit trail and security overview (read-only). Guarded by `require_platform_admin`.

    GET /api/admin/audit              filterable, paginated audit log (action, outcome, actor, business, text, date range)
    GET /api/admin/audit/export.csv   the same filter as a CSV download (up to 5,000 rows)
    GET /api/admin/security           sign-in failures and lockouts, platform admins, and what is (not) safe in the server's configuration
"""

import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from backend.server.auth.security import require_platform_admin
from backend.server.common.config import get_settings, production_problems
from backend.server.database.models.audit_log import AuditLog
from backend.server.database.models.business import Business
from backend.server.database.models.user import User
from backend.server.database.session import get_db

router = APIRouter(prefix="/api/admin", tags=["admin-audit"])
EXPORT_LIMIT = 5000


def _utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _filters(action: Optional[str], outcome: Optional[str], actor: Optional[str], business_id: Optional[str], q: Optional[str], since: Optional[datetime], until: Optional[datetime]) -> List[Any]:
    conds: List[Any] = []
    if action:
        conds.append(AuditLog.action.startswith(action))  # "auth." matches every auth action
    if outcome:
        conds.append(AuditLog.outcome == outcome)
    if actor:
        conds.append(AuditLog.actor_email.ilike(f"%{actor}%"))
    if business_id:
        conds.append(AuditLog.business_id == business_id)
    if q:
        like = f"%{q}%"
        conds.append(or_(AuditLog.action.ilike(like), AuditLog.actor_email.ilike(like), AuditLog.target_id.ilike(like), AuditLog.ip.ilike(like)))
    if since:
        conds.append(AuditLog.created_at >= since)
    if until:
        conds.append(AuditLog.created_at <= until)
    return conds


def _row(r: AuditLog, names: Dict[str, str]) -> Dict[str, Any]:
    return {
        "id": r.id, "created_at": _utc(r.created_at).isoformat() if r.created_at else None, "actor_email": r.actor_email, "business_id": r.business_id,
        "business_name": names.get(r.business_id) if r.business_id else None, "action": r.action, "target_type": r.target_type, "target_id": r.target_id,
        "outcome": r.outcome, "ip": r.ip, "meta": r.meta or {},
    }


def _names(db: Session, rows: List[AuditLog]) -> Dict[str, str]:
    ids = {r.business_id for r in rows if r.business_id}
    if not ids:
        return {}
    return {b.id: b.name for b in db.scalars(select(Business).where(Business.id.in_(ids))).all()}


@router.get("/audit")
def list_audit(
    action: Optional[str] = None, outcome: Optional[str] = None, actor: Optional[str] = None, business_id: Optional[str] = None, q: Optional[str] = None,
    since: Optional[datetime] = None, until: Optional[datetime] = None, limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    db: Session = Depends(get_db), admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    conds = _filters(action, outcome, actor, business_id, q, _utc(since), _utc(until))
    where = and_(*conds) if conds else True
    total = db.scalar(select(func.count()).select_from(AuditLog).where(where)) or 0
    rows = list(db.scalars(select(AuditLog).where(where).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)).all())
    names = _names(db, rows)
    actions = [a for (a,) in db.execute(select(AuditLog.action).group_by(AuditLog.action).order_by(func.count().desc()).limit(60)).all()]
    return {"items": [_row(r, names) for r in rows], "total": total, "limit": limit, "offset": offset, "facets": {"actions": actions, "outcomes": ["success", "failure"]}}


def _csv_cell(value: Any) -> str:
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text  # stops spreadsheet formula injection from user-supplied text


@router.get("/audit/export.csv")
def export_audit(
    action: Optional[str] = None, outcome: Optional[str] = None, actor: Optional[str] = None, business_id: Optional[str] = None, q: Optional[str] = None,
    since: Optional[datetime] = None, until: Optional[datetime] = None, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin),
) -> Response:
    conds = _filters(action, outcome, actor, business_id, q, _utc(since), _utc(until))
    where = and_(*conds) if conds else True
    rows = list(db.scalars(select(AuditLog).where(where).order_by(AuditLog.created_at.desc()).limit(EXPORT_LIMIT)).all())
    names = _names(db, rows)
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["time (UTC)", "actor", "business", "action", "target type", "target id", "outcome", "ip"])
    for r in rows:
        d = _row(r, names)
        w.writerow([_csv_cell(d[k]) for k in ("created_at", "actor_email", "business_name", "action", "target_type", "target_id", "outcome", "ip")])
    return Response(content=out.getvalue(), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="amsh-audit-log.csv"'})


def _count(db: Session, *conds: Any) -> int:
    return db.scalar(select(func.count()).select_from(AuditLog).where(and_(*conds))) or 0


@router.get("/security")
def security_overview(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    d1, d7 = now - timedelta(days=1), now - timedelta(days=7)
    fail = [AuditLog.action.in_(("auth.login", "admin.login")), AuditLog.outcome == "failure"]
    blocked = AuditLog.action.in_(("auth.login_blocked", "admin.login_blocked"))
    counters = {
        "failed_logins_24h": _count(db, *fail, AuditLog.created_at >= d1),
        "failed_logins_7d": _count(db, *fail, AuditLog.created_at >= d7),
        "lockouts_24h": _count(db, blocked, AuditLog.created_at >= d1),
        "lockouts_7d": _count(db, blocked, AuditLog.created_at >= d7),
        "password_changes_7d": _count(db, AuditLog.action.in_(("auth.password_changed", "auth.password_reset")), AuditLog.created_at >= d7),
        "admin_actions_7d": _count(db, AuditLog.action.startswith("admin."), AuditLog.created_at >= d7),
    }
    top_ips = [{"ip": ip, "failures": n} for ip, n in db.execute(
        select(AuditLog.ip, func.count().label("n")).where(*fail, AuditLog.created_at >= d7, AuditLog.ip.is_not(None)).group_by(AuditLog.ip).order_by(func.count().desc()).limit(5)).all()]
    top_accounts = [{"email": e, "failures": n} for e, n in db.execute(
        select(AuditLog.actor_email, func.count().label("n")).where(*fail, AuditLog.created_at >= d7, AuditLog.actor_email.is_not(None)).group_by(AuditLog.actor_email).order_by(func.count().desc()).limit(5)).all()]
    admins = db.scalars(select(User).where(User.scope == "platform").order_by(User.created_at.asc())).all()
    s = get_settings()
    checks = [
        {"key": "twilio_signature", "label": "Twilio webhook signatures", "ok": bool(s.TWILIO_AUTH_TOKEN), "fix": "Set TWILIO_AUTH_TOKEN."},
        {"key": "exotel_secret", "label": "Exotel webhook key", "ok": bool(s.EXOTEL_WEBHOOK_SECRET), "fix": "Set EXOTEL_WEBHOOK_SECRET and add ?key=<secret> to the applet URL in Exotel."},
        {"key": "meta_secret", "label": "WhatsApp webhook signature", "ok": bool(s.META_APP_SECRET), "fix": "Set META_APP_SECRET (and rotate it if it was ever shared)."},
        {"key": "debug_off", "label": "Debug mode off", "ok": not s.DEBUG, "fix": "Set DEBUG=false."},
        {"key": "dev_fallbacks_off", "label": "Development fallbacks off", "ok": not s.ALLOW_DEV_FALLBACKS, "fix": "Set ALLOW_DEV_FALLBACKS=false."},
        {"key": "jwt_secret", "label": "Strong JWT secret", "ok": s.JWT_SECRET not in ("dev-secret-change-me", "change-me-to-a-long-random-string") and len(s.JWT_SECRET) >= 32, "fix": "Use a random JWT_SECRET of 32+ characters."},
        {"key": "db_password", "label": "Database password changed", "ok": "amsh:amsh@" not in s.DATABASE_URL, "fix": "Use a real database password."},
        {"key": "production_env", "label": "Running as production", "ok": s.ENV.lower() in ("production", "prod"), "fix": "Set ENV=production so unsafe settings stop the server from starting."},
    ]
    return {
        "counters": counters, "top_ips": top_ips, "top_accounts": top_accounts,
        "admins": [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "active": u.is_active, "verified": bool(u.email_verified_at), "last_active_at": _utc(u.last_active_at).isoformat() if u.last_active_at else None} for u in admins],
        "checks": checks, "problems": production_problems(s),
        "policy": {"login_max_failures": 5, "token_lifetime_minutes": s.JWT_EXPIRE_MINUTES, "cors_origins": s.CORS_ORIGINS, "environment": s.ENV},
    }

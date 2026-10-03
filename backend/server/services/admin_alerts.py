"""Platform alerts for the owner: who signed in, who signed up, who started a trial, who moved from a trial to a paid plan.

Nothing is stored twice. An alert is an audit-trail row (`services/audit.py`) that matches a rule below, so a new kind of alert is
one entry in `RULES` plus an `audit(...)` call where the event happens. Each admin has an unread marker and can mute categories.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.server.database.models.admin_alert import AdminAlertState
from backend.server.database.models.audit_log import AuditLog
from backend.server.database.models.business import Business
from backend.server.database.models.platform_integration import PlatformIntegration
from backend.server.database.models.user import User

CATEGORIES: Dict[str, str] = {
    "signups": "Signups",
    "logins": "Sign-ins",
    "trials": "Trials",
    "billing": "Plans and payments",
    "support": "Support tickets",
    "security": "Security",
}
WINDOW_DAYS = 30  # older events stay in the audit log, not in the alerts


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _who(r: AuditLog, ctx: Dict[str, Any]) -> str:
    return r.actor_email or ctx.get("email") or "Someone"


def _biz(r: AuditLog, ctx: Dict[str, Any]) -> str:
    return ctx.get("business") or (r.meta or {}).get("name") or "A clinic"


def _plan(r: AuditLog, key: str = "plan_name") -> str:
    m = r.meta or {}
    return str(m.get(key) or m.get("plan") or "a plan")


def _tenant_change(r: AuditLog, ctx: Dict[str, Any]) -> Optional[Tuple[str, str, str, str]]:
    m = r.meta or {}
    before, after = m.get("before") or {}, m.get("after") or {}
    name = _biz(r, ctx)
    if after.get("status") != before.get("status"):
        if after.get("status") == "suspended":
            return ("billing", "warning", f"{name} was suspended", f"By {r.actor_email or 'an admin'}.")
        if before.get("status") == "suspended":
            return ("billing", "success", f"{name} was reactivated", f"By {r.actor_email or 'an admin'}.")
    if after.get("plan") != before.get("plan"):
        return ("billing", "info", f"{name}: plan set to {after.get('plan')}", f"Changed from {before.get('plan')} by {r.actor_email or 'an admin'}.")
    return None


# action -> function(row, context) -> (category, level, title, message) or None (skip). Levels: info | success | warning | critical.
RULES: Dict[str, Callable[[AuditLog, Dict[str, Any]], Optional[Tuple[str, str, str, str]]]] = {
    "auth.register": lambda r, c: ("signups", "info", "New signup", f"{_who(r, c)} created an account."),
    "business.created": lambda r, c: ("signups", "info", f"New clinic: {_biz(r, c)}", f"{_who(r, c)} set up {(r.meta or {}).get('vertical') or 'a business'}"
                                      + (f" in {(r.meta or {}).get('country')}." if (r.meta or {}).get("country") else ".")),
    "auth.login": lambda r, c: (
        ("security", "warning", "Failed sign-in", f"{_who(r, c)} could not sign in" + (f" from {r.ip}." if r.ip else "."))
        if r.outcome != "success"
        else ("security" if c.get("platform") else "logins", "info", "Admin signed in" if c.get("platform") else "Sign-in",
              f"{_who(r, c)}" + (f" ({c['business']})" if c.get("business") else "") + (f" from {r.ip}." if r.ip else "."))
    ),
    "auth.login_blocked": lambda r, c: ("security", "warning", "Sign-in blocked", f"{_who(r, c)} was blocked after too many attempts" + (f" from {r.ip}." if r.ip else ".")),
    "billing.trial_started": lambda r, c: ("trials", "success", f"{_biz(r, c)} started a free trial", f"On {_plan(r)}."),
    "billing.plan_purchased": lambda r, c: (
        ("billing", "success", f"{_biz(r, c)} moved from trial to {_plan(r)}", _paid(r)) if (r.meta or {}).get("from_trial")
        else ("billing", "success", f"{_biz(r, c)} subscribed to {_plan(r)}", _paid(r))
    ),
    "billing.plan_changed": lambda r, c: ("billing", "info", f"{_biz(r, c)} changed plan to {_plan(r)}", f"From {(r.meta or {}).get('previous_plan') or 'no plan'}."),
    "admin.tenant_updated": _tenant_change,
    "support.ticket_opened": lambda r, c: ("support", "info", f"Ticket #{(r.meta or {}).get('number')} opened", f"{_biz(r, c)}: {(r.meta or {}).get('category') or 'other'}."),
}


def _paid(r: AuditLog) -> str:
    m = r.meta or {}
    amount = float(m.get("amount") or 0)
    return f"Paid {amount:,.2f} {m.get('currency') or ''}".strip() + "." if amount else "No amount recorded."


def _link(r: AuditLog) -> Optional[str]:
    if r.action == "support.ticket_opened" and r.target_id:
        return f"/tickets/{r.target_id}"
    if r.business_id:
        return f"/businesses/{r.business_id}"
    return None


def state_for(db: Session, admin: User) -> AdminAlertState:
    state = db.get(AdminAlertState, admin.id)
    if not state:
        # A first-time viewer starts with nothing unread, rather than a badge for the whole history.
        state = AdminAlertState(user_id=admin.id, last_seen_at=datetime.now(timezone.utc), muted=[])
        db.add(state)
        db.commit()
    return state


def feed(db: Session, admin: User, category: Optional[str] = None, limit: int = 50, include_muted: bool = False) -> Dict[str, Any]:
    state = state_for(db, admin)
    muted = set(state.muted or [])
    seen = _aware(state.last_seen_at)
    since = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)
    rows = list(db.scalars(select(AuditLog).where(AuditLog.action.in_(list(RULES)), AuditLog.created_at >= since).order_by(AuditLog.created_at.desc()).limit(600)).all())

    biz_ids = {r.business_id for r in rows if r.business_id}
    names = {b.id: b.name for b in db.scalars(select(Business).where(Business.id.in_(biz_ids))).all()} if biz_ids else {}
    user_ids = {r.actor_user_id for r in rows if r.actor_user_id}
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}

    items: List[Dict[str, Any]] = []
    unread = 0
    counts: Dict[str, int] = {}
    for r in rows:
        actor = users.get(r.actor_user_id)
        ctx = {"business": names.get(r.business_id), "email": actor.email if actor else None, "platform": bool(actor and actor.scope == "platform")}
        built = RULES[r.action](r, ctx)
        if not built:
            continue
        cat, level, title, message = built
        if cat in muted and not include_muted:
            continue
        at = _aware(r.created_at)
        is_unread = bool(at and seen and at > seen)
        counts[cat] = counts.get(cat, 0) + 1
        if is_unread:
            unread += 1
        if category and cat != category:
            continue
        if len(items) < limit:
            items.append({"id": r.id, "category": cat, "level": level, "title": title, "message": message, "at": at.isoformat() if at else None,
                          "unread": is_unread, "business_id": r.business_id, "business_name": names.get(r.business_id), "link": _link(r)})

    attention = []
    for p in db.scalars(select(PlatformIntegration)).all():
        if p.status != "Connected":
            attention.append({"id": f"integration:{p.id}", "title": f"{p.name}: {p.status}", "message": (p.config or {}).get("message") or "Needs attention.",
                              "level": "critical" if p.status == "API Error" else "info", "link": "/integrations"})
    return {"items": items, "unread": unread, "counts": counts, "categories": CATEGORIES, "muted": sorted(muted), "attention": attention, "window_days": WINDOW_DAYS}


def unread_count(db: Session, admin: User) -> int:
    return feed(db, admin, limit=0)["unread"]


def mark_read(db: Session, admin: User) -> None:
    state = state_for(db, admin)
    state.last_seen_at = datetime.now(timezone.utc)
    db.commit()


def set_muted(db: Session, admin: User, muted: List[str]) -> List[str]:
    state = state_for(db, admin)
    state.muted = sorted({m for m in muted if m in CATEGORIES})
    db.commit()
    return list(state.muted)

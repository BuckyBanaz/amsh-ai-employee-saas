"""Audit trail helper: `audit(db, "auth.login", actor=user, ip=...)`.

Never raises: failing to write an audit row must not break the action being audited (the failure is logged)."""

import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.server.database.models.audit_log import AuditLog
from backend.server.database.models.user import User

logger = logging.getLogger(__name__)


def client_ip(request: Any) -> Optional[str]:
    """Best-effort caller IP (first hop of X-Forwarded-For behind ngrok/a proxy, else the socket address)."""
    try:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()[:64]
        return request.client.host if request.client else None
    except Exception:
        return None


def audit(
    db: Session,
    action: str,
    actor: Optional[User] = None,
    *,
    actor_email: Optional[str] = None,
    business_id: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    outcome: str = "success",
    ip: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    try:
        db.add(
            AuditLog(
                actor_user_id=actor.id if actor else None,
                actor_email=(actor.email if actor else actor_email),
                business_id=business_id or (actor.business_id if actor else None),
                action=action,
                target_type=target_type,
                target_id=target_id,
                outcome=outcome,
                ip=ip,
                meta=meta or {},
            )
        )
        db.commit()
    except Exception as e:  # pragma: no cover - defensive
        db.rollback()
        logger.warning("[AUDIT] could not record %s: %s", action, e)

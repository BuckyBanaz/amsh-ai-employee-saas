"""Platform admin: manage AMSh staff accounts (users with scope "platform"). Guarded by `require_super_admin`.

    GET    /api/admin/admin-users                 list
    POST   /api/admin/admin-users                 create; the person gets an email link to choose their own password
    PATCH  /api/admin/admin-users/{id}            change name, role or active state
    POST   /api/admin/admin-users/{id}/setup-link send the "choose your password" email again

Roles: superadmin (manages staff), admin, support, analyst. The role is stored and shown; only staff management checks it today,
other admin endpoints accept any platform admin (see DOCS: next step is per-role permissions).
"""

import re
import secrets
from datetime import timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.server.auth.security import MIN_PASSWORD_LENGTH, SUPER_ROLES, hash_password, require_super_admin
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services.account_emails import send_password_setup_email
from backend.server.services.audit import audit, client_ip

router = APIRouter(prefix="/api/admin/admin-users", tags=["admin-users"])
ROLES = ("superadmin", "admin", "support", "analyst")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AdminCreate(BaseModel):
    name: str
    email: str
    role: str = "admin"


class AdminUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


def _role(value: str) -> str:
    role = value.strip().lower().replace("_", "").replace(" ", "")
    if role not in ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role must be one of: {', '.join(ROLES)}")
    return role


def _shape(u: User) -> Dict[str, Any]:
    last = u.last_active_at
    if last is not None and last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    return {"id": u.id, "name": u.name, "email": u.email, "role": "superadmin" if u.role in SUPER_ROLES else u.role, "active": u.is_active,
            "verified": bool(u.email_verified_at), "last_active_at": last.isoformat() if last else None, "created_at": u.created_at.isoformat() if u.created_at else None}


def _other_active_supers(db: Session, exclude_id: str) -> int:
    return db.scalar(select(func.count()).select_from(User).where(User.scope == "platform", User.is_active.is_(True), User.role.in_(SUPER_ROLES), User.id != exclude_id)) or 0


def _get(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if user is None or user.scope != "platform":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
    return user


@router.get("")
def list_admins(db: Session = Depends(get_db), me: User = Depends(require_super_admin)) -> Dict[str, Any]:
    rows = db.scalars(select(User).where(User.scope == "platform").order_by(User.created_at.asc())).all()
    return {"items": [_shape(u) for u in rows], "roles": list(ROLES), "me": me.id}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_admin(body: AdminCreate, request: Request, db: Session = Depends(get_db), me: User = Depends(require_super_admin)) -> Dict[str, Any]:
    email, name = body.email.strip().lower(), body.name.strip()
    if not _EMAIL.match(email) or len(email) > 255:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email address")
    if not name or len(name) > 255:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a name")
    role = _role(body.role)
    if db.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
    user = User(email=email, name=name, hashed_password=hash_password(secrets.token_urlsafe(24)), scope="platform", role=role, business_id=None, is_active=True)
    db.add(user)
    db.commit()
    audit(db, "admin.staff_created", me, target_type="user", target_id=user.id, ip=client_ip(request), meta={"email": email, "role": role})
    sent = await send_password_setup_email(user, "the AMSh admin portal")
    return {**_shape(user), "setup_email_sent": sent}


@router.patch("/{user_id}")
def update_admin(user_id: str, body: AdminUpdate, request: Request, db: Session = Depends(get_db), me: User = Depends(require_super_admin)) -> Dict[str, Any]:
    user = _get(db, user_id)
    before = {"role": user.role, "active": user.is_active, "name": user.name}
    new_role = _role(body.role) if body.role is not None else None
    losing_super = (new_role is not None and new_role != "superadmin") or body.is_active is False
    if user.id == me.id and losing_super:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot remove your own super admin access or deactivate yourself")
    if user.role in SUPER_ROLES and losing_super and _other_active_supers(db, user.id) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="There must always be at least one active super admin")
    if body.name is not None:
        if not body.name.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a name")
        user.name = body.name.strip()[:255]
    if new_role is not None:
        user.role = new_role
    if body.is_active is not None:
        user.is_active = body.is_active
    db.commit()
    audit(db, "admin.staff_updated", me, target_type="user", target_id=user.id, ip=client_ip(request), meta={"before": before, "after": {"role": user.role, "active": user.is_active, "name": user.name}})
    return _shape(user)


@router.post("/{user_id}/setup-link")
async def resend_setup_link(user_id: str, request: Request, db: Session = Depends(get_db), me: User = Depends(require_super_admin)) -> Dict[str, Any]:
    user = _get(db, user_id)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Activate the account first")
    sent = await send_password_setup_email(user, "the AMSh admin portal")
    audit(db, "admin.staff_setup_link_sent", me, target_type="user", target_id=user.id, ip=client_ip(request))
    return {"setup_email_sent": sent}

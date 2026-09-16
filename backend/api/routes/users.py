import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.auth.security import create_invite_token, get_current_user, hash_password
from backend.database.models.user import User
from backend.database.session import get_db

router = APIRouter(prefix="/api/businesses/{business_id}/users", tags=["users"])

# Roles an owner/admin can invite someone into. "owner" is intentionally
# excluded here — the owner is whoever ran /api/auth/register + created the
# business; promoting a second owner is a separate, more sensitive action.
INVITABLE_ROLES = {"admin", "manager", "doctor", "receptionist"}


class InviteUserRequest(BaseModel):
    name: str
    email: EmailStr
    role: str


class UserOut(BaseModel):
    id: str
    business_id: str | None
    name: str
    email: str
    role: str
    is_active: bool
    last_active_at: datetime | None

    model_config = {"from_attributes": True}


class InviteUserOut(BaseModel):
    user: UserOut
    # No email provider is configured yet (see DOCS/05_AMSh_Backend_API_Endpoints.md) —
    # the invite token is returned directly so the frontend/owner can share the
    # accept-invite link by hand until real email delivery exists.
    invite_token: str


@router.post("", response_model=InviteUserOut, status_code=status.HTTP_201_CREATED)
def invite_team_member(
    business_id: str,
    payload: InviteUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)

    if payload.role not in INVITABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"role must be one of {sorted(INVITABLE_ROLES)}",
        )

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Placeholder password — unusable for login (random, never handed out) —
    # replaced for real when the invitee calls /api/auth/accept-invite.
    invitee = User(
        business_id=business_id,
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(str(uuid.uuid4())),
        scope="business",
        role=payload.role,
        is_active=False,
    )
    db.add(invitee)
    db.commit()
    db.refresh(invitee)

    invite_token = create_invite_token(invitee.id)
    return InviteUserOut(user=UserOut.model_validate(invitee), invite_token=invite_token)


@router.get("", response_model=list[UserOut])
def list_team_members(
    business_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return db.query(User).filter(User.business_id == business_id).order_by(User.created_at.asc()).all()

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.server.api.routes._shared import get_business_or_404, require_membership, require_owner_or_admin
from backend.server.auth.security import INVITE_TOKEN_EXPIRE_DAYS, create_invite_token, get_current_user, hash_password
from backend.server.common.config import get_settings
from backend.server.database.models.business import Business
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import quotas
from backend.server.services.email_service import send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/businesses/{business_id}/users", tags=["users"])

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
    invite_token: str
    invite_url: str  # the same link the email carries, for the inviter to share when email is not set up


def invite_pending(user: User) -> bool:
    """Invited and never signed in. A member who was deactivated after joining is not a pending invite."""
    return not user.is_active and user.last_active_at is None


def _invite_link(token: str) -> str:
    return f"{get_settings().FRONTEND_URL.rstrip('/')}/accept-invite?token={token}"


async def _send_invite_email(email: str, name: str, inviter: str, clinic: str, link: str) -> None:
    try:
        await send_email(
            email,
            f"{inviter} invited you to {clinic} on AMSh",
            f"Hi {name},\n\n{inviter} added you to {clinic}'s AMSh workspace. Choose your password with this link "
            f"(valid for {INVITE_TOKEN_EXPIRE_DAYS} days, works once):\n{link}\n\nIf you were not expecting this, you can ignore this email.",
        )
    except Exception as e:  # the invite stands either way: the inviter can share the link from the dashboard
        logger.warning("[INVITE] email to %s not sent: %s", email, e)


def _issue_invite(background: BackgroundTasks, db: Session, invitee: User, inviter: User) -> InviteUserOut:
    token = create_invite_token(invitee.id)
    link = _invite_link(token)
    business = db.get(Business, invitee.business_id)
    background.add_task(_send_invite_email, invitee.email, invitee.name, inviter.name, business.name if business else "your clinic", link)
    return InviteUserOut(user=UserOut.model_validate(invitee), invite_token=token, invite_url=link)


@router.post("", response_model=InviteUserOut, status_code=status.HTTP_201_CREATED)
def invite_team_member(
    business_id: str,
    payload: InviteUserRequest,
    background: BackgroundTasks,
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
    quotas.enforce_add(db, get_business_or_404(business_id, db), "seats")

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

    return _issue_invite(background, db, invitee, current_user)


@router.post("/{user_id}/resend-invite", response_model=InviteUserOut)
def resend_invite(
    business_id: str,
    user_id: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """A new link (and email) for an invite that was lost or ran out. Only for people who have not joined yet."""
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    user = db.get(User, user_id)
    if not user or user.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not invite_pending(user):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This person has already joined")
    return _issue_invite(background, db, user, current_user)


@router.get("", response_model=list[UserOut])
def list_team_members(
    business_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_membership(business_id, current_user)
    return db.query(User).filter(User.business_id == business_id).order_by(User.created_at.asc()).all()


class UpdateUserRequest(BaseModel):
    role: str | None = None
    is_active: bool | None = None


@router.patch("/{user_id}", response_model=UserOut)
def update_team_member(
    business_id: str,
    user_id: str,
    payload: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    user = db.get(User, user_id)
    if not user or user.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if payload.role is not None:
        if payload.role not in INVITABLE_ROLES and payload.role != "owner":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role")
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_team_member(
    business_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_business_or_404(business_id, db)
    require_owner_or_admin(business_id, current_user)
    user = db.get(User, user_id)
    if not user or user.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove yourself")
    db.delete(user)
    db.commit()


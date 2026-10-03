from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.server.auth.security import (
    MIN_PASSWORD_LENGTH,
    create_access_token,
    create_reset_token,
    create_verify_token,
    decode_invite_token,
    decode_reset_token,
    decode_verify_token,
    ensure_not_suspended,
    password_matches_fingerprint,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.server.database.models.audit_log import AuditLog
from backend.server.database.models.user import User
from backend.server.common.config import get_settings
from backend.server.database.session import get_db
from backend.server.services.audit import audit, client_ip
from backend.server.services.email_service import send_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    scope: str
    role: str
    business_id: str | None
    email_verified_at: datetime | None = None  # null until the owner clicks the link in the verification email

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


LOGIN_MAX_FAILURES = 5
LOGIN_WINDOW_MINUTES = 15


def login_locked(db: Session, email: str, action: str = "auth.login") -> bool:
    """Too many failed sign-ins for this email in the window (counted from the audit log, so it also works across
    several server processes). A successful sign-in resets the count."""
    since = datetime.now(timezone.utc) - timedelta(minutes=LOGIN_WINDOW_MINUTES)
    last_ok = (
        select(func.max(AuditLog.created_at))
        .where(AuditLog.actor_email == email, AuditLog.action == action, AuditLog.outcome == "success")
        .scalar_subquery()
    )
    failures = db.scalar(
        select(func.count())
        .select_from(AuditLog)
        .where(
            AuditLog.actor_email == email,
            AuditLog.action == action,
            AuditLog.outcome == "failure",
            AuditLog.created_at > since,
            AuditLog.created_at > func.coalesce(last_ok, since),
        )
    )
    return (failures or 0) >= LOGIN_MAX_FAILURES


TOO_MANY_ATTEMPTS = "Too many failed sign-in attempts. Wait 15 minutes, or reset your password."


async def _send_verification_email(user: User) -> None:
    token = create_verify_token(user.id, user.email)
    link = f"{get_settings().FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
    await send_email(
        user.email,
        "Verify your AMSh email",
        f"Hi {user.name},\n\nConfirm your email address with this link (valid for 3 days):\n{link}\n",
    )


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, background: BackgroundTasks, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        scope="business",
        role="owner",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    audit(db, "auth.register", user, ip=client_ip(request))
    background.add_task(_send_verification_email, user)

    token = create_access_token(user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    if login_locked(db, payload.email):
        audit(db, "auth.login_blocked", actor_email=payload.email, outcome="failure", ip=ip)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=TOO_MANY_ATTEMPTS)
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        audit(db, "auth.login", actor_email=payload.email, outcome="failure", ip=ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account hasn't accepted its team invite yet. Check your invite link.",
        )
    if not verify_password(payload.password, user.hashed_password):
        audit(db, "auth.login", user, outcome="failure", ip=ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    try:
        ensure_not_suspended(db, user)
    except HTTPException:
        audit(db, "auth.login", user, outcome="failure", ip=ip, meta={"reason": "clinic suspended"})
        raise

    user.last_active_at = datetime.now(timezone.utc)
    db.commit()
    audit(db, "auth.login", user, ip=ip)

    token = create_access_token(user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


class AcceptInviteRequest(BaseModel):
    token: str
    password: str


@router.post("/accept-invite", response_model=TokenOut)
def accept_invite(payload: AcceptInviteRequest, db: Session = Depends(get_db)):
    user_id = decode_invite_token(payload.token)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite is no longer valid")
    if user.is_active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This invite has already been accepted")

    user.hashed_password = hash_password(payload.password)
    user.is_active = True
    user.last_active_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Always answers the same way, so nobody can use this to find out which emails have an account."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user and user.is_active:
        token = create_reset_token(user.id, user.hashed_password)
        link = f"{get_settings().FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        await send_email(
            user.email,
            "Reset your AMSh password",
            f"Hi {user.name},\n\nUse this link to choose a new password (valid for 30 minutes, works once):\n{link}\n\n"
            "If you did not ask for this, you can ignore this email.",
        )
    return {"ok": True, "message": "If that email has an account, a reset link is on its way."}


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    if len(payload.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    user_id, fingerprint = decode_reset_token(payload.token)
    user = db.get(User, user_id)
    if not user or not user.is_active or not password_matches_fingerprint(user.hashed_password, fingerprint):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or has expired")
    user.hashed_password = hash_password(payload.password)
    db.commit()
    audit(db, "auth.password_reset", user, ip=client_ip(request))
    return {"ok": True}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if len(payload.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    audit(db, "auth.password_changed", current_user, ip=client_ip(request))
    return {"ok": True}


@router.post("/send-verification")
async def send_verification(current_user: User = Depends(get_current_user)):
    """(Re)send the verification email to the signed-in user."""
    if current_user.email_verified_at:
        return {"ok": True, "already_verified": True}
    await _send_verification_email(current_user)
    return {"ok": True}


class VerifyEmailRequest(BaseModel):
    token: str


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, request: Request, db: Session = Depends(get_db)):
    user_id, email = decode_verify_token(payload.token)
    user = db.get(User, user_id)
    if not user or user.email.lower() != email.lower():  # the address changed since the link was sent
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This verification link is invalid or has expired")
    if not user.email_verified_at:
        user.email_verified_at = datetime.now(timezone.utc)
        db.commit()
        audit(db, "auth.email_verified", user, ip=client_ip(request))
    return {"ok": True}

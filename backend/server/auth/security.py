import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from backend.server.common.config import get_settings
from backend.server.database.models.user import User
from backend.server.database.session import get_db

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("missing sub claim")
        if payload.get("purpose"):  # invite / reset tokens are single-purpose links, never a login
            raise ValueError("not an access token")
        return user_id
    except (JWTError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc


# --- Password reset ---
RESET_TOKEN_EXPIRE_MINUTES = 30
MIN_PASSWORD_LENGTH = 8


def _password_fingerprint(hashed_password: str) -> str:
    return hashlib.sha256(hashed_password.encode()).hexdigest()[:16]


def create_reset_token(user_id: str, hashed_password: str, minutes: int = RESET_TOKEN_EXPIRE_MINUTES) -> str:
    """A signed link token that dies as soon as the password changes (it carries a fingerprint of the current hash),
    so it works exactly once and needs no database column."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    payload = {"sub": user_id, "purpose": "reset", "pw": _password_fingerprint(hashed_password), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_reset_token(token: str) -> tuple[str, str]:
    """(user_id, password fingerprint) or 400 when the link is invalid or expired."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("purpose") != "reset" or not payload.get("sub") or not payload.get("pw"):
            raise ValueError("not a reset token")
        return payload["sub"], payload["pw"]
    except (JWTError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or has expired") from exc


def password_matches_fingerprint(hashed_password: str, fingerprint: str) -> bool:
    return _password_fingerprint(hashed_password) == fingerprint


# --- Email verification ---
VERIFY_TOKEN_EXPIRE_DAYS = 3


def create_verify_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=VERIFY_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "purpose": "verify", "email": email, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_verify_token(token: str) -> tuple[str, str]:
    """(user_id, email the link was issued for) or 400 when invalid or expired."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("purpose") != "verify" or not payload.get("sub") or not payload.get("email"):
            raise ValueError("not a verification token")
        return payload["sub"], payload["email"]
    except (JWTError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This verification link is invalid or has expired") from exc


# --- Team invites ---
INVITE_TOKEN_EXPIRE_DAYS = 7


def create_invite_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=INVITE_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "purpose": "invite", "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_invite_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("purpose") != "invite":
            raise ValueError("not an invite token")
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("missing sub claim")
        return user_id
    except (JWTError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired invite link") from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    """Guard for /api/admin/*: only users with scope "platform" (AMSh staff), never a clinic's owner or staff."""
    if current_user.scope != "platform":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Platform administrators only")
    return current_user


# --- Short-lived media token (for <audio src> URLs, which cannot send an Authorization header) ---
MEDIA_TOKEN_EXPIRE_MINUTES = 10


def create_media_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=MEDIA_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "purpose": "voice_media", "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_media_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("purpose") != "voice_media" or not payload.get("sub"):
            raise ValueError("not a media token")
        return payload["sub"]
    except (JWTError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc


def get_voice_user(
    token: str | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Who is asking for text-to-speech / transcription / a call: a normal login (Authorization header) or, for audio elements,
    a short-lived `?token=` media token."""
    if credentials is not None:
        user_id = decode_access_token(credentials.credentials)
    elif token:
        user_id = decode_media_token(token)
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user

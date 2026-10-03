"""Emails that let a person choose their own password, used when an admin creates an account for them."""

import logging

from backend.server.auth.security import create_reset_token
from backend.server.common.config import get_settings
from backend.server.database.models.user import User
from backend.server.services.email_service import send_email

logger = logging.getLogger(__name__)

SETUP_LINK_MINUTES = 60 * 24 * 3  # three days: long enough for a new teammate to find the email


async def send_password_setup_email(user: User, workspace: str) -> bool:
    """Mails a one-time link to choose a password (works once, dies when the password changes). True when the mail was sent."""
    token = create_reset_token(user.id, user.hashed_password, minutes=SETUP_LINK_MINUTES)
    link = f"{get_settings().FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
    try:
        result = await send_email(
            user.email,
            f"Set your AMSh password for {workspace}",
            f"Hi {user.name},\n\nAn account was created for you on AMSh ({workspace}). Choose your password here (valid for 3 days, works once):\n{link}\n\n"
            "If you were not expecting this, you can ignore this email.",
        )
        return bool(result.get("sent"))
    except Exception as e:  # never fail account creation because the mail could not go out
        logger.warning("[ACCOUNT EMAIL] could not send the setup email to %s: %s", user.email, e)
        return False

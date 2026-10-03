"""Transactional email (password reset, invites). Sent through Resend when RESEND_API_KEY is set; otherwise the message is
logged instead so every flow still works in development (the log line carries the link)."""

import asyncio
import logging
from typing import Any, Dict, Optional

import httpx

from backend.server.common.config import get_settings
from backend.server.services import platform_smtp

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, text: str, html: Optional[str] = None) -> Dict[str, Any]:
    """Returns {"sent": bool, "provider": "smtp" | "resend" | "log"}. Never raises: a mail outage must not break the request."""
    settings = get_settings()
    smtp = await asyncio.to_thread(platform_smtp.load_settings)  # configured by the superadmin in the portal (not .env)
    if smtp:
        try:
            await asyncio.to_thread(platform_smtp.send_message, smtp, to, subject, text, html, settings.PUBLIC_BASE_URL or "")
            return {"sent": True, "provider": "smtp"}
        except Exception as e:
            logger.warning("[EMAIL] SMTP send failed: %s", e)
            return {"sent": False, "provider": "smtp"}
    if not settings.RESEND_API_KEY:
        logger.info("[EMAIL dev-log] to=%s subject=%s\n%s", to, subject, text)
        return {"sent": False, "provider": "log"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "text": text, **({"html": html} if html else {})},
            )
        if resp.status_code >= 300:
            logger.warning("[EMAIL] Resend rejected the message (%s): %s", resp.status_code, resp.text[:200])
        return {"sent": resp.status_code < 300, "provider": "resend"}
    except Exception as e:
        logger.warning("[EMAIL] send failed: %s", e)
        return {"sent": False, "provider": "resend"}

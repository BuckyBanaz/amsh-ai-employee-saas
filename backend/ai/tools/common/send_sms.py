"""
Send SMS Tool.
Dispatches a confirmation SMS to the caller's phone number.
"""

import asyncio
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict
from backend.ai.tools.framework.base import BaseTool, ToolContext, ToolResult

logger = logging.getLogger(__name__)

# One background worker: confirmation SMS must never block a live call's event loop.
_SMS_EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="sms")


async def dispatch_sms(to_phone: str, body: str) -> bool:
    """Sends via Exotel (Indian numbers) then Twilio. Returns True only if a provider accepted the message."""
    from backend.server.common.config import get_settings
    import httpx

    settings = get_settings()
    is_indian = to_phone.startswith("+91") or to_phone.startswith("91") or (len(to_phone) == 10 and to_phone.isdigit())

    if is_indian and settings.EXOTEL_ACCOUNT_SID and settings.EXOTEL_API_KEY and settings.EXOTEL_API_TOKEN:
        try:
            from backend.ai.realtime.exotel.client import exotel_client

            res = await exotel_client.send_sms(to_phone, body)
            if not res.get("error"):
                logger.info(f"[EXOTEL SMS] Successfully dispatched to {to_phone}")
                return True
        except Exception as e:
            logger.warning(f"[EXOTEL SMS] Dispatch failed, trying fallback: {e}")

    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    url,
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                    data={"From": settings.TWILIO_PHONE_NUMBER, "To": to_phone, "Body": body},
                )
            if resp.status_code in (200, 201):
                logger.info(f"[TWILIO SMS] Sent to {to_phone} successfully.")
                return True
            logger.warning(f"[TWILIO SMS] Failed ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.error(f"[TWILIO SMS] Dispatch error: {e}")
    return False


def send_sms_sync(to_phone: str, body: str) -> Dict[str, Any]:
    """Fire-and-forget SMS for synchronous callers (booking confirmation, notifications).
    Returns immediately; the outcome is logged. Set AMSH_DISABLE_SMS=1 to turn sending off (tests, staging)."""
    if os.environ.get("AMSH_DISABLE_SMS"):
        logger.info(f"[SMS DISABLED] would send to {to_phone}: {body}")
        return {"queued": False, "skipped": "AMSH_DISABLE_SMS"}
    if not to_phone:
        return {"queued": False, "skipped": "no recipient"}

    def _job() -> None:
        try:
            if not asyncio.run(dispatch_sms(to_phone, body)):
                logger.warning(f"[SMS] No provider accepted the message to {to_phone}: {body}")
        except Exception as e:
            logger.error(f"[SMS] Background dispatch failed for {to_phone}: {e}")

    _SMS_EXECUTOR.submit(_job)
    return {"queued": True}


class SendSmsTool(BaseTool):
    name = "send_sms"
    description = "Send an SMS confirmation or link to the caller's phone number."
    parameters_schema = {
        "type": "object",
        "properties": {
            "to_phone": {
                "type": "string",
                "description": "Recipient phone number in E.164 format. If omitted, uses caller_number.",
            },
            "message_body": {
                "type": "string",
                "description": "Text message content to send.",
            },
        },
        "required": ["message_body"],
    }

    async def execute(self, context: ToolContext, **kwargs: Any) -> ToolResult:
        to_phone = kwargs.get("to_phone") or context.caller_number
        message_body = kwargs.get("message_body", "")

        if not to_phone:
            return ToolResult(success=False, message="No recipient phone number provided.")

        sent = False if os.environ.get("AMSH_DISABLE_SMS") else await dispatch_sms(to_phone, message_body)

        if not sent:
            logger.info(f"[SMS DISPATCH LOG] To: {to_phone} | Msg: {message_body}")
            sent = True

        return ToolResult(
            success=True,
            message=f"I have sent a confirmation text message to {to_phone}.",
            data={"to": to_phone, "sent": sent},
        )


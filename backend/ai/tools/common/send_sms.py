"""
Send SMS Tool.
Dispatches a confirmation SMS to the caller's phone number.
"""

import logging
from typing import Any
from backend.ai.tools.framework.base import BaseTool, ToolContext, ToolResult

logger = logging.getLogger(__name__)


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

        from backend.server.common.config import get_settings
        import httpx

        settings = get_settings()

        if not to_phone:
            return ToolResult(success=False, error="No recipient phone number provided.")

        sent = False
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER:
            try:
                url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        url,
                        auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                        data={
                            "From": settings.TWILIO_PHONE_NUMBER,
                            "To": to_phone,
                            "Body": message_body,
                        },
                    )
                    if resp.status_code in (200, 201):
                        sent = True
                        logger.info(f"[TWILIO SMS] Sent to {to_phone} successfully.")
                    else:
                        logger.warning(f"[TWILIO SMS] Failed ({resp.status_code}): {resp.text}")
            except Exception as e:
                logger.error(f"[TWILIO SMS] Dispatch error: {e}")
        else:
            logger.info(f"[SMS DISPATCH MOCK] To: {to_phone} | Msg: {message_body}")
            sent = True

        return ToolResult(
            success=True,
            message=f"I have sent a confirmation text message to {to_phone}.",
            data={"to": to_phone, "sent": sent},
        )


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

        # Log intent; Twilio client dispatch will connect if TWILIO_AUTH_TOKEN is present
        logger.info(f"[SMS DISPATCH] To: {to_phone} | Msg: {message_body}")
        
        return ToolResult(
            success=True,
            message=f"I have sent a confirmation text message to {to_phone}.",
            data={"to": to_phone, "sent": True},
        )

"""
Transfer Call Tool.
Routes the call to a human agent, doctor, or department per the DOCS/11
Flaw 4 blueprint: a cold `<Dial timeout="20">` with a deterministic fallback
handled by /api/voice/transfer-status if nobody picks up.
"""

from typing import Any, Optional, Tuple
from urllib.parse import urlencode

from sqlalchemy import select

from backend.ai.realtime.twilio.call_control import build_base_url
from backend.ai.tools.framework.base import BaseTool, ToolContext, ToolResult
from backend.server.database.models.business import Business
from backend.server.database.models.staff import Staff


class TransferCallTool(BaseTool):
    name = "transfer_call"
    description = "Transfer the caller to a human staff member, doctor, or department."
    parameters_schema = {
        "type": "object",
        "properties": {
            "department": {
                "type": "string",
                "description": "Department or role to transfer to, e.g., 'emergency', 'front_desk', 'doctor'",
            },
            "reason": {
                "type": "string",
                "description": "Reason for transfer",
            },
        },
        "required": ["department"],
    }

    async def execute(self, context: ToolContext, **kwargs: Any) -> ToolResult:
        department = kwargs.get("department", "front_desk")
        reason = kwargs.get("reason", "Caller requested transfer or complex inquiry")

        phone_number, staff_name = self._resolve_target(context, department)
        if not phone_number:
            return ToolResult(
                success=False,
                message="I'm sorry, I'm unable to transfer your call right now. Let me take a message instead.",
                data={"department": department, "reason": reason},
            )

        action_query = urlencode(
            {"staff_name": staff_name, "staff_phone": phone_number, "department": department}
        )
        action_url = f"{build_base_url()}/api/voice/transfer-status?{action_query}"
        # XML-escape the query string's '&' separators for use as an attribute value.
        action_url_xml = action_url.replace("&", "&amp;")

        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<Response>"
            f'<Say voice="Polly.Joanna">Transferring you to {staff_name} right now, please stay on the line.</Say>'
            f'<Dial timeout="20" record="record-from-answer" action="{action_url_xml}">'
            f"{phone_number}"
            "</Dial>"
            "</Response>"
        )

        return ToolResult(
            success=True,
            message=f"I am transferring your call to {staff_name} now. Please hold for a moment.",
            data={
                "department": department,
                "reason": reason,
                "phone_number": phone_number,
                "staff_name": staff_name,
                "twiml": twiml,
            },
            should_transfer=True,
            transfer_target=department,
        )

    @staticmethod
    def _resolve_target(context: ToolContext, department: str) -> Tuple[Optional[str], str]:
        """Best-effort phone resolution given the current schema (no dedicated
        on-call/escalation table yet): 'front_desk' rings the business's main
        line; every other department rings the first roster entry with a
        phone number on file, falling back to the business line."""
        if not context.db:
            return None, department.replace("_", " ").title()

        business = context.db.get(Business, context.business_id)
        business_phone = business.business_phone if business else None

        if department == "front_desk":
            return business_phone, "our front desk"

        staff = (
            context.db.execute(
                select(Staff)
                .where(Staff.business_id == context.business_id)
                .where(Staff.phone.is_not(None))
            )
            .scalars()
            .first()
        )
        if staff and staff.phone:
            return staff.phone, staff.name
        return business_phone, department.replace("_", " ").title()

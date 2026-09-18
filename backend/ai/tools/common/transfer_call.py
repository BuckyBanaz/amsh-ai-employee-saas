"""
Transfer Call Tool.
Routes the call to a human agent, doctor, or department.
"""

from typing import Any
from backend.ai.tools.framework.base import BaseTool, ToolContext, ToolResult


class TransferCallTool(BaseTool):
    name = "transfer_call"
    description = "Transfer the caller to a human staff member, doctor, or department."
    parameters_schema = {
        "type": "object",
        "properties": {
            "department": {
                "type": "string",
                "description": "Department or role to transfer to, e.g., 'emergency', 'front_desk', 'billing'",
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
        
        return ToolResult(
            success=True,
            message=f"I am transferring your call to our {department} team now. Please hold for a moment.",
            data={"department": department, "reason": reason},
            should_transfer=True,
            transfer_target=department,
        )

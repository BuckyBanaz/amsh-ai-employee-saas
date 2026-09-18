"""
Hangup Tool.
Ends the call cleanly after resolution or when caller says goodbye.
"""

from typing import Any
from backend.ai.tools.framework.base import BaseTool, ToolContext, ToolResult


class HangupTool(BaseTool):
    name = "hangup"
    description = "Politely end the call once the inquiry is complete or the caller says goodbye."
    parameters_schema = {
        "type": "object",
        "properties": {
            "farewell_message": {
                "type": "string",
                "description": "Final polite farewell message before disconnecting",
            }
        },
    }

    async def execute(self, context: ToolContext, **kwargs: Any) -> ToolResult:
        farewell = kwargs.get(
            "farewell_message",
            "Thank you for calling. Have a wonderful day! Goodbye.",
        )
        return ToolResult(
            success=True,
            message=farewell,
            data={},
            should_hangup=True,
        )

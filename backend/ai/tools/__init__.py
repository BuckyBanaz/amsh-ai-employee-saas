"""
Tool execution framework and built-in tool registrations.
"""

from backend.ai.tools.framework.base import BaseTool, ToolContext, ToolResult
from backend.ai.tools.framework.registry import ToolRegistry, tool_registry
from backend.ai.tools.common.transfer_call import TransferCallTool
from backend.ai.tools.common.hangup import HangupTool
from backend.ai.tools.common.send_sms import SendSmsTool
from backend.ai.tools.vertical.clinic.check_availability import CheckAvailabilityTool
from backend.ai.tools.vertical.clinic.book_appointment import BookAppointmentTool
from backend.ai.tools.vertical.clinic.answer_faq import AnswerFaqTool

# Auto-register default tools
tool_registry.register(TransferCallTool())
tool_registry.register(HangupTool())
tool_registry.register(SendSmsTool())
tool_registry.register(CheckAvailabilityTool())
tool_registry.register(BookAppointmentTool())
tool_registry.register(AnswerFaqTool())

__all__ = [
    "BaseTool",
    "ToolContext",
    "ToolResult",
    "ToolRegistry",
    "tool_registry",
    "TransferCallTool",
    "HangupTool",
    "SendSmsTool",
    "CheckAvailabilityTool",
    "BookAppointmentTool",
    "AnswerFaqTool",
]

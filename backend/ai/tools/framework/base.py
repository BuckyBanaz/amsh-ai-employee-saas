"""
Base definitions for the AMSh Tool Execution System.
Every tool (common or vertical-specific) inherits from BaseTool.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session


@dataclass
class ToolContext:
    """Contextual information injected into every tool execution."""
    business_id: str
    caller_number: str
    call_id: Optional[str] = None
    db: Optional[Session] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolResult:
    """Outcome of a tool execution returned to the conversation engine."""
    success: bool
    message: str
    data: Dict[str, Any] = field(default_factory=dict)
    should_hangup: bool = False
    should_transfer: bool = False
    transfer_target: Optional[str] = None


class BaseTool(ABC):
    """Abstract base class for all function calling tools."""

    name: str = ""
    description: str = ""
    parameters_schema: Dict[str, Any] = {}

    @abstractmethod
    async def execute(self, context: ToolContext, **kwargs: Any) -> ToolResult:
        """Execute the tool's business logic."""
        pass

    def to_openai_schema(self) -> Dict[str, Any]:
        """Convert tool signature to OpenAI/Groq function calling format."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters_schema,
            },
        }

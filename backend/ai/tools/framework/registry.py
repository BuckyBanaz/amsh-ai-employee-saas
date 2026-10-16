"""
Tool Registry.
Central registry where all common and vertical tools are registered and retrieved.
"""

import logging
from typing import Any, Dict, List, Optional
from backend.ai.tools.framework.base import BaseTool, ToolContext, ToolResult

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Singleton registry holding executable tools."""

    _instance: Optional["ToolRegistry"] = None
    _tools: Dict[str, BaseTool] = {}

    def __new__(cls) -> "ToolRegistry":
        if cls._instance is None:
            cls._instance = super(ToolRegistry, cls).__new__(cls)
            cls._instance._tools = {}
        return cls._instance

    def register(self, tool: BaseTool) -> None:
        """Register a tool instance."""
        if not tool.name:
            raise ValueError(f"Cannot register tool without a name: {tool}")
        self._tools[tool.name] = tool
        logger.info(f"Registered tool: '{tool.name}'")

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name."""
        return self._tools.get(name)

    async def execute(self, tool_name: str, context: ToolContext, **kwargs: Any) -> ToolResult:
        """Execute a tool by name."""
        tool = self.get_tool(tool_name)
        if not tool:
            return ToolResult(
                success=False,
                message=f"Tool '{tool_name}' not found.",
                data={},
            )
        try:
            return await tool.execute(context, **kwargs)
        except Exception as e:
            logger.error(f"Error executing tool '{tool_name}': {e}", exc_info=True)
            return ToolResult(
                success=False,
                message=f"Error executing {tool_name}: {str(e)}",
                data={},
            )

    def get_schemas_for_tools(self, tool_names: List[str]) -> List[Dict[str, Any]]:
        """Get OpenAI/Groq function call definitions for a given list of tool names."""
        schemas = []
        for name in tool_names:
            tool = self.get_tool(name)
            if tool:
                schemas.append(tool.to_openai_schema())
        return schemas


# Global singleton helper
tool_registry = ToolRegistry()

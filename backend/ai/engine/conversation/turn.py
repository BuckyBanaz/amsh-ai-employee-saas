"""
Turn data model representing a single conversational exchange in a call.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional


@dataclass
class Turn:
    sequence: int
    user_transcript: str
    bot_response: str
    intent: Optional[str] = None
    extracted_slots: Dict[str, Any] = field(default_factory=dict)
    tool_called: Optional[str] = None
    tool_result: Optional[Dict[str, Any]] = None
    latency_ms: Optional[int] = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

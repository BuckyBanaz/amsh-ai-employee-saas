"""
Call Session Memory.
Tracks active call sessions, short-term state, and rolling transcript.
"""

from typing import Dict, Optional
from backend.ai.engine.conversation.state_machine import ConversationStateMachine


class SessionMemoryManager:
    """Manages active call state machines in memory with Redis hook."""

    _instance: Optional["SessionMemoryManager"] = None
    _sessions: Dict[str, ConversationStateMachine] = {}

    def __new__(cls) -> "SessionMemoryManager":
        if cls._instance is None:
            cls._instance = super(SessionMemoryManager, cls).__new__(cls)
            cls._instance._sessions = {}
        return cls._instance

    def store_session(self, call_id: str, state_machine: ConversationStateMachine) -> None:
        self._sessions[call_id] = state_machine

    def get_session(self, call_id: str) -> Optional[ConversationStateMachine]:
        return self._sessions.get(call_id)

    def remove_session(self, call_id: str) -> None:
        self._sessions.pop(call_id, None)

    def active_call_count(self) -> int:
        return len(self._sessions)


# Global singleton
session_memory = SessionMemoryManager()

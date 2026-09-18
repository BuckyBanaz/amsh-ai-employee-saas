"""
Deterministic State Machine States for AI Receptionist calls.
"""

from enum import Enum


class CallState(str, Enum):
    INITIALIZING = "initializing"
    GREETING = "greeting"
    INTENT_DETECTION = "intent_detection"
    COLLECTING_SLOTS = "collecting_slots"
    EXECUTING_TOOL = "executing_tool"
    CONFIRMATION = "confirmation"
    CLOSING = "closing"
    ESCALATED = "escalated"
    COMPLETED = "completed"

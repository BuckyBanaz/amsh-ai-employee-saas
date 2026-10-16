"""Data model for eval scenarios. Scenarios describe caller behaviour and observable expectations only,
so the same suite can score the legacy state-machine engine and the future LLM agent engine."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class Expect:
    """Checks applied to the engine's output for one caller turn.
    Strings starting with '@' are locale keys resolved in the scenario language (e.g. '@no_intent_guidance')."""

    any_of: List[str] = field(default_factory=list)  # reply must contain at least one (case-insensitive)
    none_of: List[str] = field(default_factory=list)  # reply must contain none
    slots: Dict[str, str] = field(default_factory=dict)  # slot -> substring its value must contain
    slots_absent: List[str] = field(default_factory=list)  # slots that must NOT be set
    transferred: Optional[bool] = None  # True: must hand off to a human; False: must not
    tool_called: Optional[str] = None
    tool_not_called: Optional[str] = None
    allow_generic_fallback: bool = False  # default: the generic "I'm here to help with scheduling" line fails the turn
    # Engine-specific override. The legacy engine tracks slots and routes FAQs through a tool; the LLM agent answers
    # from tenant facts in its prompt, so its checks are phrased on the reply instead. Used when engine == "agent".
    agent: Optional["Expect"] = None
    allow_devanagari: bool = False  # by default an English caller must get an English (Latin-script) reply


@dataclass
class Step:
    say: str
    expect: Expect = field(default_factory=Expect)


@dataclass
class Scenario:
    id: str
    category: str  # persona | out_of_scope | unclear | knowledge | booking | correction | safety | regression
    steps: List[Step]
    language: str = "en"
    note: str = ""
    agent_only: bool = False  # behaviours the legacy engine cannot express (skipped there, so its score stays honest)


@dataclass
class CallContext:
    """Tenant facts every engine receives, mirroring what production loads from Postgres."""

    agent_name: str = "Maya"
    business_name: str = "Sanjeevani Clinic"
    services: List[str] = field(default_factory=lambda: ["General Consultation", "Dental Cleaning", "Root Canal Treatment"])
    language: str = "en"


@dataclass
class TurnOutput:
    reply: str
    slots: Dict[str, object]
    transferred: bool = False
    tool_called: Optional[str] = None
    error: Optional[str] = None  # engine degraded this turn (e.g. LLM unavailable); always a failure, never hidden


@dataclass
class TurnResult:
    say: str
    reply: str
    failures: List[str]


@dataclass
class ScenarioResult:
    id: str
    category: str
    passed: bool
    turns: List[TurnResult]

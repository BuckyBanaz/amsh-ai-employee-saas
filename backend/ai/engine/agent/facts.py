"""Loads the per-call tenant facts (business, doctors, services, agent settings) from Postgres."""

import re
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

from sqlalchemy.orm import Session

from backend.ai.verticals.errors import MissingContextError
from backend.ai.engine.agent.availability import DEFAULT_SLOT_MINUTES
from backend.ai.engine.agent.validator import BusinessFacts
from backend.ai.speech.tts.voice_meta import voice_gender
from backend.ai.speech.tts.voice_profile import resolve_speed
from backend.ai.capabilities.operations.common.read_operations import CommonReadOperations
from backend.server.database.models.agent import Agent
from backend.server.database.models.business import Business
from backend.server.database.models.service import Service
from backend.server.database.models.staff import Staff

_CLINICAL_ROLE = re.compile(r"doctor|dr\b|dentist|physician|surgeon|specialist|consultant|therapist", re.IGNORECASE)


@dataclass
class AgentProfile:
    name: str = "Aura"
    tone: Optional[str] = None
    language: Optional[str] = None
    greeting: Optional[str] = None
    gender: Optional[str] = None  # "female" | "male" | None: Agent.config["gender"] if set, else the selected voice's gender
    voice_id: Optional[str] = None  # the saved Cartesia voice (tts_provider.voice_id, else Agent.voice_model)
    llm_model: Optional[str] = None  # the model picked in AI Studio ("groq:<id>" / "gemini:<id>"); goes first in the chain
    engine: Optional[str] = None  # per-tenant rollout override (Agent.config["engine"]): state_machine | shadow | llm_agent
    # Dashboard "Behavior" tab (Agent.config): owner's instructions, creativity slider, toggles, capability switches.
    instructions: Optional[str] = None
    temperature: Optional[float] = None  # 0.0-1.0 (the UI stores 0-100)
    small_talk: bool = True
    natural_fillers: bool = True  # "hmm..." and "one moment..." in spoken calls; off with toggles.natural_fillers = false
    require_confirmation: bool = True
    capabilities: Dict[str, bool] = field(default_factory=dict)
    # Dashboard "Voice" tab (Agent.config.voice_settings)
    speed: Optional[float] = None
    emotion: Optional[str] = None
    # "Languages" tab: Agent.languages (allowed) + config.auto_detect_language; primary is `language` above
    languages: List[str] = field(default_factory=list)
    auto_detect_language: bool = True
    # Voice tab accent (Agent.config["accent"], e.g. "hi-IN"): how the agent sounds. Never decides region or language.
    accent: str = ""
    # "Appointments" tab: config.limits.buffer_minutes / notice_hours; allow_cancel/allow_reschedule become capabilities
    buffer_minutes: int = 0
    notice_hours: float = 0.0
    # "Call Handling" tab: config.limits.max_duration_minutes / silence_timeout_seconds; toggles.record / transcribe
    max_duration_minutes: Optional[int] = None
    silence_timeout_seconds: Optional[int] = None
    record: bool = True
    transcribe: bool = True
    # "Escalation" tab: config.transfer_phone + which triggers are switched on (id -> active)
    transfer_phone: Optional[str] = None
    triggers: Dict[str, bool] = field(default_factory=lambda: dict(DEFAULT_TRIGGERS))


# Same ids and defaults as the dashboard's Escalation tab (EscalationTab.tsx DEFAULT_TRIGGERS).
DEFAULT_TRIGGERS: Dict[str, bool] = {
    "frustration": True,
    "emergency": True,
    "failed_answer": True,
    "complex_billing": False,
    "human_request": True,
}


# Behavior-tab capability id -> the agent tools it switches off. Capabilities with no tool are prompt-only.
_CAPABILITY_TOOLS: Dict[str, Set[str]] = {
    "faq": {"search_knowledge"},
    "book": {"book_appointment", "check_availability"},
    "reschedule": {"reschedule_appointment"},
    "cancel": {"cancel_appointment"},
    "transfer": {"transfer_to_human"},
}
_CAPABILITY_TEXT: Dict[str, str] = {
    "faq": "answering general questions about the clinic",
    "book": "booking appointments or checking availability",
    "reschedule": "rescheduling appointments",
    "cancel": "cancelling appointments",
    "details": "collecting patient details",
    "services": "explaining the clinic's services",
    "hours": "stating the clinic's opening hours",
    "transfer": "transferring calls to staff",
}


def disabled_capabilities(capabilities: Dict[str, bool]) -> Tuple[Set[str], List[str]]:
    """(tool names to switch off, human-readable list of what the owner turned off for the prompt)."""
    tools: Set[str] = set()
    off: List[str] = []
    for cap, enabled in (capabilities or {}).items():
        if enabled is False and cap in _CAPABILITY_TEXT:
            tools |= _CAPABILITY_TOOLS.get(cap, set())
            off.append(_CAPABILITY_TEXT[cap])
    return tools, off




def _positive_int(raw: Any) -> Optional[int]:
    """Dashboard numbers arrive as int or numeric string; anything else (or <= 0) means 'not set'."""
    try:
        value = int(float(raw))
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def load_facts(db: Session, business_id: str) -> BusinessFacts:
    business = db.get(Business, business_id)
    if not business:
        raise MissingContextError(f"Business {business_id!r} was not found: refusing to guess a vertical, region or timezone.")
    staff = db.query(Staff).filter(Staff.business_id == business_id).all()
    clinical = [s.name for s in staff if _CLINICAL_ROLE.search(s.role or "")] or [s.name for s in staff]
    services = db.query(Service).filter(Service.business_id == business_id).all()
    durations = [s.duration_minutes for s in services if s.duration_minutes]
    return BusinessFacts(
        name=business.name,
        timezone=(business.timezone or "").strip(),
        working_hours=business.working_hours or {},
        services=[s.title for s in services],
        doctors=clinical,
        address=business.address or "",
        phone=business.business_phone or "",
        city=business.city or "",
        country=business.country or "",
        vertical=(business.vertical or "").strip(),
        slot_minutes=min(max(min(durations), 15), 60) if durations else DEFAULT_SLOT_MINUTES,
    )


def load_vertical_name(business_id: str) -> str:
    """The business's configured vertical. Blocking; raises MissingContextError when the business or its vertical is missing."""
    from backend.server.database.session import SessionLocal

    with SessionLocal() as db:
        business = db.get(Business, business_id)
    vertical = (business.vertical or "").strip() if business else ""
    if not vertical:
        raise MissingContextError(f"Business {business_id!r} has no vertical configured: refusing to treat it as a clinic.")
    return vertical


def load_profile(db: Session, business_id: str) -> AgentProfile:
    # A business can have several agents (re-onboarding). Use the oldest: it is the one the dashboard shows and edits,
    # and the legacy loaders and dashboard endpoints use the same rule, so name, voice and settings always agree.
    agent = CommonReadOperations.get_agent(db, business_id)
    if not agent:
        return AgentProfile()
    cfg: Dict[str, Any] = agent.config or {}
    gender = str(cfg.get("gender") or "").lower()
    toggles = cfg.get("toggles") or {}
    limits = cfg.get("limits") or {}
    voice = cfg.get("voice_settings") or {}
    temp = cfg.get("temperature")
    capabilities = {k: bool(v) for k, v in (cfg.get("capabilities") or {}).items()}
    if toggles.get("allow_cancel") is False:  # Appointments tab switches; either tab turning it off wins
        capabilities["cancel"] = False
    if toggles.get("allow_reschedule") is False:
        capabilities["reschedule"] = False
    triggers = dict(DEFAULT_TRIGGERS)
    for t in cfg.get("escalation_triggers") or []:
        if isinstance(t, dict) and t.get("id") in triggers and "active" in t:
            triggers[t["id"]] = bool(t["active"])
    return AgentProfile(
        voice_id=((cfg.get("tts_provider") or {}).get("voice_id") or agent.voice_model or None),
        llm_model=(str(cfg.get("model") or "").strip() or None),
        languages=[str(x) for x in (agent.languages or [])],
        auto_detect_language=cfg.get("auto_detect_language") is not False,
        buffer_minutes=_positive_int(limits.get("buffer_minutes")) or 0,
        notice_hours=float(_positive_int(limits.get("notice_hours")) or 0),
        max_duration_minutes=_positive_int(limits.get("max_duration_minutes")),
        silence_timeout_seconds=_positive_int(limits.get("silence_timeout_seconds")),
        record=toggles.get("record") is not False,
        transcribe=toggles.get("transcribe") is not False,
        transfer_phone=(str(cfg.get("transfer_phone") or "").strip() or None),
        triggers=triggers,
        instructions=(str(cfg.get("system_prompt") or "").strip() or None),
        temperature=(min(max(temp / 100, 0.0), 1.0) if isinstance(temp, (int, float)) and not isinstance(temp, bool) else None),
        small_talk=toggles.get("small_talk") is not False,
        natural_fillers=toggles.get("natural_fillers") is not False,
        require_confirmation=toggles.get("confirm") is not False,
        capabilities=capabilities,
        speed=resolve_speed(voice.get("speed"), cfg.get("personality")),
        emotion=(str(voice.get("emotion") or "").strip() or None),
        name=agent.name or "Aura",
        tone=cfg.get("personality"),
        language=agent.primary_language,
        accent=str(cfg.get("accent") or ""),
        greeting=agent.greeting_message or None,
        gender=gender if gender in ("female", "male") else None,
        engine=str(cfg.get("engine") or "").lower() or None,
    )


def load_all(db_factory: Callable[[], Session], business_id: str, voice_id: Optional[str] = None) -> tuple[BusinessFacts, AgentProfile]:
    """Blocking; run via asyncio.to_thread. `voice_id` overrides the saved voice (the playground previews the voice the
    user picked in the modal, so the persona's gender should follow that voice)."""
    db = db_factory()
    try:
        facts, profile = load_facts(db, business_id), load_profile(db, business_id)
    finally:
        db.close()
    if voice_id:
        profile.voice_id = voice_id
    # The persona's gender follows the voice the caller hears (an explicit Agent.config["gender"] still wins).
    if not profile.gender:
        profile.gender = voice_gender(profile.voice_id)
    # Appointments tab: the gap between visits stretches each slot; notice is the earliest lead time we will book.
    facts.slot_minutes = min(facts.slot_minutes + profile.buffer_minutes, 240)
    facts.notice_hours = profile.notice_hours
    return facts, profile

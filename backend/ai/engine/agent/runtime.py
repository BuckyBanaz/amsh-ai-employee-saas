"""Glue between a live call (gateway) and the LLM agent: engine-mode resolution, per-call engine creation,
streamed sentence-by-sentence speaking with barge-in, and silent shadow comparison against the legacy engine."""

import asyncio
import json
import logging
from backend.ai.capabilities.rules.compliance_pii import CompliancePIIRule
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, Optional

from backend.ai.engine.agent.agent_loop import AgentEngine, AgentTurn
from backend.ai.engine.agent.facts import AgentProfile, load_all
from backend.ai.engine.agent.llm_backend import build_chat_backend
from backend.ai.engine.conversation.i18n import language_code

logger = logging.getLogger(__name__)

MODES = ("state_machine", "shadow", "llm_agent")
SpeakFn = Callable[..., Awaitable[Optional[bool]]]  # (text, emotion=None)  # returns False when the caller interrupted playback


def resolve_mode(tenant_override: Optional[str], global_default: Optional[str]) -> str:
    """Tenant override beats the global setting; anything unrecognised means the safe legacy engine."""
    for candidate in (tenant_override, global_default):
        if candidate and candidate.lower() in MODES:
            return candidate.lower()
    return "state_machine"


@dataclass
class TurnRun:
    turn: AgentTurn
    spoken_any: bool
    interrupted: bool


class AgentRuntime:
    def __init__(self, engine: AgentEngine, mode: str, profile: AgentProfile) -> None:
        self.engine = engine
        self.mode = mode
        self.profile = profile
        self._lock = asyncio.Lock()  # shadow turns must run in order

    @classmethod
    async def create(
        cls,
        business_id: str,
        call_id: str,
        caller_number: str,
        vertical_config: Any,
        greeting: Optional[str],
        language: Optional[str] = None,
        voice_id: Optional[str] = None,
        force_agent: bool = False,
        channel: str = "voice",
    ) -> Optional["AgentRuntime"]:
        """Returns None when this tenant runs the legacy engine (the common case: no extra cost or risk)."""
        from backend.server.common.config import get_settings
        from backend.server.database.session import SessionLocal

        facts, profile = await asyncio.to_thread(load_all, SessionLocal, business_id, voice_id)
        mode = resolve_mode(profile.engine, getattr(get_settings(), "CONVERSATION_ENGINE", None))
        if mode == "state_machine":
            if not force_agent:
                return None
            mode = "llm_agent"  # WhatsApp has no legacy engine
        engine = AgentEngine(
            business_id=business_id,
            caller_number=caller_number,
            call_id=call_id,
            facts=facts,
            vertical_config=vertical_config,
            # The model picked in AI Studio first; the configured Groq/Gemini chain stays behind it as the fallback.
            backend=build_chat_backend(temperature=profile.temperature, preferred=profile.llm_model),
            db_factory=SessionLocal,
            agent_name=profile.name,
            language=language_code(language or profile.language),
            tone=profile.tone,
            gender=profile.gender,
            dry_run=(mode == "shadow"),  # shadow must never write bookings or place transfers
            instructions=profile.instructions,
            small_talk=profile.small_talk,
            require_confirmation=profile.require_confirmation,
            capabilities=profile.capabilities,
            triggers=profile.triggers,
            transfer_phone=profile.transfer_phone,
            languages=profile.languages,
            auto_detect_language=profile.auto_detect_language,
            channel=channel,
            fillers=profile.natural_fillers and channel != "chat",  # a text chat has no voice to fill
            accent=profile.accent,
        )
        if greeting:
            engine.greeting(greeting)  # seeds history with exactly what the caller heard
        return cls(engine, mode, profile)

    async def run_turn(self, transcript: str, speak: SpeakFn) -> TurnRun:
        """Speaks each sentence as soon as the model finishes it. After a barge-in the remaining sentences are
        dropped, but the model turn is still drained so the engine's history stays consistent."""
        queue: asyncio.Queue = asyncio.Queue()

        async def produce() -> None:
            try:
                async for event in self.engine.turn_events(transcript, stream=True):
                    await queue.put(event)
            except Exception as e:  # never let a producer crash leave the consumer waiting forever
                await queue.put({"type": "error", "error": e})

        producer = asyncio.create_task(produce())
        spoken_any = interrupted = False
        try:
            while True:
                event = await queue.get()
                if event["type"] == "sentence" and not interrupted:
                    spoken_any = True
                    extra = {"emotion": event["emotion"]} if event.get("emotion") else {}
                    if await speak(event.get("tts_text") or event["text"], **extra) is False:
                        interrupted = True
                elif event["type"] == "done":
                    return TurnRun(event["turn"], spoken_any, interrupted)
                elif event["type"] == "error":
                    raise event["error"]
        finally:
            if not producer.done():
                producer.cancel()

    async def shadow(self, call_id: str, transcript: str, legacy_reply: str) -> None:
        """Runs the agent silently on the same transcript and logs it beside the legacy reply."""
        async with self._lock:
            try:
                turn = await self.engine.turn(transcript)
                logger.info(
                    "[SHADOW] %s",
                    json.dumps(
                        {
                            "call_id": call_id,
                            "caller": CompliancePIIRule.redact(transcript),  # logs never carry phone numbers / emails / cards
                            "legacy": CompliancePIIRule.redact(legacy_reply),
                            "agent": CompliancePIIRule.redact(turn.reply),
                            "agent_tools": [t.get("tool") for t in turn.tools],
                            "agent_latency_ms": turn.latency_ms,
                            "agent_degraded": turn.degraded,
                        },
                        ensure_ascii=False,
                    ),
                )
            except Exception as e:
                logger.warning("[SHADOW] agent failed for %s: %s", call_id, e)


# Dashboard playground (/api/voice/simulate) has no long-lived WebSocket, so keep one runtime per simulated call.
_SIM_RUNTIMES: Dict[str, AgentRuntime] = {}
_SIM_MAX = 200


def get_sim_runtime(call_id: str) -> Optional[AgentRuntime]:
    return _SIM_RUNTIMES.get(call_id)


def store_sim_runtime(call_id: str, runtime: AgentRuntime) -> None:
    if len(_SIM_RUNTIMES) >= _SIM_MAX:  # bounded: drop the oldest simulated call
        _SIM_RUNTIMES.pop(next(iter(_SIM_RUNTIMES)))
    _SIM_RUNTIMES[call_id] = runtime

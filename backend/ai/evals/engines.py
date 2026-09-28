"""Engine adapters. Each adapter exposes the same two calls so the runner can score any engine."""

from typing import Dict, Protocol

from backend.ai.engine.conversation.nlu import ConversationalNLU
from backend.ai.engine.conversation.state_machine import ConversationStateMachine
from backend.ai.engine.conversation.states import CallState
from backend.ai.evals.schema import CallContext, TurnOutput
from backend.ai.llm.client import llm_client
from backend.ai.verticals.registry import registry as vertical_registry


class Engine(Protocol):
    name: str

    async def start(self, ctx: CallContext) -> str: ...

    async def turn(self, utterance: str) -> TurnOutput: ...


class LegacyEngine:
    """Current production path: ConversationalNLU -> ConversationStateMachine (same wiring as gateway.py).
    Offline by default (no Groq key) so results are deterministic; pass live=True to use the real LLM."""

    name = "legacy"

    def __init__(self, live: bool = False) -> None:
        self.live = live
        self._saved_key = llm_client.api_key
        self.sm: ConversationStateMachine | None = None
        self.ctx: CallContext | None = None

    async def start(self, ctx: CallContext) -> str:
        if not self.live:
            llm_client.api_key = ""
        self.ctx = ctx
        vertical_cfg = vertical_registry.get_vertical("clinic")
        self.sm = ConversationStateMachine(
            call_id="eval",
            business_id="eval_biz",
            caller_number="+919876543210",
            vertical_config=vertical_cfg,
            business_info={"name": ctx.business_name, "agent_name": ctx.agent_name},
            services=ctx.services,
            language=ctx.language,
        )
        return self.sm.start_call()

    async def turn(self, utterance: str) -> TurnOutput:
        sm, ctx = self.sm, self.ctx
        assert sm is not None and ctx is not None, "start() must be called first"
        intents = [{"name": i.name, "description": i.description} for i in sm.vertical_config.intents]
        nlu = await ConversationalNLU.analyze_turn(
            user_utterance=utterance,
            available_intents=intents,
            available_services=sm.services,
            agent_name=sm.agent_name,
            business_name=sm.business_info.get("name", "our clinic"),
            current_intent=sm.current_intent.name if sm.current_intent else None,
            collected_slots=sm.collected_slots,
            missing_slot=getattr(sm, "last_asked_slot", None),
            recent_turns=[{"role": "user", "content": t.user_transcript} for t in sm.turns[-3:]],
        )
        result: Dict = await sm.process_user_turn(
            user_transcript=utterance,
            extracted_intent=nlu.intent,
            extracted_slots=nlu.slots,
            nlu_category=nlu.category.value,
            confidence=nlu.confidence,
            is_correction=nlu.is_correction,
            overridden_slot=nlu.overridden_slot,
            is_ambiguous=nlu.is_ambiguous,
        )
        last = sm.turns[-1] if sm.turns else None
        return TurnOutput(
            reply=result.get("bot_response") or "",
            slots=dict(sm.collected_slots),
            transferred=bool(result.get("transfer_target")) or sm.current_state == CallState.ESCALATED,
            tool_called=getattr(last, "tool_called", None),
        )

    def close(self) -> None:
        llm_client.api_key = self._saved_key


class QuotaExhausted(Exception):
    """The provider's daily token cap is used up: further results would be meaningless, so the suite stops."""


class AgentEvalEngine:
    """The LLM agent against a seeded in-memory SQLite tenant (real models, fixed clock). Needs a Groq key."""

    name = "agent"

    _SLOT_ARGS = {
        "patient_name": "patient_name", "phone_number": "phone_number", "preferred_date": "preferred_date",
        "preferred_time": "preferred_time", "service_name": "service_name", "doctor_name": "doctor_name",
        "date": "preferred_date", "time": "preferred_time", "new_date": "preferred_date", "new_time": "preferred_time",
    }

    def __init__(self, live: bool = True) -> None:
        if not llm_client.api_key:
            raise SystemExit("The agent engine needs GROQ_API_KEY (no offline mode). Use --engine legacy for offline runs.")
        self.engine = None
        self.slots: Dict[str, object] = {}
        self.latencies: list = []
        self.first_ms: list = []
        # Evals must ride out provider rate limits (TPM) instead of scoring a 429 as a bad answer.
        from backend.ai.engine.agent.llm_backend import GroqChatBackend

        self.backend = GroqChatBackend(max_attempts=8, max_retry_wait=45.0)

    def summary(self) -> str:
        u = self.backend.usage
        calls = max(u["calls"], 1)
        lat = sorted(self.latencies) or [0]
        first = sorted(self.first_ms) or [0]
        return (
            f"LLM calls={u['calls']} rate_limited_retries={u['rate_limited']} "
            f"avg_prompt_tokens={u['prompt_tokens'] // calls} avg_completion_tokens={u['completion_tokens'] // calls} | "
            f"turn latency p50={lat[len(lat) // 2]}ms p90={lat[int(len(lat) * 0.9)]}ms (includes rate-limit waits) | "
            f"first-sentence p50={first[len(first) // 2]}ms"
        )

    async def start(self, ctx: CallContext) -> str:
        from backend.ai.engine.agent.agent_loop import AgentEngine
        from backend.ai.engine.agent.facts import load_all
        from backend.ai.evals.fixtures import FIXED_NOW, make_db_factory

        factory, biz = make_db_factory()
        facts, profile = load_all(factory, biz)
        self.slots = {}
        self.engine = AgentEngine(
            business_id=biz,
            caller_number="+919876543210",
            call_id=None,
            facts=facts,
            vertical_config=vertical_registry.get_vertical("clinic"),
            backend=self.backend,
            db_factory=factory,
            agent_name=profile.name,
            language=ctx.language,
            tone=profile.tone,
            gender=profile.gender,
            now_fn=lambda: FIXED_NOW,
            dry_run=True,  # scoring must never send SMS or place transfers; validation still runs in full
        )
        return self.engine.greeting()

    async def turn(self, utterance: str) -> TurnOutput:
        assert self.engine is not None, "start() must be called first"
        seen = len(self.engine.toolbox.calls)
        out = await self.engine.turn(utterance)
        if out.degraded and "per day" in (out.error or ""):
            raise QuotaExhausted(out.error)
        for call in self.engine.toolbox.calls[seen:]:
            for arg, slot in self._SLOT_ARGS.items():
                if (call.get("args") or {}).get(arg):
                    self.slots[slot] = call["args"][arg]
        tools = [c["tool"] for c in out.tools if c.get("tool")]
        self.latencies.append(out.latency_ms)
        if out.first_sentence_ms is not None:
            self.first_ms.append(out.first_sentence_ms)
        return TurnOutput(
            reply=out.reply,
            slots=dict(self.slots),
            transferred=out.transferred,
            tool_called=tools[-1] if tools else None,
            error=out.error if out.degraded else None,
        )

    def close(self) -> None:
        pass


def build_engine(name: str, live: bool = False) -> Engine:
    if name == "legacy":
        return LegacyEngine(live=live)
    if name == "agent":
        return AgentEvalEngine(live=True)
    raise SystemExit(f"Unknown engine '{name}'. Available: legacy, agent.")

"""The landing page's "Talk to your new front-desk employee" console: the real agent engine and the real LLM, on a made-up clinic.

The demo clinic lives in its own in-memory SQLite database (never the platform's database), and every conversation runs in test
mode (a SandboxLedger), so nothing a visitor says can book, move or cancel anything, send a message or place a call. Visitors are
anonymous, so cost is capped three ways: per IP (`demo_limits`), per conversation (turns) and per process per day.
"""

import asyncio
import logging
import time
import uuid
from collections import OrderedDict
from dataclasses import dataclass
from datetime import date
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

logger = logging.getLogger(__name__)

DEMO_BUSINESS_ID = "amsh-landing-demo"
MAX_CONVERSATIONS = 300  # in memory, least recently used dropped first
CONVERSATION_IDLE_S = 30 * 60
MAX_TURNS = 16  # per conversation
DAILY_TURNS = 3000  # per API process: a hard ceiling on what the public demo can spend in a day
MAX_MESSAGE_CHARS = 300


class DemoUnavailable(Exception):
    """The model could not answer (down, rate limited or out of the day's budget): the page shows its own preview instead."""


@dataclass
class DemoReply:
    reply: str
    actions: List[Dict[str, Any]]
    latency_ms: int
    provider: Optional[str]
    turns_left: int


_factory: Optional[Callable[[], Session]] = None


def demo_db() -> Callable[[], Session]:
    """The demo clinic's own throwaway database, built once per process."""
    global _factory
    if _factory is not None:
        return _factory
    import backend.server.database.models  # noqa: F401  (every table on Base.metadata)
    from backend.server.database.models.agent import Agent
    from backend.server.database.models.business import Business
    from backend.server.database.models.service import Service
    from backend.server.database.models.staff import Staff
    from backend.server.database.session import Base

    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    hours = {d: [{"start": "09:00", "end": "20:00"}] for d in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")}
    hours["Sunday"] = []
    with factory() as db:
        db.add(Business(id=DEMO_BUSINESS_ID, name="Sunrise Family & Dental Clinic", vertical="clinic", country="United States",
                        city="New York", address="120 Park Avenue", business_phone="+1 212 555 0142", timezone="America/New_York",
                        currency="USD", working_hours=hours, status="active"))
        db.add_all([
            Staff(business_id=DEMO_BUSINESS_ID, name="Dr. Emily Carter", role="Doctor", specialty="General Physician"),
            Staff(business_id=DEMO_BUSINESS_ID, name="Dr. Raj Mehta", role="Doctor", specialty="Dentist"),
            Staff(business_id=DEMO_BUSINESS_ID, name="Dr. Sofia Alvarez", role="Doctor", specialty="Dermatologist"),
            Service(business_id=DEMO_BUSINESS_ID, title="General Consultation", duration_minutes=30, price_amount=50),
            Service(business_id=DEMO_BUSINESS_ID, title="Dental Cleaning", duration_minutes=30, price_amount=90),
            Service(business_id=DEMO_BUSINESS_ID, title="Root Canal Treatment", duration_minutes=60, price_amount=600),
            Service(business_id=DEMO_BUSINESS_ID, title="Teeth Whitening", duration_minutes=45, price_amount=250),
            Service(business_id=DEMO_BUSINESS_ID, title="Skin Consultation", duration_minutes=30, price_amount=70),
            Agent(business_id=DEMO_BUSINESS_ID, name="Ava", primary_language="en",
                  config={"gender": "female", "auto_detect_language": True, "languages": ["en", "es", "hi", "fr", "de", "nl", "ar"]}),
        ])
        db.commit()
    _factory = factory
    return factory


class DemoChat:
    """One agent engine per visitor conversation, test mode, on the demo clinic."""

    def __init__(self, backend_factory: Optional[Callable[[], Any]] = None) -> None:
        self._engines: "OrderedDict[str, Any]" = OrderedDict()
        self._touched: Dict[str, float] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._day = date.today()
        self._turns_today = 0
        self._backend_factory = backend_factory  # tests pass a scripted model; production builds the configured chain

    def _backend(self) -> Any:
        if self._backend_factory is not None:
            return self._backend_factory()
        from backend.ai.engine.agent.llm_backend import build_chat_backend

        return build_chat_backend()

    async def _engine(self, conversation: str) -> Any:
        if conversation in self._engines:
            self._engines.move_to_end(conversation)
            return self._engines[conversation]
        from backend.ai.engine.agent.agent_loop import AgentEngine
        from backend.ai.engine.agent.facts import load_all
        from backend.ai.engine.agent.sandbox import SandboxLedger
        from backend.ai.verticals.registry import registry as vertical_registry

        factory = demo_db()
        facts, profile = await asyncio.to_thread(load_all, factory, DEMO_BUSINESS_ID)
        backend = self._backend()
        engine = AgentEngine(
            business_id=DEMO_BUSINESS_ID, caller_number="", call_id=f"demo_{conversation}", facts=facts,
            vertical_config=vertical_registry.get_vertical("clinic"), backend=backend, db_factory=factory,
            agent_name=profile.name, language="en", gender=profile.gender, channel="chat", auto_detect_language=True,
            languages=profile.languages, sandbox=SandboxLedger(),
        )
        engine._meter_backend(backend, None, f"demo_{conversation}")  # spend shows as testing, tied to no clinic
        self._engines[conversation] = engine
        while len(self._engines) > MAX_CONVERSATIONS:
            old, _ = self._engines.popitem(last=False)
            self._touched.pop(old, None)
            self._locks.pop(old, None)
        return engine

    def _expire(self) -> None:
        now = time.monotonic()
        for conv in [c for c, t in self._touched.items() if now - t > CONVERSATION_IDLE_S]:
            self._engines.pop(conv, None)
            self._touched.pop(conv, None)
            self._locks.pop(conv, None)
        if date.today() != self._day:
            self._day, self._turns_today = date.today(), 0

    async def turn(self, conversation: Optional[str], message: str) -> DemoReply:
        self._expire()
        conversation = conversation if conversation and len(conversation) <= 64 else uuid.uuid4().hex
        if self._turns_today >= DAILY_TURNS:
            raise DemoUnavailable("daily demo budget used")
        lock = self._locks.setdefault(conversation, asyncio.Lock())
        async with lock:
            engine = await self._engine(conversation)
            self._touched[conversation] = time.monotonic()
            used = len(getattr(engine, "_turns", []))
            if used >= MAX_TURNS:
                raise DemoUnavailable("conversation is at its turn limit")
            self._turns_today += 1
            started = time.perf_counter()
            result = await engine.turn(message[:MAX_MESSAGE_CHARS])
            if result.degraded:  # the engine's fixed apology: the page shows its own preview instead
                raise DemoUnavailable(result.error or "model unavailable")
            ledger = engine.sandbox
            return DemoReply(
                reply=result.reply,
                actions=ledger.snapshot() if ledger is not None else [],
                latency_ms=int((time.perf_counter() - started) * 1000),
                provider=getattr(result, "provider", None),
                turns_left=max(0, MAX_TURNS - len(getattr(engine, "_turns", []))),
            )


demo_chat = DemoChat()

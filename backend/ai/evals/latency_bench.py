"""Voice-turn latency benchmark: time from the caller's last word to the first audio, per stage.

Two modes:

  Simulated (default, no network, no keys). Runs the real AgentEngine, splitter, guards and toolbox (sqlite fixture) on
  representative utterances, with a fake streaming LLM and a fake TTS whose timings come from the flags. It isolates
  what the *code* changes: when the first speakable chunk is released (early chunking on vs off) and how many LLM
  rounds a turn takes. Its absolute numbers are only as real as the flags: they are NOT production measurements.

      python -m backend.ai.evals.latency_bench
      python -m backend.ai.evals.latency_bench --ttft 300 --reasoning 150 --tps 400 --tts-ttfb 200

  Live (--live, needs GROQ_API_KEY and optionally CARTESIA_API_KEY). Real Groq streaming + real Cartesia first audio,
  reported with the same [LATENCY] stages the phone gateway logs. Compare models and connection reuse:

      python -m backend.ai.evals.latency_bench --live
      python -m backend.ai.evals.latency_bench --live --model groq:llama-3.3-70b-versatile
      python -m backend.ai.evals.latency_bench --live --keepalive 5 --idle 8     # the old behaviour: pool expired
      python -m backend.ai.evals.latency_bench --live --keepalive 120 --idle 8   # the new default

  Telephony is not involved, so "first audio" here is the first TTS byte; on a real call add the hop to Twilio.
"""

import argparse
import asyncio
import json
import statistics
import time
from typing import Any, Dict, List, Optional

from backend.ai.engine.agent.agent_loop import AgentEngine
from backend.ai.engine.agent.facts import load_all
from backend.ai.evals.fixtures import FIXED_NOW, make_db_factory
from backend.ai.realtime import latency
from backend.ai.verticals.registry import registry as vertical_registry

UTTERANCES = [
    "I want to book an appointment.",
    "Are you open on Sunday?",
    "What time do you close?",
    "I need to see a dentist tomorrow.",
    "Can I reschedule my appointment?",
]

# Simulated mode only: plausible receptionist replies, scripted so runs are repeatable. A tuple is (tool, args) for a
# first round that calls a tool; the reply is then the second round.
SIM_SCRIPT: Dict[str, List[Any]] = {
    UTTERANCES[0]: ["Of course, I'd be happy to help you book that, which service would you like and which day suits you?"],
    UTTERANCES[1]: ["Sorry, we're closed on Sundays, but we're open Monday to Saturday if that works for you."],
    UTTERANCES[2]: ["We close at 5 PM today, is there anything else I can help you with?"],
    UTTERANCES[3]: [("check_availability", {"date": "tomorrow"}),
                    "Sure, I can get you in tomorrow, we have openings in the morning and the afternoon, what time suits you best?"],
    UTTERANCES[4]: ["Absolutely, I can help you move that appointment, could you tell me the phone number it was booked under?"],
}


class SimBackend:
    """Fake streaming LLM: waits `ttft_ms` (+ `reasoning_ms`, hidden tokens), then streams words at `tps` tokens/s."""

    def __init__(self, script: List[Any], ttft_ms: float, reasoning_ms: float, tps: float) -> None:
        self.script = list(script)
        self.ttft, self.reasoning, self.tps = ttft_ms / 1000, reasoning_ms / 1000, tps

    async def chat(self, messages, tools):  # pragma: no cover - the voice path streams
        raise NotImplementedError

    async def chat_stream(self, messages, tools):
        latency.mark("llm_request_start", provider="sim")
        item = self.script.pop(0) if self.script else "Okay."
        await asyncio.sleep(self.ttft)
        latency.mark("llm_first_token", provider="sim")
        await asyncio.sleep(self.reasoning)
        if isinstance(item, tuple):
            name, args = item
            yield {"type": "final", "content": None, "tool_calls": [{"id": "c1", "name": name, "arguments": json.dumps(args)}]}
            return
        words = item.split(" ")
        for i, w in enumerate(words):
            if i == 0:
                latency.mark("llm_first_content", provider="sim")
            yield {"type": "text", "delta": w + (" " if i < len(words) - 1 else "")}
            await asyncio.sleep(1.0 / self.tps)
        yield {"type": "final", "content": item, "tool_calls": []}


def _engine(backend: Any, early: bool) -> AgentEngine:
    factory, biz = make_db_factory()
    facts, profile = load_all(factory, biz)
    return AgentEngine(
        business_id=biz, caller_number="+919876543210", call_id=None, facts=facts,
        vertical_config=vertical_registry.get_vertical("clinic"), backend=backend, db_factory=factory,
        agent_name=profile.name, gender=profile.gender, now_fn=lambda: FIXED_NOW, early_chunking=early,
    )


async def _turn(engine: AgentEngine, utterance: str, tts_ttfb_ms: Optional[float], live_tts: bool) -> Dict[str, Any]:
    tracker = latency.TurnLatency(None, 1)  # origin = "the final transcript just arrived"
    tracker.mark("deepgram_final")
    token = latency.start_turn(tracker)
    first_text = None
    try:
        async for ev in engine.turn_events(utterance, stream=True):
            if ev["type"] == "sentence" and first_text is None:
                first_text = ev["text"]
                tracker.mark("llm_first_chunk", filler=bool(ev.get("filler")))
                if live_tts:
                    from backend.ai.speech.tts.cartesia import cartesia_tts
                    async for _ in cartesia_tts.stream_speech(first_text):  # marks tts_request_start / tts_first_audio
                        break
                elif tts_ttfb_ms is not None:
                    tracker.mark("tts_request_start")
                    await asyncio.sleep(tts_ttfb_ms / 1000)
                    tracker.mark("tts_first_audio")
                if "tts_first_audio" in tracker.marks:
                    tracker.mark("first_audio_sent_to_telephony")
    finally:
        latency.end_turn(token)
    tracker.mark("turn_end")
    tracker.closed = True
    s = tracker.summary()
    s["first_text"] = first_text
    return s


def _row(label: str, s: Dict[str, Any]) -> str:
    m = s["marks_ms"]
    cell = lambda k: f"{m[k]:>7.0f}" if k in m else "      -"  # noqa: E731
    return (f"{label:<38}{cell('llm_first_token')}{cell('llm_first_content')}{cell('llm_first_chunk')}"
            f"{cell('first_audio_sent_to_telephony')}  {s.get('llm_rounds', 0)}  {(s.get('first_text') or '')[:60]!r}")


HEADER = f"{'utterance / mode':<38}{'1st tok':>7}{'1st txt':>7}{'chunk':>7}{'audio':>7} rnd  first speech"


async def simulated(args: argparse.Namespace) -> None:
    print(f"SIMULATED (not production numbers): ttft={args.ttft}ms reasoning={args.reasoning}ms tps={args.tps} "
          f"tts_ttfb={args.tts_ttfb}ms\nAll columns: ms after the final transcript.\n")
    print(HEADER)
    totals: Dict[bool, List[float]] = {False: [], True: []}
    for utterance in UTTERANCES:
        for early in (False, True):
            backend = SimBackend(SIM_SCRIPT[utterance], args.ttft, args.reasoning, args.tps)
            s = await _turn(_engine(backend, early), utterance, args.tts_ttfb, live_tts=False)
            totals[early].append(s["marks_ms"].get("first_audio_sent_to_telephony", float("nan")))
            print(_row(f"{utterance[:26]} [{'early' if early else 'sentence'}]", s))
    print(f"\nmedian time to first audio: sentence-only {statistics.median(totals[False]):.0f} ms | "
          f"early chunking {statistics.median(totals[True]):.0f} ms")


async def live(args: argparse.Namespace) -> None:
    from backend.ai.engine.agent.llm_backend import build_chat_backend
    from backend.ai.llm.client import llm_client, pooled_http_client
    from backend.ai.speech.tts.cartesia import cartesia_tts
    from backend.server.common.config import get_settings

    settings = get_settings()
    if not llm_client.api_key:
        raise SystemExit("--live needs GROQ_API_KEY")
    if args.keepalive is not None:  # rebuild the pooled clients with the requested idle keep-alive
        settings.PROVIDER_KEEPALIVE_SECONDS = args.keepalive
        llm_client._client = pooled_http_client(timeout=4.0)
        cartesia_tts._client = pooled_http_client(timeout=10.0)
    live_tts = cartesia_tts.is_configured()
    print(f"LIVE: model={args.model or llm_client.model} keepalive={settings.PROVIDER_KEEPALIVE_SECONDS}s idle={args.idle}s "
          f"tts={'cartesia' if live_tts else 'none'}\n")
    print(HEADER)
    for early in (False, True):
        for utterance in UTTERANCES:
            if args.idle:
                await asyncio.sleep(args.idle)  # a caller speaking between turns: lets short keep-alives expire
            engine = _engine(build_chat_backend(preferred=args.model), early)
            s = await _turn(engine, utterance, None, live_tts)
            print(_row(f"{utterance[:26]} [{'early' if early else 'sentence'}]", s))
            print(f"{'':<38}stages: {json.dumps({k: v for k, v in s['stages_ms'].items() if v is not None})}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--live", action="store_true")
    p.add_argument("--model", help="live: groq:<model> or gemini:<model> to put first in the chain")
    p.add_argument("--keepalive", type=float, help="live: provider connection idle keep-alive, seconds")
    p.add_argument("--idle", type=float, default=0.0, help="live: seconds to wait before each turn")
    p.add_argument("--ttft", type=float, default=300.0, help="sim: LLM time to first token, ms")
    p.add_argument("--reasoning", type=float, default=0.0, help="sim: hidden reasoning time before content, ms")
    p.add_argument("--tps", type=float, default=250.0, help="sim: streamed words per second")
    p.add_argument("--tts-ttfb", type=float, default=200.0, help="sim: TTS time to first audio byte, ms")
    args = p.parse_args()
    asyncio.run(live(args) if args.live else simulated(args))


if __name__ == "__main__":
    main()

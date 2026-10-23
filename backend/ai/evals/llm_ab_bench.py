"""LLM provider A/B on the real receptionist engine: time to first spoken chunk and tool use, one provider at a time.

Each provider is benchmarked alone (no fallback chain), so a slow or failing model shows up as such instead of being
hidden by the next provider answering. Uses latency_bench's engine (real prompt, tools, splitter, sqlite fixture); no
TTS, so it spends LLM tokens only. Needs the provider API keys.

    python -m backend.ai.evals.llm_ab_bench --repeats 4 gemini groq groq:openai/gpt-oss-120b
"""

import argparse
import asyncio
import statistics
from typing import Any, Dict, List

from backend.ai.engine.agent.llm_backend import GeminiChatBackend, GroqChatBackend, parse_provider_spec
from backend.ai.evals.latency_bench import UTTERANCES, _engine, _turn

# Utterances that should (and should not) make the model call a tool before answering.
NEEDS_TOOL = {"I need to see a dentist tomorrow."}


def _backend(spec: str) -> Any:
    entry = parse_provider_spec(spec)[0]
    cls = {"groq": GroqChatBackend, "gemini": GeminiChatBackend}[entry["kind"]]
    return cls(model=entry["model"]) if entry["model"] else cls()


def _pct(values: List[float], p: float) -> float:
    s = sorted(values)
    return s[min(len(s) - 1, int(p * len(s)))]


async def bench(spec: str, repeats: int) -> Dict[str, Any]:
    chunk, first_token, failures, tool_misses, rounds = [], [], 0, 0, []
    for _ in range(repeats):
        for utterance in UTTERANCES:
            try:
                s = await _turn(_engine(_backend(spec), early=True), utterance, None, live_tts=False)
            except Exception as e:  # counted, not fatal: a provider that errors is a result
                failures += 1
                print(f"  {spec}: {utterance[:30]!r} failed: {e}")
                continue
            m = s["marks_ms"]
            if "llm_first_chunk" not in m:
                failures += 1
                continue
            chunk.append(m["llm_first_chunk"])
            if "llm_first_token" in m:
                first_token.append(m["llm_first_token"])
            rounds.append(s.get("llm_rounds", 0))
            if utterance in NEEDS_TOOL and not s.get("tools"):
                tool_misses += 1
    n = len(chunk)
    return {
        "provider": spec, "turns": n, "failures": failures,
        "ttft_median": statistics.median(first_token) if first_token else None,
        "ttft_p95": _pct(first_token, 0.95) if first_token else None,
        "first_chunk_median": statistics.median(chunk) if chunk else None,
        "first_chunk_p95": _pct(chunk, 0.95) if chunk else None,
        "avg_rounds": round(sum(rounds) / len(rounds), 2) if rounds else None,
        "tool_misses": f"{tool_misses}/{repeats}",
    }


async def main_async(specs: List[str], repeats: int) -> None:
    rows = [await bench(spec, repeats) for spec in specs]
    print(f"\n{'provider':<32}{'turns':>6}{'fail':>5}{'ttft p50':>10}{'ttft p95':>10}{'chunk p50':>11}{'chunk p95':>11}{'rounds':>8}  tool misses")
    fmt = lambda v: f"{v:.0f}" if isinstance(v, (int, float)) else "-"  # noqa: E731
    for r in rows:
        print(f"{r['provider']:<32}{r['turns']:>6}{r['failures']:>5}{fmt(r['ttft_median']):>10}{fmt(r['ttft_p95']):>10}"
              f"{fmt(r['first_chunk_median']):>11}{fmt(r['first_chunk_p95']):>11}{fmt(r['avg_rounds']):>8}  {r['tool_misses']}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("providers", nargs="+", help="gemini, groq, groq:<model>, gemini:<model>")
    p.add_argument("--repeats", type=int, default=4, help="runs of the 5 benchmark utterances per provider")
    args = p.parse_args()
    asyncio.run(main_async(args.providers, args.repeats))


if __name__ == "__main__":
    main()

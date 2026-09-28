"""Run the eval suite against an engine and print a per-category score.

    python -m backend.ai.evals.runner                      # legacy engine, offline
    python -m backend.ai.evals.runner --live               # use the real Groq LLM
    python -m backend.ai.evals.runner --only persona,safety --verbose
    python -m backend.ai.evals.runner --json results.json  # machine-readable output
"""

import argparse
import asyncio
import json
import re
import sys
from collections import defaultdict
from dataclasses import asdict
from typing import List

from backend.ai.engine.agent.datetime_utils import parse_date
from backend.ai.engine.conversation.i18n import t
from backend.ai.evals.engines import QuotaExhausted, build_engine
from backend.ai.evals.fixtures import FIXED_NOW
from backend.ai.evals.scenarios import SCENARIOS
from backend.ai.evals.schema import CallContext, Expect, Scenario, ScenarioResult, TurnOutput, TurnResult


_LAST_ENGINE = None


def _resolve(items: List[str], lang: str) -> List[str]:
    return [t(lang, s[1:]) if s.startswith("@") else s for s in items]


def _slot_matches(slot: str, expected: str, actual: object) -> bool:
    """Substring match, except dates: "tomorrow" and "2026-09-29" are the same date."""
    if expected.lower() in str(actual or "").lower():
        return True
    if slot == "preferred_date" and actual:
        want, got = parse_date(expected, FIXED_NOW.date()), parse_date(str(actual), FIXED_NOW.date())
        return want is not None and want == got
    return False


def check_turn(exp: Expect, out: TurnOutput, lang: str, engine_name: str = "legacy") -> List[str]:
    """Returns human-readable failure reasons (empty list = pass)."""
    if engine_name == "agent" and exp.agent is not None:
        exp = exp.agent
    failures: List[str] = []
    reply = out.reply.lower()

    if out.error:
        failures.append(f"engine degraded: {out.error}")
    if not out.reply.strip():
        failures.append("empty reply")
    if lang == "en" and not exp.allow_devanagari and re.search(r"[ऀ-ॿ]", out.reply):
        failures.append("English caller got a Devanagari reply")
    if exp.any_of and not any(s.lower() in reply for s in _resolve(exp.any_of, lang)):
        failures.append(f"reply lacks any of {exp.any_of}")
    for s in _resolve(exp.none_of, lang):
        if s.lower() in reply:
            failures.append(f"reply contains forbidden text: {s[:60]!r}")
    if not exp.allow_generic_fallback and t(lang, "no_intent_guidance").lower() in reply:
        failures.append("generic 'no_intent_guidance' fallback used")
    for slot, needle in exp.slots.items():
        if not _slot_matches(slot, needle, out.slots.get(slot)):
            failures.append(f"slot {slot}={out.slots.get(slot)!r}, expected to contain {needle!r}")
    for slot in exp.slots_absent:
        if out.slots.get(slot):
            failures.append(f"slot {slot} should be unset but is {out.slots.get(slot)!r}")
    if exp.transferred is not None and out.transferred != exp.transferred:
        failures.append(f"transferred={out.transferred}, expected {exp.transferred}")
    if exp.tool_called and out.tool_called != exp.tool_called:
        failures.append(f"tool_called={out.tool_called!r}, expected {exp.tool_called!r}")
    if exp.tool_not_called and out.tool_called == exp.tool_not_called:
        failures.append(f"tool {exp.tool_not_called!r} must not be called")
    return failures


async def run_scenario(engine, scenario: Scenario) -> ScenarioResult:
    await engine.start(CallContext(language=scenario.language))
    turns: List[TurnResult] = []
    for step in scenario.steps:
        try:
            out = await engine.turn(step.say)
            failures = check_turn(step.expect, out, scenario.language, engine.name)
            reply = out.reply
        except QuotaExhausted:
            raise
        except Exception as e:  # an engine crash is a failed scenario, not a crashed suite
            failures, reply = [f"engine raised {type(e).__name__}: {e}"], ""
        turns.append(TurnResult(say=step.say, reply=reply, failures=failures))
    return ScenarioResult(
        id=scenario.id,
        category=scenario.category,
        passed=all(not tr.failures for tr in turns),
        turns=turns,
    )


async def run_all(engine_name: str, live: bool, only: List[str]) -> List[ScenarioResult]:
    global _LAST_ENGINE
    engine = _LAST_ENGINE = build_engine(engine_name, live=live)
    scenarios = [
        s
        for s in SCENARIOS
        if (not only or s.category in only or s.id in only) and (engine_name == "agent" or not s.agent_only)
    ]
    results: List[ScenarioResult] = []
    try:
        for s in scenarios:
            results.append(await run_scenario(engine, s))
        return results
    except QuotaExhausted as e:
        print(f"\n!! INCOMPLETE: provider daily token quota exhausted after {len(results)}/{len(scenarios)} scenarios: {str(e)[:120]}")
        return results
    finally:
        close = getattr(engine, "close", None)
        if close:
            close()


def print_report(results: List[ScenarioResult], verbose: bool) -> None:
    by_cat = defaultdict(lambda: [0, 0])
    for r in results:
        by_cat[r.category][1] += 1
        by_cat[r.category][0] += r.passed

    for r in results:
        if r.passed and not verbose:
            continue
        print(f"\n{'PASS' if r.passed else 'FAIL'}  {r.id}  [{r.category}]")
        for tr in r.turns:
            print(f"   caller: {tr.say}")
            print(f"   bot:    {tr.reply}")
            for f in tr.failures:
                print(f"   x {f}")

    print("\n" + "=" * 52)
    print(f"{'category':<14}{'passed':>8}{'total':>8}{'score':>10}")
    for cat, (ok, total) in sorted(by_cat.items()):
        print(f"{cat:<14}{ok:>8}{total:>8}{ok / total:>10.0%}")
    ok_all = sum(r.passed for r in results)
    print("-" * 52)
    print(f"{'OVERALL':<14}{ok_all:>8}{len(results):>8}{ok_all / max(len(results), 1):>10.0%}")
    summary = getattr(_LAST_ENGINE, "summary", None)
    if summary:
        print(summary())


def main() -> int:
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--engine", default="legacy")
    p.add_argument("--live", action="store_true", help="use the real Groq LLM instead of the offline fallback")
    p.add_argument("--only", default="", help="comma-separated categories or scenario ids")
    p.add_argument("--verbose", action="store_true", help="also print passing scenarios")
    p.add_argument("--json", default="", help="write full results to this path")
    args = p.parse_args()

    only = [x.strip() for x in args.only.split(",") if x.strip()]
    if args.engine == "agent":
        args.live = True  # the agent is an LLM; there is no offline mode
    results = asyncio.run(run_all(args.engine, args.live, only))
    print(f"engine={args.engine} mode={'live' if args.live else 'offline'} scenarios={len(results)}")
    print_report(results, args.verbose)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump([asdict(r) for r in results], f, ensure_ascii=False, indent=2)
    return 0 if all(r.passed for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())

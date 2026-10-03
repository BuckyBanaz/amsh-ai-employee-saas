"""Golden snapshot of every model-facing / caller-facing text the AI can produce, so a refactor can prove it changed nothing.

usage: python snapshot.py <out.json>        (run with PYTHONUTF8=1 from the repo root)
"""
import dataclasses
import itertools
import json
import sys

from backend.ai.evals import test_agent_core as t
from backend.ai.engine.agent import agent_loop, prompt_builder, toolbox
from backend.ai.engine.agent.fillers import choose_backchannel, wait_text
from backend.ai.verticals.compliance import get_regional_compliance
from backend.ai.verticals.context import resolve_business_context
from backend.ai.verticals import registry as vreg

out = {}
factory, biz = t.make_db_factory()
facts, profile = t.load_all(factory, biz)
vconf = vreg.registry.get_vertical("clinic") if hasattr(vreg, "registry") else t.vertical_registry.get_vertical("clinic")

# ---- build_system_prompt matrix
countries = {"IN": "India", "NL": "Netherlands", "US": "United States", "UNKNOWN": ""}
langs = [("en", ["en"], True), ("en", None, True), ("hi", ["hi", "en"], True), ("nl", ["nl"], True), ("ar", ["ar"], True),
         ("en", ["en", "hi"], False), ("de", ["de", "en"], True), ("ta", ["ta"], True)]
n = 0
for (region, country), (primary, languages, auto), channel in itertools.product(countries.items(), langs[:], ("voice", "chat")):
    for gender, small, confirm, instr, disabled in (
        (None, True, True, None, None),
        ("female", False, False, "Be very formal.", ["booking appointments or checking availability"]),
        ("male", True, False, None, ["transferring calls to staff"]),
    ):
        f = dataclasses.replace(facts, country=country, timezone="Asia/Kolkata" if region == "IN" else "Europe/Amsterdam")
        ctx = resolve_business_context(f, vconf, primary, languages, auto, "x-" + primary)
        key = f"prompt|{region}|{primary}|{languages}|{auto}|{channel}|{gender}|{small}|{confirm}|{bool(instr)}|{bool(disabled)}"
        out[key] = prompt_builder.build_system_prompt(
            f, "Maya", t.FIXED_NOW, "919876543210", "Warm & Friendly", gender, instructions=instr, small_talk=small,
            require_confirmation=confirm, disabled=disabled, primary_language=primary, languages=languages,
            auto_detect_language=auto, triggers=None, channel=channel, context=ctx)
        n += 1

# ---- prompt helper pieces
for tone in (None, "", "warm & friendly", "crisp & professional", "energetic & fast", "empathetic & calm", "Custom Tone"):
    out[f"personality|{tone}"] = prompt_builder.personality_line(tone)
for primary, languages, auto in langs:
    out[f"language_rule|{primary}|{languages}|{auto}"] = prompt_builder.language_rule(primary, languages, auto)
for trig in (None, {"frustration": True, "emergency": True, "failed_answer": True, "complex_billing": True, "human_request": True},
             {"frustration": False, "emergency": False, "failed_answer": False, "complex_billing": False, "human_request": False}):
    out[f"triggers|{trig}"] = prompt_builder.trigger_lines(trig)
for code in ("en", "hi", "es", "nl", "fr", "de", "ar", "ta", "pa", "xx"):
    out[f"native_style|{code}"] = prompt_builder._native_style(code)
    out[f"lang_name|{code}"] = prompt_builder._lang_name(code)
    out[f"language_note|{code}"] = agent_loop._language_note(code)
    for table_name in ("_FALLBACK", "_NO_TRANSFER", "_BILLING_MSG", "_FRUSTRATED_MSG", "_UNSURE_CLAIM", "_UNSURE_TIMES"):
        table = getattr(agent_loop, table_name)
        key = {"_FALLBACK": "fallback", "_NO_TRANSFER": "no_transfer", "_BILLING_MSG": "billing", "_FRUSTRATED_MSG": "frustrated",
               "_UNSURE_CLAIM": "unsure_claim", "_UNSURE_TIMES": "unsure_times"}[table_name]
        out[f"scripted|{table_name}|{code}"] = agent_loop._scripted(table, key, code)
    out[f"wait|{code}"] = wait_text(code == "hi", code if code not in ("hi", "en") else None)

# ---- engine-level constants and notes (names that exist today)
for name in ("_NO_REGREET_NOTE", "_LANGUAGE_RETRY_NOTE", "_DEVANAGARI_NOTE", "_HINDI_EMERGENCY_MSG", "_LANGUAGE_NOTE"):
    if hasattr(agent_loop, name):
        out[f"agent_loop.{name}"] = repr(getattr(agent_loop, name))
for name in ("MAX_TOOL_ROUNDS", "MAX_HISTORY_TURNS"):
    out[f"agent_loop.{name}"] = getattr(agent_loop, name)
for name in dir(prompt_builder):
    if name.startswith("_") and name[1:2].isupper() or name in ("PRIVACY_RULE",):
        v = getattr(prompt_builder, name)
        if isinstance(v, (str, dict, list, tuple)):
            out[f"prompt_builder.{name}"] = repr(v)

# ---- compliance
for vertical in ("clinic", "restaurant", "salon", "other"):
    for country in countries.values():
        out[f"compliance|{vertical}|{country}"] = json.dumps(get_regional_compliance(vertical, country), sort_keys=True, ensure_ascii=False)

# ---- fillers
for lang in (None, "es", "nl", "de", "fr", "ar"):
    out[f"backchannel|{lang}"] = repr(choose_backchannel("what is the price?", "The treatment costs fifty euros today.", None, 5, 0, 0, language=lang))

# ---- notes in the smaller engine modules (added after stage A)
from backend.ai.engine.agent import emotion as _emotion, grounding as _grounding, language_layer as _layer, progress as _progress
from backend.ai.capabilities.rules.patient_privacy import known_patient_block as _kpb
out["grounding.GUARD_NOTE"] = _grounding.GUARD_NOTE
out["grounding.CLAIM_NOTE"] = _grounding.CLAIM_NOTE
out["emotion.MOOD_NOTES"] = repr(_emotion.MOOD_NOTES)
out["progress.BOOKING_NOTE"] = _progress.BOOKING_NOTE
out["language_layer._LAYER_NOTE"] = _layer._LAYER_NOTE
out["language_layer._INTERRUPTION_NOTE"] = _layer._INTERRUPTION_NOTE
_rows = [{"customer_name": "Asha Rao", "service_name": "Teeth Whitening", "preferred_date": "2026-10-03", "preferred_time": "10:00 AM", "status": "confirmed"},
         {"customer_name": "Guest Patient", "service_name": "", "preferred_date": "2026-10-09", "preferred_time": "11:00 AM", "status": "pending"}]
out["known_patient|returning"] = _kpb(_rows, "Asha")
out["known_patient|noname"] = _kpb(_rows[1:], None)
out["known_patient|new"] = _kpb([], "Asha Rao")
out["known_patient|empty"] = _kpb([], None)
for _code in ("hi", "en", "nl", "xx"):
    out[f"language_note_full|{_code}"] = agent_loop._language_note(_code)

json.dump(out, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1, sort_keys=True)
print("snapshot entries:", len(out), "prompts:", n)

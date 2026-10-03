"""Stage 2: engine notes + fixed en/hi lines -> data. Generated from the CURRENT module values (imported, not retyped)."""
import ast
import json
import pathlib

from backend.ai.engine.agent import agent_loop as a, emotion as e, grounding as g, language_layer as ll, progress as p

ROOT = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\backend\ai")

# ------------------------------------------------------------------ 1. engine_notes.json
notes = {
    "_about": "Per-turn system notes and model-facing messages sent by the engine. See backend/ai/prompts/__init__.py. Edit, then restart the API.",
    "no_regreet": a._NO_REGREET_NOTE,
    "language_retry": a._LANGUAGE_RETRY_NOTE,
    "devanagari": a._DEVANAGARI_NOTE,
    "language_note": dict(a._LANGUAGE_NOTE),
    "language_note_generic": {
        "asked": ("The caller asked you to speak {name}. Reply in {name} for the rest of the call, even when their next message is transcribed "
                  "in another script or contains words from another language, until they ask for another language."),
        "native": ("Speak {name} the way a native speaker does on the phone: real everyday filler words, acknowledgements and "
                   "politeness forms of that language (never translate English fillers word for word)."),
    },
    "hindi_emergency": {"hindi": a._HINDI_EMERGENCY_MSG[True], "default": a._HINDI_EMERGENCY_MSG[False]},
    "guard_note": g.GUARD_NOTE,
    "claim_note": g.CLAIM_NOTE,
    "mood_notes": dict(e.MOOD_NOTES),
    "booking_note": p.BOOKING_NOTE,
    "language_layer": {"layer_note": ll._LAYER_NOTE, "interruption_note": ll._INTERRUPTION_NOTE},
    "known_patient": {
        "new_patient": ("NEW PATIENT: no earlier bookings on this number. Their WhatsApp profile name is \"{profile}\" (not verified: confirm "
                        "the name they want on the booking)."),
        "visit": "{service} on {date} at {time} ({status})",
        "visit_default_service": "a visit",
        "visit_separator": "; ",
        "name_on_file": "name on file: {name}",
        "no_name": "no name on file",
        "returning_patient": ("RETURNING PATIENT: this number has booked here before ({who}). Latest bookings: {visits}. Greet them warmly by first name "
                              "once, like staff who remember them. Do not read their history out unless it helps (for example \"same service as last "
                              "time?\"). Their number is already known: offer it, never ask for it again."),
    },
}
(ROOT / "prompts/engine_notes.json").write_text(json.dumps(notes, ensure_ascii=False, indent=1), encoding="utf-8")

# ------------------------------------------------------------------ 2. en / hi fixed lines -> language packs (strings)
KEYS = {"_FALLBACK": "fallback", "_NO_TRANSFER": "no_transfer", "_BILLING_MSG": "billing", "_FRUSTRATED_MSG": "frustrated",
        "_UNSURE_CLAIM": "unsure_claim", "_UNSURE_TIMES": "unsure_times"}
for code in ("en", "hi"):
    path = ROOT / f"locales/lexicon/{code}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    for table_name, key in KEYS.items():
        data.setdefault("strings", {})[key] = getattr(a, table_name)[code]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
print("engine_notes.json and en/hi strings written")

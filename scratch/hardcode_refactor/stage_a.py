"""Stage A: point the engine modules at engine_notes.json / the language packs instead of Python string constants.
Run from the repo root:  PYTHONPATH=. PYTHONUTF8=1 python scratch/hardcode_refactor/stage_a.py
Replaces assignments / functions by AST line range, keeping the same module-level NAMES."""
import ast
import pathlib

ROOT = pathlib.Path("backend/ai")


def load(path):
    s = (ROOT / path).read_text(encoding="utf-8")
    return s, s.split("\n"), ast.parse(s)


def replace_assign(lines, tree, name, new_src):
    node = next(n for n in tree.body if isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Name) and n.targets[0].id == name)
    return (node.lineno, node.end_lineno, new_src)


def replace_func(tree, name, new_src):
    node = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name)
    return (node.lineno, node.end_lineno, new_src)


def apply(path, edits, import_line, helpers=""):
    s, lines, tree = load(path)
    # last top-level import (before any edit)
    last_import = max(n.end_lineno for n in tree.body if isinstance(n, (ast.Import, ast.ImportFrom)))
    # edits bottom-up so line numbers stay valid
    for start, end, text in sorted(edits, key=lambda e: -e[0]):
        lines[start - 1:end] = text.split("\n")
    insert = [import_line] + ([helpers] if helpers else [])
    lines[last_import:last_import] = insert
    out = "\n".join(lines)
    ast.parse(out)
    (ROOT / path).write_text(out, encoding="utf-8")


# ---------------------------------------------------------------- agent_loop.py
s, lines, tree = load("engine/agent/agent_loop.py")
lang_note_func = '''def _language_note(code: str) -> str:
    """The system note for a language the caller asked for. Hindi and English keep their tuned notes; any other language is
    built from its pack (name + style guidance), or just its name when it has no pack. All wording is data (engine_notes.json)."""
    if code in _LANGUAGE_NOTE:
        return _LANGUAGE_NOTE[code]
    pack = language_pack(code)
    name = pack.get("name") or code
    generic = _notes()["language_note_generic"]
    style = pack.get("style") or generic["native"].format(name=name)
    return f"{generic['asked'].format(name=name)} {style}"'''
edits = [
    replace_assign(lines, tree, "_FALLBACK", '_FALLBACK = _lines("fallback")'),
    replace_assign(lines, tree, "_NO_TRANSFER", '_NO_TRANSFER = _lines("no_transfer")'),
    replace_assign(lines, tree, "_DEVANAGARI_NOTE", '_DEVANAGARI_NOTE = _notes()["devanagari"]'),
    replace_assign(lines, tree, "_NO_REGREET_NOTE", '_NO_REGREET_NOTE = _notes()["no_regreet"]'),
    replace_assign(lines, tree, "_LANGUAGE_RETRY_NOTE", '_LANGUAGE_RETRY_NOTE = _notes()["language_retry"]'),
    replace_assign(lines, tree, "_LANGUAGE_NOTE", '_LANGUAGE_NOTE = dict(_notes()["language_note"])'),
    replace_assign(lines, tree, "_HINDI_EMERGENCY_MSG", '_HINDI_EMERGENCY_MSG = {True: _notes()["hindi_emergency"]["hindi"], False: _notes()["hindi_emergency"]["default"]}'),
    replace_assign(lines, tree, "_BILLING_MSG", '_BILLING_MSG = _lines("billing")'),
    replace_assign(lines, tree, "_FRUSTRATED_MSG", '_FRUSTRATED_MSG = _lines("frustrated")'),
    replace_assign(lines, tree, "_UNSURE_CLAIM", '_UNSURE_CLAIM = _lines("unsure_claim")'),
    replace_assign(lines, tree, "_UNSURE_TIMES", '_UNSURE_TIMES = _lines("unsure_times")'),
    replace_func(tree, "_language_note", lang_note_func),
]
helpers = '''

def _notes() -> Dict[str, Any]:
    """Per-turn system notes and model-facing messages: data in ai/prompts/engine_notes.json."""
    return load_prompts("engine_notes")


def _lines(key: str) -> Dict[str, str]:
    """The English and Hindi version of a fixed line, read from the language packs (`strings.<key>`). Every other language is read
    from its own pack by `_scripted`."""
    return {code: language_pack(code)["strings"][key] for code in ("en", "hi")}
'''
apply("engine/agent/agent_loop.py", edits, "from backend.ai.prompts import load_prompts", helpers)

# ---------------------------------------------------------------- the small modules
for path, name_to_key in (
    ("engine/agent/grounding.py", {"GUARD_NOTE": '_engine_note("guard_note")', "CLAIM_NOTE": '_engine_note("claim_note")'}),
    ("engine/agent/progress.py", {"BOOKING_NOTE": '_engine_note("booking_note")'}),
    ("engine/agent/language_layer.py", {"_LAYER_NOTE": '_engine_note("language_layer")["layer_note"]', "_INTERRUPTION_NOTE": '_engine_note("language_layer")["interruption_note"]'}),
):
    s, lines, tree = load(path)
    edits = [replace_assign(lines, tree, name, f"{name} = {value}") for name, value in name_to_key.items()]
    apply(path, edits, "from backend.ai.prompts import load_prompts",
          "\n\ndef _engine_note(key):\n    return load_prompts(\"engine_notes\")[key]\n")

s, lines, tree = load("engine/agent/emotion.py")
apply("engine/agent/emotion.py", [replace_assign(lines, tree, "MOOD_NOTES", 'MOOD_NOTES = dict(load_prompts("engine_notes")["mood_notes"])')],
      "from backend.ai.prompts import load_prompts") if "load_prompts" not in s else None
if "load_prompts" in s:
    s2, lines2, tree2 = load("engine/agent/emotion.py")
    ed = [replace_assign(lines2, tree2, "MOOD_NOTES", 'MOOD_NOTES = dict(load_prompts("engine_notes")["mood_notes"])')]
    for start, end, text in sorted(ed, key=lambda e: -e[0]):
        lines2[start - 1:end] = text.split("\n")
    (ROOT / "engine/agent/emotion.py").write_text("\n".join(lines2), encoding="utf-8")

# ---------------------------------------------------------------- patient_privacy.known_patient_block
s, lines, tree = load("capabilities/rules/patient_privacy.py")
func = '''def known_patient_block(history: List[Dict[str, Any]], profile_name: Optional[str] = None) -> str:
    """Prompt lines about the caller. `history` is the caller's own appointments, newest first (from
    ClinicReadOperations.get_patient_history). Empty string when there is nothing safe to say. Wording: engine_notes.json."""
    notes = load_prompts("engine_notes")["known_patient"]
    name = ""
    for row in history:
        candidate = clean_name(row.get("customer_name"))
        if candidate.lower() not in _GUEST:
            name = candidate
            break
    if not history:
        profile = clean_name(profile_name)
        if not profile:
            return ""
        return notes["new_patient"].format(profile=profile)
    visits = notes["visit_separator"].join(
        notes["visit"].format(
            service=clean_name(row.get("service_name")) or notes["visit_default_service"],
            date=row.get("preferred_date"), time=row.get("preferred_time"), status=row.get("status"),
        )
        for row in history
    )
    who = notes["name_on_file"].format(name=name) if name else notes["no_name"]
    return notes["returning_patient"].format(who=who, visits=visits)'''
edit = replace_func(tree, "known_patient_block", func)
for start, end, text in [edit]:
    lines[start - 1:end] = text.split("\n")
out = "\n".join(lines)
ast.parse(out)
(ROOT / "capabilities/rules/patient_privacy.py").write_text(out, encoding="utf-8")
print("stage A applied")

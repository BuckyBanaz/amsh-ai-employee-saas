"""Prompt packs: the text the model reads and the fixed lines the caller hears, as DATA files, not Python string constants.

`ai/prompts/<name>.json` holds templates with `{placeholders}`; code only fills them in. Editing a prompt is editing a file (and
restarting the API: uvicorn's `--reload` watches `.py` files only, so a JSON change needs a restart or container restart).

Packs:
  receptionist   the system prompt of the receptionist agent (rules, personalities, language / gender / channel / runtime-context
                 blocks, facts layout, escalation lines, owner-instructions wrapper) plus its tunable limits
  engine_notes   per-turn system notes and the model-facing messages the engine and toolbox send (guards, language retry, tool
                 results), keyed by name

Language-specific wording does NOT live here: it is in the language packs (`ai/locales/lexicon/<code>.json`, see `ai/lexicon.py`).
Region and vertical text live in `verticals/` data.

VERTICAL OVERLAYS (`ai/prompts/verticals/<vertical>.json`): a non-healthcare business reads the same packs with a small, reviewed
overlay on top, so a rule fixed in the base reaches every vertical. An overlay has two parts per pack:
  "edits": {"<key/path>": [["exact text in the base", "replacement"], ...]}   string edits; each "from" MUST occur in the base
  "set":   {"<key/path>": value}                                                 a key replaced (or added) outright
  "terms": [["clinic", "salon"], ...] + "term_keys": ["<key/path>", ...]           whole-word swaps, in order, on those keys only
Paths use "/" between levels because some keys contain dots ("messages/toolbox/execute.disabled").
The healthcare vertical ("clinic") has no overlay file: it reads the base packs unchanged (the clinic golden test guards this).
`overlay_problems()` lists every edit whose text no longer occurs in the base (a test fails on any). Legacy engine text (`engine/conversation/*`) is not covered: it is being retired.
"""

import copy
import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

PROMPTS_DIR = Path(__file__).parent


OVERLAY_DIR = PROMPTS_DIR / "verticals"


def load_prompts(name: str, vertical: Optional[str] = None) -> Dict[str, Any]:
    """The named prompt pack, with the vertical's overlay applied when it has one. Without an overlay (healthcare, or no vertical)
    this is the base pack itself."""
    key = str(vertical or "").strip().lower()
    if key and _has_overlay(key):
        return _overlaid(name, key)
    return _base(name)


@lru_cache(maxsize=None)
def _has_overlay(vertical: str) -> bool:
    return (OVERLAY_DIR / f"{vertical}.json").is_file()


def _get(tree: Dict[str, Any], dotted: str) -> Any:
    node: Any = tree
    for part in dotted.split("/"):
        node = node[part]
    return node


def _put(tree: Dict[str, Any], dotted: str, value: Any) -> None:
    parts = dotted.split("/")
    node = tree
    for part in parts[:-1]:
        node = node.setdefault(part, {})
    node[parts[-1]] = value


@lru_cache(maxsize=None)
def _overlay(vertical: str) -> Dict[str, Any]:
    with open(OVERLAY_DIR / f"{vertical}.json", "r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=None)
def _overlaid(name: str, vertical: str) -> Dict[str, Any]:
    pack = copy.deepcopy(_base(name))
    spec = _overlay(vertical).get(name) or {}
    for dotted, pairs in (spec.get("edits") or {}).items():
        text = _get(pack, dotted)
        for old, new in pairs:
            text = text.replace(old, new)
        _put(pack, dotted, text)
    for dotted in spec.get("term_keys") or []:
        _put(pack, dotted, _swap_terms(_get(pack, dotted), spec.get("terms") or []))
    for dotted, value in (spec.get("set") or {}).items():
        _put(pack, dotted, value)
    return pack


_PLACEHOLDER = re.compile(r"(?<!\{)\{([a-z_]+)\}(?!\})")


def _placeholder_changes(vertical: str, name: str, base: Any, overlaid: Any, path: str = "") -> List[str]:
    """An overlaid string must keep exactly its base's {placeholders}: code fills them, a renamed one is a crash."""
    if isinstance(base, dict) and isinstance(overlaid, dict):
        out: List[str] = []
        for key in base:
            if key in overlaid:
                out.extend(_placeholder_changes(vertical, name, base[key], overlaid[key], f"{path}/{key}" if path else key))
        return out
    if isinstance(base, str) and isinstance(overlaid, str) and set(_PLACEHOLDER.findall(base)) != set(_PLACEHOLDER.findall(overlaid)):
        return [f"{vertical}: {name}/{path} changes its placeholders"]
    return []


def _swap_terms(text: str, terms: List[List[str]]) -> str:
    for old, new in terms:
        text = re.sub(rf"(?<![\w'{{]){re.escape(old)}(?![\w}}])", new, text)  # never inside a {placeholder}
    return text


def overlay_problems() -> List[str]:
    """Every overlay edit whose text no longer occurs in its base pack, and every "set"/"edits" key that is not a string where one
    is needed. Empty when all overlays apply cleanly."""
    problems: List[str] = []
    for file in sorted(OVERLAY_DIR.glob("*.json")) if OVERLAY_DIR.is_dir() else []:
        vertical = file.stem
        for name, spec in _overlay(vertical).items():
            if name.startswith("_"):
                continue
            base = _base(name)
            for dotted, pairs in (spec.get("edits") or {}).items():
                try:
                    text = _get(base, dotted)
                except (KeyError, TypeError):
                    problems.append(f"{vertical}: {name}/{dotted} does not exist")
                    continue
                for old, _new in pairs:
                    if not isinstance(text, str) or old not in text:
                        problems.append(f"{vertical}: {name}/{dotted} no longer contains {old[:60]!r}")
            terms = spec.get("terms") or []
            for dotted in spec.get("term_keys") or []:
                try:
                    text = _get(_overlaid(name, vertical), dotted)
                    original = _get(base, dotted)
                except (KeyError, TypeError):
                    problems.append(f"{vertical}: {name}/{dotted} does not exist")
                    continue
                if not isinstance(original, str) or _swap_terms(original, terms) == original:
                    problems.append(f"{vertical}: {name}/{dotted} has none of the overlay's terms any more")
            problems.extend(_placeholder_changes(vertical, name, base, _overlaid(name, vertical)))
    return problems


@lru_cache(maxsize=None)
def _base(name: str) -> Dict[str, Any]:
    """The named base pack. Cached for the life of the process; a missing pack is an error, never an empty prompt."""
    path = PROMPTS_DIR / f"{name}.json"
    if not path.is_file():
        raise FileNotFoundError(f"Prompt pack {name!r} not found at {path}")
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)

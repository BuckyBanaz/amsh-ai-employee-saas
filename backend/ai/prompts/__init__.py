"""Prompt packs: the text the model reads and the fixed lines the caller hears, as DATA files, not Python string constants.

`ai/prompts/<name>.json` holds templates with `{placeholders}`; code only fills them in. Editing a prompt is editing a file (and
restarting the API: uvicorn's `--reload` watches `.py` files only, so a JSON change needs a restart or container restart).

Packs:
  receptionist   the system prompt of the receptionist agent (rules, personalities, language / gender / channel / runtime-context
                 blocks, facts layout, escalation lines, owner-instructions wrapper) plus its tunable limits
  engine_notes   per-turn system notes and the model-facing messages the engine and toolbox send (guards, language retry, tool
                 results), keyed by name

Language-specific wording does NOT live here: it is in the language packs (`ai/locales/lexicon/<code>.json`, see `ai/lexicon.py`).
Region and vertical text live in `verticals/` data. Legacy engine text (`engine/conversation/*`) is not covered: it is being retired.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

PROMPTS_DIR = Path(__file__).parent


@lru_cache(maxsize=None)
def load_prompts(name: str) -> Dict[str, Any]:
    """The named prompt pack. Cached for the life of the process; a missing pack is an error, never an empty prompt."""
    path = PROMPTS_DIR / f"{name}.json"
    if not path.is_file():
        raise FileNotFoundError(f"Prompt pack {name!r} not found at {path}")
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)

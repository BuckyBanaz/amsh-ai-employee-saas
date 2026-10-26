"""Clinic golden snapshot: what the healthcare agent is told and offered today, rendered from the real code.

Captured BEFORE the multi-vertical workflow engine (DOCS/30, DOCS/verticals) so every later change can be checked against it:
the clinic system prompt in each channel / language / setting combination, the tool schemas the model sees, the booking order,
the controller's per-turn notes on a scripted booking, the model-facing engine messages and the greetings.

    python -m backend.ai.evals.clinic_golden --write     re-capture (only when a clinic change is intended and reviewed)

`test_clinic_golden.py` compares the live render with the saved file character for character.
"""

import json
import sys
from datetime import date
from pathlib import Path
from typing import Any, Dict

from backend.ai.evals.fixtures import FIXED_NOW, make_db_factory

GOLDEN_PATH = Path(__file__).parent / "baselines" / "clinic_golden.json"

# (label, AgentEngine keyword arguments): the settings combinations a clinic can run with
SETTINGS = (
    ("voice_en_default", {}),
    ("chat_en_default", {"channel": "chat"}),
    ("voice_hi_hinglish", {"language": "hi", "languages": ["hi", "en"]}),
    ("voice_nl_fixed", {"language": "nl", "languages": ["nl"], "auto_detect_language": False}),
    ("voice_transfers_off", {"capabilities": {"transfer": False}}),
    ("voice_no_confirmation_custom", {"require_confirmation": False, "small_talk": False, "tone": "calm and precise",
                                      "instructions": "Mention free parking.", "gender": "male"}),
)

# A scripted booking, one caller turn at a time: what the controller says it knows and what to ask next after each.
SCRIPT = (
    "Hello",
    "I want to book an appointment for dental cleaning",
    "tomorrow",
    "at 11 am",
    "My name is Asha Rao",
    "9876543210",
)


class _NoBackend:
    """The snapshot never calls the model."""


def _loop(factory: Any, biz: str, **kwargs: Any) -> Any:
    from backend.ai.engine.agent.agent_loop import AgentEngine
    from backend.ai.engine.agent.facts import load_facts
    from backend.ai.verticals.registry import registry

    with factory() as db:
        facts = load_facts(db, biz)
    language = kwargs.pop("language", "en")
    return AgentEngine(
        biz, "+919876500009", None, facts, registry.get_vertical(facts.vertical, language), _NoBackend(), factory,
        agent_name="Maya", language=language, now_fn=lambda: FIXED_NOW, **kwargs,
    )


def _messages(tree: Any, prefix: str = "") -> Dict[str, str]:
    """Every model-facing message the engine and toolbox can send, flattened to "group.name" keys."""
    out: Dict[str, str] = {}
    for key, value in (tree or {}).items():
        name = f"{prefix}{key}"
        if isinstance(value, dict):
            out.update(_messages(value, name + "."))
        else:
            out[name] = json.dumps(value, ensure_ascii=False) if not isinstance(value, str) else value
    return out


def render() -> Dict[str, Any]:
    from backend.ai.engine.agent import controller
    from backend.ai.prompts import load_prompts

    factory, biz = make_db_factory()
    snapshot: Dict[str, Any] = {"slot_order": list(controller.SLOT_ORDER), "settings": {}}
    for label, kwargs in SETTINGS:
        loop = _loop(factory, biz, **dict(kwargs))
        snapshot["settings"][label] = {
            "system_prompt": loop._system,
            "tools": [s["function"]["name"] for s in loop.tools],
            "disabled_tools": sorted(loop.toolbox.disabled_tools),
            "greeting": loop.greeting(),
        }
    loop = _loop(factory, biz)
    snapshot["tool_schemas"] = loop.tools  # the full schemas the clinic model is offered (default voice settings)
    snapshot["slot_order"] = list(loop.ctrl.slot_order) if hasattr(loop.ctrl, "slot_order") else snapshot["slot_order"]
    notes = []
    for utterance in SCRIPT:
        loop.ctrl.observe(utterance, date(2026, 9, 28))
        notes.append({"caller": utterance, "missing": loop.ctrl.missing(), "note": loop.ctrl.note()})
    snapshot["controller_script"] = notes
    snapshot["engine_messages"] = _messages(load_prompts("engine_notes"))
    return json.loads(json.dumps(snapshot, ensure_ascii=False, default=str))  # one canonical form for comparing


if __name__ == "__main__":
    if "--write" not in sys.argv:
        sys.exit("Refusing to overwrite the clinic golden without --write")
    GOLDEN_PATH.write_text(json.dumps(render(), ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(f"wrote {GOLDEN_PATH}")

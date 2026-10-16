"""Which language/dialect the speech recogniser listens for. From the business's own settings only.

Order: an explicit STT language saved in the Voice tab (`config.stt.language`) -> the saved accent (`config.accent`, e.g. "hi-IN",
"en-IN", "nl-NL") when it is an accent of the primary language -> the primary language -> "en". An accent that belongs to another
language (a Dutch clinic whose saved accent is still "hi-IN") is ignored, so changing the primary language is never overridden by
a stale accent. It never looks at the caller's phone number or the region.
"""

from typing import Any, Dict


def _base(code: str) -> str:
    return str(code or "").strip().split("-")[0].lower()


def resolve_stt_language(agent_settings: Dict[str, Any]) -> str:
    settings = agent_settings or {}
    explicit = str(settings.get("stt_language") or "").strip()
    if explicit:
        return explicit
    primary = _base(settings.get("language"))
    accent = str(settings.get("accent") or "").strip()
    if accent and (not primary or _base(accent) == primary):
        return accent
    return primary or "en"

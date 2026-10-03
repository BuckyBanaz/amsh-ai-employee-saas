"""Language behaviour policy: which language conversation layers a tenant gets. THE LANGUAGE DIMENSION ONLY.

A language layer (today Hindi/Hinglish, `engine/agent/language_layer.py`, spec `issue.md`) is about how the agent TALKS in that
language: response language, phrasing, fillers, interruptions. It is switched on by the tenant's language settings, never by
region: a Hindi-speaking clinic in the Netherlands gets the Hindi layer and the Dutch emergency number (region), while an English
clinic in India gets neither the Hindi layer nor any India-only wording from the language side.

Which languages have a layer is data: a language whose `ai/locales/lexicon/<language>.json` sets `"conversation_layer": true`.

    allowed languages = primary language + the Languages tab list
    layer ON for a language when it is allowed; when the tenant restricted nothing (no list) and auto-detect is on, the agent
    follows the caller, so every language that has a layer is available

Region, accent, timezone and vertical are not read here.
"""

from dataclasses import dataclass
from typing import FrozenSet, Iterable, Optional

from backend.ai.lexicon import lexicon_languages, load_lexicon


@dataclass(frozen=True)
class LanguagePolicy:
    layers: FrozenSet[str] = frozenset()  # language codes whose conversation layer is on for this tenant

    @property
    def hindi_hinglish_layer(self) -> bool:
        return "hi" in self.layers


def layer_languages() -> FrozenSet[str]:
    return frozenset(lang for lang in lexicon_languages() if load_lexicon(lang).get("conversation_layer"))


def resolve_language_policy(primary_language: Optional[str] = "en", languages: Optional[Iterable[str]] = None, auto_detect: bool = True) -> LanguagePolicy:
    available = layer_languages()
    allowed = {str(code).split("-")[0].lower() for code in (languages or [])}
    if primary_language:
        allowed.add(str(primary_language).split("-")[0].lower())
    if not languages and auto_detect:
        return LanguagePolicy(available)
    return LanguagePolicy(frozenset(code for code in available if code in allowed))

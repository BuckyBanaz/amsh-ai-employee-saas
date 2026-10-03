"""BusinessContext: the authoritative runtime context for one business, resolved once per call and handed to the engine.

    one global engine  <-  BusinessContext  <-  Business row + Agent row (+ the vertical config)

FIVE INDEPENDENT DIMENSIONS. None is inferred from another, and the LLM is never asked to guess them:
  vertical   Business.vertical                       what kind of business (terminology, capabilities, operations)
  language   Agent.primary_language / .languages     how the agent talks (wording, fillers, phrasing)
  accent     Agent.config["accent"] (and the voice)  how the agent sounds; informational for the prompt, never decides region
  region     Business.country                        emergency numbers, privacy framework, local conventions
  timezone   Business.timezone                       the clock: today's date, appointment times, scheduling

Example: Hindi + Indian accent + region NL + Europe/Amsterdam is one valid combination (a Hindi-speaking clinic in the
Netherlands): the Hindi layer applies (language), the emergency number is 112 (region), times are Amsterdam times (timezone).

Required context is not defaulted: a business with no vertical or no timezone raises `MissingContextError` instead of quietly
becoming a clinic or UTC. A missing country is not an error: the region is UNKNOWN (no emergency number is invented).
"""

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Optional, Tuple

from backend.ai.lexicon import text_direction
from backend.ai.verticals.errors import MissingContextError
from backend.ai.verticals.language_policy import LanguagePolicy, resolve_language_policy
from backend.ai.verticals.regions import region_profile


@dataclass(frozen=True)
class BusinessContext:
    vertical: str
    timezone: str
    language: str = "en"
    direction: str = "ltr"  # text direction of the language ("rtl" for Arabic...), from its pack
    languages: Tuple[str, ...] = ()
    accent: str = ""
    region: str = "UNKNOWN"
    region_name: str = ""
    privacy: str = ""
    emergency_numbers: Tuple[str, ...] = ()
    terminology: Dict[str, str] = field(default_factory=dict)
    enabled_capabilities: Tuple[str, ...] = ()
    policies: LanguagePolicy = field(default_factory=LanguagePolicy)


def resolve_business_context(
    facts: Any,
    vertical_config: Any,
    language: str = "en",
    languages: Optional[Iterable[str]] = None,
    auto_detect_language: bool = True,
    accent: Optional[str] = None,
) -> BusinessContext:
    """Build the context from `BusinessFacts` (vertical, country, timezone), the agent's language/accent settings and the
    vertical config. Raises MissingContextError when a required value is not configured."""
    vertical = str(getattr(facts, "vertical", "") or "").strip().lower()
    if not vertical:
        raise MissingContextError("This business has no vertical configured; it will not be treated as a clinic by default.")
    timezone = str(getattr(facts, "timezone", "") or "").strip()
    if not timezone:
        raise MissingContextError("This business has no timezone configured; it will not be treated as UTC by default.")
    if vertical_config is None or str(getattr(vertical_config, "name", "")).strip().lower() != vertical:
        raise MissingContextError(f"No vertical configuration loaded for {vertical!r}.")

    profile = region_profile(getattr(facts, "country", "") or "")  # from the country only
    code = str(language or "en").split("-")[0].lower()
    return BusinessContext(
        vertical=vertical,
        timezone=timezone,
        language=code,
        direction=text_direction(code),
        languages=tuple(dict.fromkeys(str(c).split("-")[0].lower() for c in (languages or ()))),
        accent=str(accent or ""),
        region=profile.code,
        region_name=profile.name,
        privacy=profile.privacy,
        emergency_numbers=profile.emergency_numbers,
        terminology=vertical_config.terminology.model_dump(),
        enabled_capabilities=tuple(vertical_config.default_tools),
        policies=resolve_language_policy(language, languages, auto_detect_language),
    )

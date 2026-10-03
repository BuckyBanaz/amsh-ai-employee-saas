"""BusinessContext: everything about a tenant that changes behaviour, resolved once per call and handed to the engine.

    one global engine  <-  BusinessContext  <-  vertical config (terminology, tools) + region profile + language policy

The engine, the rules and the operations read the context; they never test a country or a vertical name themselves.
Resolved from the business's own facts (country, timezone, vertical), so it works for every tenant the same way.

Fields:
  vertical             "clinic", "restaurant"...  (selects the vertical config YAML)
  region               "IN" | "US" | "UK_EU" | "OTHER"  (see compliance.detect_region)
  language             the agent's primary language ("en", "hi", "es", "nl"...)
  timezone             IANA name from the business profile
  emergency_numbers    what to tell a caller in an emergency (regions.py)
  terminology          Customer -> Patient etc. (from the vertical config)
  enabled_capabilities the tools the vertical offers (from the vertical config)
  policies             behaviour switches by region (language_policy.py)
"""

from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Tuple

from backend.ai.verticals.language_policy import LanguagePolicy, resolve_language_policy
from backend.ai.verticals.regions import region_profile


@dataclass(frozen=True)
class BusinessContext:
    vertical: str = "clinic"
    region: str = "OTHER"
    language: str = "en"
    timezone: str = "UTC"
    emergency_numbers: Tuple[str, ...] = ()
    terminology: Dict[str, str] = field(default_factory=dict)
    enabled_capabilities: Tuple[str, ...] = ()
    policies: LanguagePolicy = field(default_factory=LanguagePolicy)


def resolve_business_context(facts: Any, vertical_config: Optional[Any] = None, language: str = "en") -> BusinessContext:
    """Build the context from `BusinessFacts` (country, timezone, vertical) and the loaded vertical config."""
    country = getattr(facts, "country", "") or ""
    timezone = getattr(facts, "timezone", "") or "UTC"
    profile = region_profile(country, timezone)
    terminology: Dict[str, str] = {}
    capabilities: Tuple[str, ...] = ()
    if vertical_config is not None:
        terminology = vertical_config.terminology.model_dump()
        capabilities = tuple(vertical_config.default_tools)
    return BusinessContext(
        vertical=getattr(facts, "vertical", "") or getattr(vertical_config, "name", "clinic"),
        region=profile.code,
        language=language or "en",
        timezone=timezone,
        emergency_numbers=profile.emergency_numbers,
        terminology=terminology,
        enabled_capabilities=capabilities,
        policies=resolve_language_policy(country, timezone),
    )

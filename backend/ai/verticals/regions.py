"""Region profiles: facts that differ by country, kept as data so the engine and the rules never hardcode a country.

A tenant's region comes from `compliance.detect_region()` (country, timezone, currency). To support a new country, add a
profile here; nothing in the engine changes. Vertical-specific facts (terminology, intents, tools) live in the vertical
configs (`verticals/configs/<vertical>/*.yaml`), not here.
"""

from dataclasses import dataclass
from typing import Dict, Tuple

from backend.ai.verticals.compliance import detect_region


@dataclass(frozen=True)
class RegionProfile:
    code: str
    emergency_numbers: Tuple[str, ...] = ()  # spoken to the caller on a medical emergency; empty = say "your local emergency number"


REGION_PROFILES: Dict[str, RegionProfile] = {
    "IN": RegionProfile("IN", ("112", "108")),
    "US": RegionProfile("US", ("911",)),
    "UK_EU": RegionProfile("UK_EU", ("999", "112")),
    "OTHER": RegionProfile("OTHER", ()),
}


def region_profile(country: str = "", timezone: str = "", currency: str = "") -> RegionProfile:
    return REGION_PROFILES[detect_region(country, timezone, currency)]

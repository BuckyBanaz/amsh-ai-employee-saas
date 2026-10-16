"""Region profiles: facts that differ by country, kept as data so the engine and the rules never hardcode a country.

REGION IS ITS OWN DIMENSION. It comes from the business's configured country (`Business.country`) and nothing else:
not from the timezone, the currency, the language, the voice/accent or the caller's phone number. A Hindi-speaking clinic in
the Netherlands is region NL (emergency 112); an English clinic in India is region IN.

A country that is empty or not listed resolves to the UNKNOWN profile: no emergency numbers (callers are told "your local
emergency number") and no regional privacy text, rather than a guess. To support a country add a profile and its aliases here;
nothing in the engine changes. Vertical facts (terminology, intents, tools) live in `verticals/configs/<vertical>/*.yaml`.
"""

from dataclasses import dataclass
from typing import Dict, Tuple


@dataclass(frozen=True)
class RegionProfile:
    code: str
    name: str = ""
    emergency_numbers: Tuple[str, ...] = ()  # spoken to the caller on a medical emergency; empty = "your local emergency number"
    privacy: str = ""  # "DPDP" | "GDPR" | "HIPAA" | "": the privacy framework the compliance text follows


UNKNOWN = RegionProfile("UNKNOWN", "Unknown region")

REGION_PROFILES: Dict[str, RegionProfile] = {
    "IN": RegionProfile("IN", "India", ("112", "108"), "DPDP"),
    "NL": RegionProfile("NL", "Netherlands", ("112",), "GDPR"),
    "US": RegionProfile("US", "United States", ("911",), "HIPAA"),
    "GB": RegionProfile("GB", "United Kingdom", ("999", "112"), "GDPR"),
    "DE": RegionProfile("DE", "Germany", ("112",), "GDPR"),
    "FR": RegionProfile("FR", "France", ("112", "15"), "GDPR"),
    "ES": RegionProfile("ES", "Spain", ("112",), "GDPR"),
}

# What the owner may have typed in the Country field -> region code. Lower-case, no dots.
COUNTRY_ALIASES: Dict[str, str] = {
    "in": "IN", "ind": "IN", "india": "IN", "bharat": "IN",
    "nl": "NL", "netherlands": "NL", "the netherlands": "NL", "holland": "NL", "nederland": "NL",
    "us": "US", "usa": "US", "united states": "US", "united states of america": "US",
    "gb": "GB", "uk": "GB", "united kingdom": "GB", "great britain": "GB", "britain": "GB", "england": "GB", "scotland": "GB", "wales": "GB",
    "de": "DE", "germany": "DE", "deutschland": "DE",
    "fr": "FR", "france": "FR",
    "es": "ES", "spain": "ES", "espana": "ES", "españa": "ES",
}


def region_profile(country: str = "") -> RegionProfile:
    """The region for a configured country, or UNKNOWN. Country only: no timezone, currency, language or accent."""
    key = str(country or "").strip().lower().replace(".", "")
    return REGION_PROFILES.get(COUNTRY_ALIASES.get(key, ""), UNKNOWN)


def detect_region(country: str = "") -> str:
    return region_profile(country).code


def region_flags(country: str = "") -> tuple:
    """(is_india, is_us, is_gdpr) for the compliance text. From the region profile, so still country-only."""
    profile = region_profile(country)
    return profile.code == "IN", profile.code == "US", profile.privacy == "GDPR"

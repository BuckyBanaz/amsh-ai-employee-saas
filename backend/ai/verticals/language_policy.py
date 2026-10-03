"""Language / region behaviour policy: which conversation enhancements a tenant gets, resolved from its region.

One global conversation engine serves everyone. Region-specific behaviour is NOT a separate engine and NOT scattered
`if country == "IN"` checks: it is a flag in the table below, resolved once per call from the tenant's country / timezone /
currency (the same detection the compliance resolver uses) and handed to the engine.

Today: the Hindi/Hinglish conversation layer (`engine/agent/language_layer.py`, spec `issue.md`) is switched on for India
businesses only. It then still activates per caller: only when the caller actually speaks Hindi/Hinglish (or asks for it).

    region IN    + caller speaks Hindi/Hinglish -> layer ON
    region IN    + caller speaks English        -> layer OFF (English flow untouched)
    region other + caller speaks Hindi          -> layer OFF (the generic language handling still applies)

Booking, rescheduling, state, tools and safety rules never read this policy: they are global and language-independent.
To add a behaviour or a region: add a field to LanguagePolicy and an entry to REGION_POLICIES.
"""

from dataclasses import dataclass

from backend.ai.verticals.compliance import detect_region


@dataclass(frozen=True)
class LanguagePolicy:
    hindi_hinglish_layer: bool = False


DEFAULT_POLICY = LanguagePolicy()

REGION_POLICIES = {
    "IN": LanguagePolicy(hindi_hinglish_layer=True),
}


def resolve_language_policy(country: str = "", timezone: str = "", currency: str = "") -> LanguagePolicy:
    """The behaviour policy for a business, from its region."""
    return REGION_POLICIES.get(detect_region(country, timezone, currency), DEFAULT_POLICY)

"""Vertical configuration module."""
from backend.ai.verticals.schemas import VerticalConfig, IntentDefinition, SlotDefinition, TerminologyConfig
from backend.ai.verticals.loader import VerticalLoader
from backend.ai.verticals.registry import VerticalRegistry, registry

__all__ = [
    "VerticalConfig",
    "IntentDefinition",
    "SlotDefinition",
    "TerminologyConfig",
    "VerticalLoader",
    "VerticalRegistry",
    "registry",
]

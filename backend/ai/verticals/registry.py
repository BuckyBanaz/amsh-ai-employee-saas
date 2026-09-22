"""
Vertical Registry.
Provides runtime access to all loaded vertical configurations,
with fallback and dynamic resolution.
"""

from typing import Dict, Optional
from backend.ai.verticals.loader import VerticalLoader
from backend.ai.verticals.schemas import VerticalConfig


class VerticalRegistry:
    """Singleton registry holding all active business vertical configurations."""
    
    _instance: Optional["VerticalRegistry"] = None
    _configs: Dict[str, VerticalConfig] = {}

    def __new__(cls) -> "VerticalRegistry":
        if cls._instance is None:
            cls._instance = super(VerticalRegistry, cls).__new__(cls)
            cls._instance._reload()
        return cls._instance

    def _reload(self) -> None:
        self._configs = VerticalLoader.load_all()

    def get_vertical(self, name: str, language: str = "en") -> VerticalConfig:
        """
        Get vertical config by name (e.g. 'clinic', 'restaurant') and language ('en', 'hi', 'es', 'nl').
        Falls back to 'clinic' (MVP default) if not found.
        """
        normalized = name.lower().strip()
        lang = (language or "en").lower().strip()
        key_lang = f"{normalized}:{lang}"

        if key_lang in self._configs:
            return self._configs[key_lang]
        if normalized in self._configs and self._configs[normalized].language == lang:
            return self._configs[normalized]
        
        # Try loading on-demand if not already loaded
        loaded = VerticalLoader.load_by_name(normalized, language=lang)
        if loaded:
            self._configs[f"{normalized}:{loaded.language}"] = loaded
            return loaded

        # Fallback to base vertical name or clinic default
        if normalized in self._configs:
            return self._configs[normalized]

        fallback_clinic = VerticalLoader.load_by_name("clinic", language="en")
        if fallback_clinic:
            self._configs["clinic:en"] = fallback_clinic
            return fallback_clinic

        raise ValueError(f"Vertical '{name}' not found and default 'clinic' could not be loaded.")

    def list_verticals(self) -> Dict[str, str]:
        """Return dict of {vertical_name: display_name}."""
        return {name: cfg.display_name for name, cfg in self._configs.items()}


# Global singleton helper
registry = VerticalRegistry()

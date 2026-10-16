"""
Vertical Registry.
Provides runtime access to all loaded vertical configurations,
with fallback and dynamic resolution.
"""

from typing import Dict, Optional
from backend.ai.verticals.loader import VerticalLoader
from backend.ai.verticals.errors import UnknownVerticalError
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
        Raises UnknownVerticalError when the vertical has no configuration (no silent fallback to 'clinic').
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

        # Same vertical in another language already loaded: fine (wording differs, the vertical does not).
        if normalized in self._configs:
            return self._configs[normalized]

        # No configuration for this vertical: say so. It is never quietly treated as a clinic.
        raise UnknownVerticalError(f"No vertical configuration found for {name!r}.")

    def list_verticals(self) -> Dict[str, str]:
        """Return dict of {vertical_name: display_name}."""
        return {name: cfg.display_name for name, cfg in self._configs.items()}


# Global singleton helper
registry = VerticalRegistry()

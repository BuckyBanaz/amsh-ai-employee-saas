"""
Vertical configuration loader.
Parses YAML files defining vertical specs and validates them against Pydantic models.
"""

import os
from pathlib import Path
from typing import Dict, Optional
import yaml

from backend.ai.verticals.schemas import VerticalConfig


CONFIGS_DIR = Path(__file__).parent / "configs"


class VerticalLoader:
    """Loads and validates vertical YAML specifications."""

    @staticmethod
    def load_from_file(file_path: str | Path) -> VerticalConfig:
        path = Path(file_path)
        if not path.is_file():
            raise FileNotFoundError(f"Vertical config file not found: {file_path}")
        
        with open(path, "r", encoding="utf-8") as f:
            raw_data = yaml.safe_load(f)
            
        return VerticalConfig.model_validate(raw_data)

    @staticmethod
    def load_by_name(vertical_name: str, language: Optional[str] = "en") -> Optional[VerticalConfig]:
        norm_name = vertical_name.lower().strip()
        norm_lang = (language or "en").lower().strip()

        # Candidates to try:
        candidates = [
            f"{norm_lang}_{norm_name}.yaml",
            f"{norm_lang}_{norm_name}.yml",
            f"{norm_name}.yaml",
            f"{norm_name}.yml",
            f"en_{norm_name}.yaml",
            f"en_{norm_name}.yml",
        ]

        # 1. Search in subfolder configs/<vertical_name>/
        vertical_dir = CONFIGS_DIR / norm_name
        if vertical_dir.is_dir():
            for c in candidates:
                p = vertical_dir / c
                if p.exists():
                    return VerticalLoader.load_from_file(p)

        # 2. Search directly in configs/
        for c in candidates:
            p = CONFIGS_DIR / c
            if p.exists():
                return VerticalLoader.load_from_file(p)

        # 3. Recursive rglob fallback
        for pattern in ["*.yaml", "*.yml"]:
            for p in CONFIGS_DIR.rglob(pattern):
                if p.name in candidates:
                    return VerticalLoader.load_from_file(p)

        return None

    @staticmethod
    def load_all() -> Dict[str, VerticalConfig]:
        configs: Dict[str, VerticalConfig] = {}
        if not CONFIGS_DIR.exists():
            return configs

        for pattern in ["*.yaml", "*.yml"]:
            for file in CONFIGS_DIR.rglob(pattern):
                try:
                    cfg = VerticalLoader.load_from_file(file)
                    # Key as 'clinic:en', 'clinic:hi', etc. as well as 'clinic'
                    key_lang = f"{cfg.name}:{cfg.language}"
                    configs[key_lang] = cfg
                    if cfg.name not in configs or cfg.language == "en":
                        configs[cfg.name] = cfg
                except Exception:
                    pass
        return configs

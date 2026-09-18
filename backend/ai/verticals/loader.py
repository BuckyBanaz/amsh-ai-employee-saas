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
    def load_by_name(vertical_name: str) -> Optional[VerticalConfig]:
        candidate_file = CONFIGS_DIR / f"{vertical_name.lower().strip()}.yaml"
        if candidate_file.exists():
            return VerticalLoader.load_from_file(candidate_file)
        return None

    @staticmethod
    def load_all() -> Dict[str, VerticalConfig]:
        configs: Dict[str, VerticalConfig] = {}
        if not CONFIGS_DIR.exists():
            return configs

        for file in CONFIGS_DIR.glob("*.yaml"):
            try:
                cfg = VerticalLoader.load_from_file(file)
                configs[cfg.name] = cfg
            except Exception as exc:
                # Log error or skip invalid files
                pass
        return configs

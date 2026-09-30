"""Service for managing platform-wide Free & Paid Trial settings.

Allows Admin to dynamically configure trial duration, pricing (100% Free $0 or Nominal $1-$9 fee),
quotas (minutes/messages), and promotional banner messaging.
"""

import json
from pathlib import Path
from typing import Dict, Any

CONFIG_FILE = Path(__file__).parent / "trial_config.json"

DEFAULT_TRIAL_CONFIG: Dict[str, Any] = {
    "enabled": True,
    "is_free": True,          # True = 100% Free ($0), False = Paid Trial (e.g. $1 or $5)
    "price": 0.0,             # Fee if is_free is False
    "currency": "USD",
    "duration_days": 14,
    "voice_minutes": 50,
    "messages": 100,
    "card_required": False,
    "banner_headline": "{days}-Day Free Trial is Active ({days_left} days remaining)",
    "banner_description": "You have full access to automated patient call handling and calendar sync. Choose any subscription plan below to upgrade anytime!",
    "badge_text": "{days}-DAY TRIAL",
    "upgrade_button_text": "Upgrade to Paid Plan"
}


class TrialService:
    @staticmethod
    def get_config() -> Dict[str, Any]:
        """Returns the current trial configuration, merged with defaults."""
        if not CONFIG_FILE.exists():
            TrialService.save_config(DEFAULT_TRIAL_CONFIG)
            return dict(DEFAULT_TRIAL_CONFIG)
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                merged = dict(DEFAULT_TRIAL_CONFIG)
                merged.update(data)
                return merged
        except Exception as e:
            print(f"[TrialService] Failed to read trial_config.json: {e}")
            return dict(DEFAULT_TRIAL_CONFIG)

    @staticmethod
    def save_config(updates: Dict[str, Any]) -> Dict[str, Any]:
        """Updates and persists trial configuration."""
        current = TrialService.get_config()
        current.update(updates)
        
        # Ensure correct types
        if "duration_days" in current:
            current["duration_days"] = max(1, int(current["duration_days"]))
        if "voice_minutes" in current:
            current["voice_minutes"] = max(0, int(current["voice_minutes"]))
        if "messages" in current:
            current["messages"] = max(0, int(current["messages"]))
        if "price" in current:
            current["price"] = max(0.0, float(current["price"]))
        if "is_free" in current:
            current["is_free"] = bool(current["is_free"])
            if current["is_free"]:
                current["price"] = 0.0
                current["card_required"] = False

        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(current, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[TrialService] Failed to save trial_config.json: {e}")
        return current

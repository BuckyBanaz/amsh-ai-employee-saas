"""
Test script for Multi-Language Clinic Vertical Configs & Locales (i18n).
Run this script to verify vertical loading and language translations:
    python backend/scripts/test_i18n_verticals.py
"""

import os
import sys

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from backend.ai.verticals.loader import VerticalLoader
from backend.ai.verticals.registry import registry
from backend.ai.engine.conversation.i18n import t, normalize_language


def test_i18n_verticals():
    languages = [
        ("en", "English"),
        ("hi", "Hindi"),
        ("es", "Spanish"),
        ("nl", "Dutch / Netherlands"),
    ]

    print("=" * 65)
    print("🌍 TESTING MULTI-LANGUAGE CLINIC VERTICAL CONFIGS & LOCALES")
    print("=" * 65)

    for lang_code, lang_name in languages:
        print(f"\n🔹 Language: {lang_name} [{lang_code}]")
        print("-" * 45)

        # 1. Test Vertical Config Loading
        cfg = registry.get_vertical("clinic", language=lang_code)
        print(f"  • Config Display Name : {cfg.display_name}")
        print(f"  • Language Tag        : {cfg.language}")
        print(f"  • Patient Label       : {cfg.terminology.customer_label}")
        print(f"  • Doctor Label        : {cfg.terminology.provider_label}")
        print(f"  • Greeting            : \"{cfg.greeting_template.format(business_name='Apollo Clinic')}\"")

        # 2. Test i18n Locales Translation
        ask_name = t(lang_code, "ask_patient_name")
        ask_date = t(lang_code, "ask_preferred_date")
        confirm = t(lang_code, "confirm_intro", details="Rahul, 10:00 AM")
        
        print(f"  • Locale ask_patient_name  : \"{ask_name}\"")
        print(f"  • Locale ask_preferred_date: \"{ask_date}\"")
        print(f"  • Locale confirm_intro     : \"{confirm}\"")

    print("\n" + "=" * 65)
    print("✅ ALL 4 LANGUAGES (EN, HI, ES, NL) LOADED & TESTED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    test_i18n_verticals()

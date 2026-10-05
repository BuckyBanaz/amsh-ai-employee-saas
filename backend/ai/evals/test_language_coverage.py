"""Every language the system offers has every fallback line, with the same placeholders as English.

The receptionist's words come from the LLM. Fixed lines are only spoken when the model is down or too slow, and then they must
exist in the caller's language: a language pack (ai/locales/lexicon/<code>.json) is what makes a language available, so each one
needs its pack strings and its legacy-engine templates (ai/locales/<code>.json). This test fails the moment a key or a
placeholder is missing, so a new language cannot ship half-translated."""

import json
import string
import unittest
from pathlib import Path

from backend.ai.lexicon import language_pack, pack_languages
from backend.ai.prompts import load_prompts

LOCALES = Path(__file__).resolve().parents[1] / "locales"


def placeholders(text: str) -> set:
    return {name for _, name, _, _ in string.Formatter().parse(text) if name}


class LanguageCoverage(unittest.TestCase):
    def setUp(self):
        self.languages = pack_languages()
        self.english = json.loads((LOCALES / "en.json").read_text(encoding="utf-8"))

    def test_the_seven_languages_are_offered(self):
        self.assertEqual(sorted(self.languages), ["ar", "de", "en", "es", "fr", "hi", "nl"])

    def test_every_language_has_every_legacy_template_with_the_same_placeholders(self):
        for code in self.languages:
            path = LOCALES / f"{code}.json"
            self.assertTrue(path.exists(), f"{code}: no ai/locales/{code}.json")
            local = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(set(local) - set(self.english), set(), f"{code}: keys English does not have")
            self.assertEqual(set(self.english) - set(local), set(), f"{code}: missing keys")
            for key, text in self.english.items():
                self.assertTrue(str(local[key]).strip(), f"{code}.{key} is empty")
                self.assertEqual(placeholders(local[key]), placeholders(text), f"{code}.{key}: placeholders differ from English")

    def test_every_pack_has_the_engine_lines_and_fillers(self):
        english = language_pack("en")
        for code in self.languages:
            pack = language_pack(code)
            for section in ("strings", "fillers"):
                missing = set(english[section]) - set(pack.get(section) or {})
                self.assertEqual(missing, set(), f"{code}: pack '{section}' is missing keys English has")
            for key, text in pack["strings"].items():
                self.assertTrue(text.strip(), f"{code}.strings.{key} is empty")

    def test_every_llm_worded_moment_has_a_fixed_fallback(self):
        """Each `spoken_line` the model words (engine_notes.json) has a line to fall back on in every language."""
        kinds = {k for k in load_prompts("engine_notes")["spoken_line"] if k not in ("_about", "common", "no_numbers")}
        fallback_key = {"front_desk": "transfer_generic"}  # a plain human request falls back to the legacy template
        for code in self.languages:
            strings = language_pack(code)["strings"]
            local = json.loads((LOCALES / f"{code}.json").read_text(encoding="utf-8"))
            for kind in kinds:
                key = fallback_key.get(kind, kind)
                self.assertTrue(strings.get(key) or local.get(key), f"{code}: no fallback line for '{kind}'")

    def test_fixed_lines_come_in_the_callers_language(self):
        from backend.ai.engine.conversation.i18n import t
        from backend.server.services.whatsapp_agent import trouble_reply

        for code in self.languages:
            self.assertEqual(trouble_reply(code), t(code, "llm_down_chat"))
            if code != "en":
                self.assertNotEqual(t(code, "llm_down_chat"), t("en", "llm_down_chat"), code)
                self.assertNotEqual(t(code, "transfer_generic"), t("en", "transfer_generic"), code)
        self.assertEqual(trouble_reply("fr-FR"), t("fr", "llm_down_chat"))


if __name__ == "__main__":
    unittest.main()

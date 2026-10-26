"""The healthcare (clinic) agent is unchanged by the multi-vertical work: the live render equals the golden captured before it,
character for character (system prompts, tool schemas, booking order, controller notes, engine messages, greetings)."""

import json
import unittest

from backend.ai.evals.clinic_golden import GOLDEN_PATH, render


class ClinicGolden(unittest.TestCase):
    maxDiff = None

    @classmethod
    def setUpClass(cls):
        cls.golden = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
        cls.live = render()

    def test_booking_order_and_tool_schemas(self):
        self.assertEqual(self.live["slot_order"], self.golden["slot_order"])
        self.assertEqual(self.live["tool_schemas"], self.golden["tool_schemas"])

    def test_every_settings_combination_renders_the_same_prompt_tools_and_greeting(self):
        self.assertEqual(sorted(self.live["settings"]), sorted(self.golden["settings"]))
        for label, expected in self.golden["settings"].items():
            with self.subTest(label):
                self.assertEqual(self.live["settings"][label], expected)

    def test_controller_notes_on_a_scripted_booking(self):
        self.assertEqual(self.live["controller_script"], self.golden["controller_script"])

    def test_model_facing_engine_messages(self):
        # every message that existed is unchanged; messages added for new verticals' tools may appear (clinic never reaches them)
        self.assertEqual({k: self.live["engine_messages"].get(k) for k in self.golden["engine_messages"]}, self.golden["engine_messages"])


if __name__ == "__main__":
    unittest.main()

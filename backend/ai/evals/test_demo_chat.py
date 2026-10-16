"""The landing page's live demo: the real agent engine answers on a made-up clinic, in test mode, rate limited, and a model
outage is reported (503) so the page shows its own preview instead of a fixed answer pretending to be the AI."""

import asyncio
import unittest

from backend.ai.evals.test_agent_core import ScriptedBackend, call, reply


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


class DemoChatService(unittest.TestCase):
    def _demo(self, *responses):
        from backend.server.services.demo_chat import DemoChat

        backend = ScriptedBackend(*responses)
        return DemoChat(backend_factory=lambda: backend), backend

    def test_the_model_answers_with_the_demo_clinics_real_data(self):
        demo, backend = self._demo(reply("Dental cleaning is 90 dollars with Dr. Raj Mehta. Would you like to book it?"))
        out = run(demo.turn("v1", "how much is a dental cleaning?"))
        self.assertIn("Dr. Raj Mehta", out.reply)
        system = backend.seen[0]["messages"][0]["content"]
        self.assertIn("Sunrise Family & Dental Clinic", system)  # the demo clinic, never a real one
        self.assertIn("Dental Cleaning", system)

    def test_a_booking_stays_in_test_mode(self):
        from backend.server.database.models.transaction import Transaction
        from backend.server.services.demo_chat import demo_db

        demo, _ = self._demo(
            call("book_appointment", patient_name="Ann", phone_number="+12125550100", service_name="General Consultation",
                 date="tomorrow", time="10:00 AM", confirmed_by_caller=True),
            reply("All right, I have noted that for you."),
        )
        out = run(demo.turn("v2", "Book me tomorrow at 10 AM for a general consultation, I'm Ann, number +1 212 555 0100, yes confirm"))
        with demo_db()() as db:
            self.assertEqual(db.query(Transaction).count(), 0)  # nothing written, even in the demo's own database
        self.assertIsInstance(out.actions, list)

    def test_conversations_keep_context_and_have_a_turn_limit(self):
        from backend.server.services import demo_chat as mod

        demo, backend = self._demo(*[reply("Sure, happy to help with that today.") for _ in range(4)])
        saved = mod.MAX_TURNS
        mod.MAX_TURNS = 2
        try:
            run(demo.turn("v3", "hello"))
            run(demo.turn("v3", "what are your hours?"))
            self.assertEqual([m["role"] for m in backend.seen[1]["messages"]].count("user"), 2)  # history carried
            with self.assertRaises(mod.DemoUnavailable):
                run(demo.turn("v3", "and on Sunday?"))
        finally:
            mod.MAX_TURNS = saved

    def test_a_model_outage_is_not_dressed_up_as_an_answer(self):
        from backend.ai.engine.agent.llm_backend import LLMUnavailable
        from backend.server.services.demo_chat import DemoUnavailable

        demo, _ = self._demo(LLMUnavailable("down"))
        with self.assertRaises(DemoUnavailable):
            run(demo.turn("v4", "hello"))

    def test_daily_budget(self):
        from backend.server.services import demo_chat as mod

        demo, _ = self._demo(reply("Hello there, how can I help you today?"))
        demo._turns_today = mod.DAILY_TURNS
        with self.assertRaises(mod.DemoUnavailable):
            run(demo.turn("v5", "hello"))


class DemoChatRoute(unittest.TestCase):
    def setUp(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from backend.server.api.routes import demo as route
        from backend.server.common import ratelimit
        from backend.server.services.demo_chat import DemoChat

        ratelimit.reset()
        self.backend = ScriptedBackend(*[reply("Hello! I am Ava at Sunrise clinic, how can I help?") for _ in range(20)])
        self.saved = route.demo_chat
        route.demo_chat = DemoChat(backend_factory=lambda: self.backend)
        self.route = route
        app = FastAPI()
        app.include_router(route.router)
        self.client = TestClient(app)

    def tearDown(self):
        self.route.demo_chat = self.saved

    def test_answers_without_a_login_and_is_rate_limited_per_ip(self):
        r = self.client.post("/api/public/demo-chat", json={"message": "hi", "conversation_id": "abc"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual((r.json()["reply"][:6], r.json()["conversation_id"]), ("Hello!", "abc"))
        codes = [self.client.post("/api/public/demo-chat", json={"message": "hi", "conversation_id": f"c{i}"}).status_code for i in range(10)]
        self.assertIn(429, codes)

    def test_long_or_empty_messages_are_refused(self):
        self.assertEqual(self.client.post("/api/public/demo-chat", json={"message": ""}).status_code, 422)
        self.assertEqual(self.client.post("/api/public/demo-chat", json={"message": "x" * 301}).status_code, 422)

    def test_an_outage_is_a_503(self):
        from backend.ai.engine.agent.llm_backend import LLMUnavailable
        from backend.server.services.demo_chat import DemoChat

        self.route.demo_chat = DemoChat(backend_factory=lambda: ScriptedBackend(LLMUnavailable("down")))
        self.assertEqual(self.client.post("/api/public/demo-chat", json={"message": "hi"}).status_code, 503)


if __name__ == "__main__":
    unittest.main()

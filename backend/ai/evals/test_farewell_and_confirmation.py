"""The agent ends the call when the caller says goodbye (any packed language), and can text the appointment details on request."""

import unittest
from unittest import mock

from backend.ai.evals.test_agent_core import BOOK, CALLER_SAID, ScriptedBackend, call, make_engine, reply, run


class Farewell(unittest.TestCase):
    def _turn(self, said, answer):
        engine, _ = make_engine(ScriptedBackend(reply(answer)))
        return run(engine.turn(said))

    def test_a_goodbye_ends_the_call_even_when_the_model_forgets_end_call(self):
        for said, answer in (("good night", "Good night! Take care."), ("chal chhodo good night", "Good night, take care."),
                             ("hi ok good bye Sara kal baat karte hain, call cut kar sakti ho", "Goodbye! We can speak again tomorrow.")):
            self.assertTrue(self._turn(said, answer).hangup, said)

    def test_a_question_or_an_ordinary_sentence_never_ends_the_call(self):
        self.assertFalse(self._turn("what time do you open?", "We open at nine.").hangup)
        self.assertFalse(self._turn("I would like to book an appointment tomorrow morning", "Sure, which service?").hangup)

    def test_a_goodbye_whose_reply_asks_something_keeps_the_call_open(self):
        self.assertFalse(self._turn("bye", "Before you go, shall I send your details by SMS?").hangup)

    def test_goodbyes_in_other_languages_are_recognised(self):
        from backend.ai.engine.agent.hindi import caller_is_leaving

        for text in ("adiós", "hasta luego", "au revoir", "auf Wiedersehen", "tot ziens", "مع السلامة", "अलविदा", "por favor cuelgue"):
            self.assertTrue(caller_is_leaving(text), text)


class SendConfirmation(unittest.TestCase):
    def setUp(self):
        self.engine, self.factory = make_engine(ScriptedBackend())
        self.tb, self.gate = self.engine.toolbox, self.engine.gate
        self.tb.said = list(CALLER_SAID)
        self.gate.turn = 1
        run(self.tb.execute("book_appointment", {**BOOK, "confirmed_by_caller": False}))
        self.gate.turn = 2
        run(self.tb.execute("book_appointment", {**BOOK, "confirmed_by_caller": True}))
        self.sent = []

    def _send(self, **args):
        def fake(db, event_key, **kw):
            self.sent.append((event_key, kw))
            return {"sent": True, "attempts": [{"channel": (kw.get("only_channels") or ["sms"])[0], "sent": True}]}

        with mock.patch("backend.server.notifications.messenger.send_event_sync", fake):
            return run(self.tb.execute("send_confirmation", args))

    def test_it_sends_the_clinics_booking_confirmed_message_on_the_channel_asked_for(self):
        r = self._send(channel="whatsapp")
        self.assertEqual((r["code"], r["channel"]), ("sent", "whatsapp"))
        event, kw = self.sent[0]
        self.assertEqual(event, "booking.confirmed")
        self.assertEqual(kw["only_channels"], ["whatsapp"])
        self.assertTrue(kw["phone"].endswith("9876543210"))
        self.assertTrue(kw["context"].get("service"))

    def test_it_only_sends_appointments_booked_under_that_phone_number(self):
        r = self._send(phone_number="9000000000")
        self.assertEqual(r["code"], "no_appointment")
        self.assertEqual(self.sent, [])

    def test_it_is_capped_and_reports_a_failed_send_honestly(self):
        self._send()
        self._send()
        self.assertEqual(self._send()["code"], "limit")
        self.tb.confirmations_sent = 0
        with mock.patch("backend.server.notifications.messenger.send_event_sync", lambda db, e, **kw: {"sent": False, "attempts": [{"channel": "whatsapp", "sent": False, "reason": "WhatsApp is not connected"}]}):
            r = run(self.tb.execute("send_confirmation", {}))
        self.assertEqual(r["code"], "not_sent")
        self.assertIn("WhatsApp is not connected", r["message"])

    def test_a_test_call_sends_nothing(self):
        self.tb.dry_run = True
        r = self._send()
        self.assertEqual(r["code"], "dry_run")
        self.assertEqual(self.sent, [])

    def test_the_clinic_can_switch_it_off(self):
        on, _ = make_engine(ScriptedBackend())
        from backend.ai.engine.agent.agent_loop import AgentEngine
        from backend.ai.engine.agent.facts import load_all
        from backend.ai.evals.fixtures import make_db_factory
        from backend.ai.verticals import registry as vertical_registry

        factory, biz = make_db_factory()
        facts, _profile = load_all(factory, biz)
        off = AgentEngine(business_id=biz, caller_number="+919876543210", call_id=None, facts=facts, vertical_config=vertical_registry.get_vertical("clinic"),
                          backend=ScriptedBackend(), db_factory=factory, agent_name="Maya", capabilities={"messages": False})
        names = lambda e: [t["function"]["name"] for t in e.tools]
        self.assertIn("send_confirmation", names(on))
        self.assertNotIn("send_confirmation", names(off))
        self.assertEqual(run(off.toolbox.execute("send_confirmation", {}))["code"], "disabled")

    def test_the_model_is_offered_the_tool(self):
        from backend.ai.engine.agent.toolbox import TOOL_SCHEMAS

        self.assertIn("send_confirmation", [t["function"]["name"] for t in TOOL_SCHEMAS])


if __name__ == "__main__":
    unittest.main()

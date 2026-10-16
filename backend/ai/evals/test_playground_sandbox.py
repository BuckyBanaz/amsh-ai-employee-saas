"""Playground test mode: the agent books, finds, moves and cancels inside one test conversation, and nothing reaches the clinic."""

import unittest
from types import SimpleNamespace

from backend.ai.engine.agent.sandbox import SandboxLedger
from backend.ai.evals.test_agent_core import BOOK, CALLER_SAID, ScriptedBackend, make_engine, run
from backend.server.database.models.transaction import Transaction


class SandboxFlow(unittest.TestCase):
    def setUp(self):
        self.ledger = SandboxLedger()
        self.engine, self.factory = make_engine(ScriptedBackend(), sandbox=self.ledger)
        self.tb, self.gate = self.engine.toolbox, self.engine.gate
        self.tb.said = list(CALLER_SAID)

    def run_tool(self, name, **args):
        return run(self.tb.execute(name, args))

    def db_rows(self):
        with self.factory() as db:
            return db.query(Transaction).all()

    def book(self):
        self.gate.turn = 1
        self.assertEqual(self.run_tool("book_appointment", **BOOK, confirmed_by_caller=False)["code"], "needs_confirmation")
        self.gate.turn = 2
        return self.run_tool("book_appointment", **BOOK, confirmed_by_caller=True)

    def test_booking_is_recorded_in_the_ledger_and_never_in_the_database(self):
        r = self.book()
        self.assertEqual(r["code"], "booked")
        self.assertTrue(r["appointment_id"].startswith("sandbox-"))
        self.assertEqual(self.db_rows(), [])
        self.assertEqual([a["kind"] for a in self.ledger.snapshot()], ["book"])

    def test_the_agent_can_find_move_and_cancel_its_own_test_booking(self):
        self.book()
        found = self.run_tool("lookup_appointment", phone_number="9876543210")
        self.assertEqual(len(found["appointments"]), 1)  # the ledger row is visible to later tool calls
        self.gate.turn = 3
        self.tb.said.append("make it Thursday at 11 AM")
        self.run_tool("reschedule_appointment", ref="A1", new_date="Thursday", new_time="11:00 AM", confirmed_by_caller=False)
        self.gate.turn = 4
        r = self.run_tool("reschedule_appointment", ref="A1", new_date="Thursday", new_time="11:00 AM", confirmed_by_caller=True)
        self.assertEqual(r["code"], "rescheduled", r)
        self.gate.turn = 5
        self.run_tool("cancel_appointment", ref="A1", confirmed_by_caller=False)
        self.gate.turn = 6
        self.assertEqual(self.run_tool("cancel_appointment", ref="A1", confirmed_by_caller=True)["code"], "cancelled")
        self.assertEqual([a["kind"] for a in self.ledger.snapshot()], ["book", "reschedule", "cancel"])
        self.assertEqual(self.db_rows(), [])
        self.assertEqual(self.run_tool("lookup_appointment", phone_number="9876543210")["appointments"], [])  # cancelled in the ledger

    def test_a_real_appointment_is_visible_but_changing_it_only_patches_a_copy(self):
        with self.factory() as db:
            from backend.ai.capabilities.operations.clinic import ClinicWriteOperations

            real = ClinicWriteOperations.store_appointment(db, "eval-biz-0001", "Real Patient", "9876543210", preferred_date="2026-10-01", preferred_time="10:00 AM")
        found = self.run_tool("lookup_appointment", phone_number="9876543210")
        self.assertEqual(len(found["appointments"]), 1)  # the clinic's real data is readable
        self.tb.said.append("cancel it")
        self.gate.turn = 3
        self.run_tool("cancel_appointment", ref="A1", confirmed_by_caller=False)
        self.gate.turn = 4
        self.assertEqual(self.run_tool("cancel_appointment", ref="A1", confirmed_by_caller=True)["code"], "cancelled")
        with self.factory() as db:
            self.assertEqual(db.get(Transaction, real["id"]).status, "confirmed")  # the real row was not touched

    def test_transfers_are_recorded_not_placed(self):
        self.tb.last_utterance = "I want to talk to a human"
        r = self.run_tool("transfer_to_human", department="front_desk", reason="asked")
        self.assertEqual(r["code"], "dry_run")
        self.assertEqual(self.ledger.snapshot()[-1]["kind"], "transfer")

    def test_without_a_sandbox_bookings_are_still_real(self):
        engine, factory = make_engine(ScriptedBackend())
        tb = engine.toolbox
        tb.said = list(CALLER_SAID)
        engine.gate.turn = 1
        run(tb.execute("book_appointment", {**BOOK, "confirmed_by_caller": False}))
        engine.gate.turn = 2
        run(tb.execute("book_appointment", {**BOOK, "confirmed_by_caller": True}))
        with factory() as db:
            self.assertEqual(len(db.query(Transaction).all()), 1)


class PlaygroundSession(unittest.TestCase):
    def test_a_playground_call_id_is_always_a_test_call(self):
        from backend.ai.realtime.twilio import gateway as gw

        self.assertEqual(gw.as_test_call_id("real_looking_id"), "sim_real_looking_id")
        for ok in ("studio_a", "webcall_b", "sim_c", "test_call_d"):
            self.assertEqual(gw.as_test_call_id(ok), ok)

    def test_the_response_says_it_is_test_mode_and_lists_what_would_have_happened(self):
        from backend.ai.realtime.twilio import gateway as gw
        from unittest.mock import patch

        ledger = SandboxLedger()
        ledger.record("book", "Would book X")
        rt = SimpleNamespace(engine=SimpleNamespace(language_pref=None, sandbox=ledger))
        sm = SimpleNamespace(sequence=0, current_state=SimpleNamespace(value="x"), collected_slots={})
        turn = SimpleNamespace(reply="ok", transferred=False, hangup=False, provider="groq", latency_ms=1, first_sentence_ms=1)
        payload = gw.VoiceSimulateRequest(business_id="b", user_transcript="hi", call_id="sim_1")
        with patch.object(gw, "get_sim_runtime", lambda cid: rt), patch.object(gw, "record_call_turn", lambda **kw: None):
            out = gw._finish_agent_turn("sim_1", sm, payload, turn)
        self.assertTrue(out["test_mode"])
        self.assertEqual(out["test_actions"][0]["kind"], "book")


if __name__ == "__main__":
    unittest.main()

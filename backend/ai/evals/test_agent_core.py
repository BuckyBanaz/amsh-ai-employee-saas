"""Deterministic tests for the LLM agent core (no network, no API key).
Run:  python -m unittest backend.ai.evals.test_agent_core -v
These test the *guarantees* code enforces around the LLM: date/time parsing, real availability,
the read-back -> confirm protocol, ownership checks, safety gate, tool-round budget and streaming.
LLM answer quality is measured separately by the eval runner (--engine agent --live)."""

import asyncio
import json
import unittest
from datetime import date, time

from backend.ai.engine.agent.agent_loop import AgentEngine, SentenceSplitter, clean_for_speech
from backend.ai.engine.agent.datetime_utils import parse_date, parse_time
from backend.ai.engine.agent.facts import load_all
from backend.ai.engine.agent.llm_backend import LLMUnavailable, parse_sse_line
from backend.ai.evals.fixtures import FIXED_NOW, make_db_factory
from backend.ai.verticals.registry import registry as vertical_registry

TODAY = date(2026, 9, 28)  # Monday


def run(coro):
    return asyncio.run(coro)


class ScriptedBackend:
    """Fake LLM: returns pre-written responses in order and records what it was asked."""

    def __init__(self, *responses):
        self.responses = list(responses)
        self.seen = []

    def _next(self, messages, tools):
        self.seen.append({"messages": messages, "tools": tools})
        if not self.responses:
            raise AssertionError("LLM was called more times than scripted")
        r = self.responses.pop(0)
        if isinstance(r, Exception):
            raise r
        return r

    async def chat(self, messages, tools):
        return self._next(messages, tools)

    async def chat_stream(self, messages, tools):
        r = self._next(messages, tools)
        text = r["content"] or ""
        for i in range(0, len(text), 7):
            yield {"type": "text", "delta": text[i : i + 7]}
        yield {"type": "final", "content": text or None, "tool_calls": r["tool_calls"]}


def reply(text):
    return {"content": text, "tool_calls": []}


def call(name, **args):
    return {"content": None, "tool_calls": [{"id": f"c_{name}", "name": name, "arguments": json.dumps(args)}]}


def make_engine(backend, caller="+919876543210"):
    factory, biz = make_db_factory()
    facts, profile = load_all(factory, biz)
    engine = AgentEngine(
        business_id=biz,
        caller_number=caller,
        call_id=None,
        facts=facts,
        vertical_config=vertical_registry.get_vertical("clinic"),
        backend=backend,
        db_factory=factory,
        agent_name=profile.name,
        gender=profile.gender,
        now_fn=lambda: FIXED_NOW,
    )
    return engine, factory


BOOK = dict(
    patient_name="Parikshit Verma",
    phone_number="9876543210",
    preferred_date="tomorrow",
    preferred_time="10:00 AM",
    service_name="General Consultation",
    doctor_name="Dr. Sharma",
)


class DateTimeParsing(unittest.TestCase):
    def test_dates(self):
        self.assertEqual(parse_date("tomorrow", TODAY), date(2026, 9, 29))
        self.assertEqual(parse_date("kal", TODAY), date(2026, 9, 29))
        self.assertEqual(parse_date("Thursday", TODAY), date(2026, 10, 1))
        self.assertEqual(parse_date("Monday", TODAY), date(2026, 10, 5))  # same weekday means next week
        self.assertEqual(parse_date("3rd October", TODAY), date(2026, 10, 3))
        self.assertEqual(parse_date("2026-10-03", TODAY), date(2026, 10, 3))
        self.assertEqual(parse_date("03/10", TODAY), date(2026, 10, 3))
        self.assertIsNone(parse_date("next week", TODAY))
        self.assertIsNone(parse_date("whenever", TODAY))

    def test_times(self):
        self.assertEqual(parse_time("5 pm"), time(17, 0))
        self.assertEqual(parse_time("5:30 PM"), time(17, 30))
        self.assertEqual(parse_time("17:30"), time(17, 30))
        self.assertEqual(parse_time("12 AM"), time(0, 0))
        self.assertIsNone(parse_time("5"))  # ambiguous: the agent must ask AM/PM
        self.assertIsNone(parse_time("morning"))


class Availability(unittest.TestCase):
    def setUp(self):
        self.engine, self.factory = make_engine(ScriptedBackend())
        self.tb = self.engine.toolbox
        self.tb.said = ["Sunday 2026-10-04", "today", "tomorrow", "10 AM", "8 PM"]  # days the caller actually named

    def test_closed_on_sunday(self):
        r = run(self.tb.execute("check_availability", {"date": "2026-10-04"}))
        self.assertFalse(r["open"])

    def test_today_hides_past_slots(self):
        r = run(self.tb.execute("check_availability", {"date": "today"}))
        self.assertTrue(all(t >= "10:30 AM" or t.endswith("PM") for t in r["open_slots"]), r)

    def test_specific_time_free_and_outside_hours(self):
        ok = run(self.tb.execute("check_availability", {"date": "tomorrow", "time": "10 AM"}))
        self.assertTrue(ok["requested_time_free"])
        late = run(self.tb.execute("check_availability", {"date": "tomorrow", "time": "8 PM"}))
        self.assertFalse(late["requested_time_free"])
        self.assertEqual(late["reason"], "outside_hours")

    def test_unconfigured_hours_never_invents_availability(self):
        self.tb.facts.working_hours = {}
        r = run(self.tb.execute("check_availability", {"date": "tomorrow"}))
        self.assertFalse(r["configured"])
        self.assertNotIn("open_slots", r)


CALLER_SAID = [
    "I want an appointment",
    "Parikshit Verma", "Anita Rao", "9876543210", "9123456780",
    "tomorrow at 10 AM", "Sunday 2026-10-04", "8 PM", "5", "2026-09-27", "today 9 AM", "whenever",
    "general consultation with Dr Sharma", "Wednesday at 2 PM", "10 AM",
]


class BookingProtocol(unittest.TestCase):
    def setUp(self):
        self.engine, self.factory = make_engine(ScriptedBackend())
        self.tb, self.gate = self.engine.toolbox, self.engine.gate
        self.tb.said = list(CALLER_SAID)  # tools check values against what the caller said; seed a full conversation

    def book(self, confirmed, **over):
        return run(self.tb.execute("book_appointment", {**BOOK, **over, "confirmed_by_caller": confirmed}))

    def rows(self):
        from backend.server.database.models.transaction import Transaction

        with self.factory() as db:
            return db.query(Transaction).all()

    def test_cannot_commit_without_readback(self):
        self.gate.turn = 1
        r = self.book(True)
        self.assertEqual(r["code"], "no_matching_readback")
        self.assertEqual(self.rows(), [])

    def test_cannot_commit_in_same_turn_as_readback(self):
        self.gate.turn = 1
        self.assertEqual(self.book(False)["code"], "needs_confirmation")
        self.assertEqual(self.book(True)["code"], "caller_not_responded")
        self.assertEqual(self.rows(), [])

    def test_full_flow_books_once(self):
        self.gate.turn = 1
        self.assertEqual(self.book(False)["code"], "needs_confirmation")
        self.gate.turn = 2  # caller said yes
        r = self.book(True)
        self.assertEqual(r["code"], "booked")
        rows = self.rows()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].details["preferred_date"], "2026-09-29")  # exact date, never "tomorrow"
        self.assertEqual(rows[0].details["preferred_time"], "10:00 AM")
        self.gate.turn = 3
        self.assertEqual(self.book(True)["code"], "already_booked")  # idempotent
        self.assertEqual(len(self.rows()), 1)

    def test_changed_details_need_new_readback(self):
        self.gate.turn = 1
        self.book(False)
        self.gate.turn = 2
        r = self.book(True, preferred_time="2:00 PM")  # a time the caller did say, but not the one read back
        self.assertEqual(r["code"], "no_matching_readback")

    def test_taken_slot_offers_alternatives(self):
        self.gate.turn = 1
        self.book(False)
        self.gate.turn = 2
        self.book(True)
        self.gate.turn = 3
        r = self.book(False, patient_name="Anita Rao", phone_number="9123456780")
        self.assertEqual(r["code"], "slot_taken")
        self.assertTrue(r["alternatives"])

    def test_rejections(self):
        self.gate.turn = 1
        self.assertEqual(self.book(False, preferred_date="2026-10-04")["code"], "closed")  # Sunday
        self.assertEqual(self.book(False, preferred_time="8 PM")["code"], "outside_hours")
        self.assertEqual(self.book(False, preferred_time="5")["code"], "bad_time")
        self.assertEqual(self.book(False, preferred_date="whenever")["code"], "bad_date")
        self.assertEqual(self.book(False, doctor_name="Dr. Nobody")["code"], "unknown_doctor")
        self.assertEqual(self.book(False, service_name="Hair Transplant")["code"], "unknown_service")
        self.assertEqual(self.book(False, phone_number="123")["code"], "bad_phone")
        self.assertEqual(self.book(False, patient_name="")["code"], "missing_fields")
        self.assertEqual(self.book(False, preferred_date="2026-09-27")["code"], "past_date")
        self.assertEqual(self.book(False, preferred_date="today", preferred_time="9 AM")["code"], "past_time")
        self.assertEqual(self.rows(), [])

    def test_dry_run_persists_nothing(self):
        self.tb.dry_run = True
        self.gate.turn = 1
        self.book(False)
        self.gate.turn = 2
        self.assertEqual(self.book(True)["code"], "dry_run")
        self.assertEqual(self.rows(), [])

    def test_bad_json_arguments_are_reported_not_raised(self):
        r = run(self.tb.execute("book_appointment", "{not json"))
        self.assertEqual(r["code"], "bad_arguments")


class BookingGrounding(unittest.TestCase):
    """A booking value the caller never said is a guess; it must be refused before any read-back."""

    def setUp(self):
        self.engine, _ = make_engine(ScriptedBackend())
        self.tb, self.gate = self.engine.toolbox, self.engine.gate
        self.gate.turn = 1

    def book(self, said, **over):
        self.tb.said = said
        return run(self.tb.execute("book_appointment", {**BOOK, **over, "confirmed_by_caller": False}))["code"]

    def test_full_details_from_caller_pass(self):
        self.assertEqual(self.book(["Parikshit Verma, 9876543210, tomorrow at 10 AM, general consultation"]), "needs_confirmation")

    def test_each_invented_value_is_refused(self):
        full = ["Parikshit Verma", "9876543210", "tomorrow", "10 AM"]
        self.assertEqual(self.book(["My name is Kalpana"], patient_name="Kalpana"), "not_from_caller")  # only a name so far
        self.tb.caller_number = "+910000000000"  # (the caller's own calling number is allowed; use a different one)
        self.assertEqual(self.book(full[:1] + full[2:]), "not_from_caller")  # no phone number given
        self.assertEqual(self.book(full[:2] + full[3:]), "not_from_caller")  # no date given
        self.assertEqual(self.book(full[:3]), "not_from_caller")  # no time given
        self.assertEqual(self.book(full, patient_name="Ravi Kumar"), "not_from_caller")  # different name
        self.assertEqual(self.book(full, preferred_date="Thursday"), "not_from_caller")  # date the caller never said

    def test_caller_can_use_the_number_they_are_calling_from_only_after_agreeing(self):
        said = ["Parikshit Verma", "tomorrow", "10 AM"]
        self.assertEqual(self.book(said, phone_number="+91 98765 43210"), "not_from_caller")  # model assumed it silently
        self.tb.caller_number_ok = True  # the caller said "same number" / said yes to our offer
        self.assertEqual(self.book(said, phone_number="+91 98765 43210"), "needs_confirmation")

    def test_spoken_word_digits_spelled_names_and_split_numbers(self):
        said = ["P A R I K S H I T  V E R M A", "nine eight seven six five", "four three two one zero", "tomorrow", "10 AM"]
        self.assertEqual(self.book(said), "needs_confirmation")

    def test_llm_that_guesses_a_slot_is_stopped_end_to_end(self):
        guess = call("book_appointment", **{**BOOK, "patient_name": "Kalpana", "confirmed_by_caller": False})
        backend = ScriptedBackend(guess, reply("May I have your phone number and a preferred day?"))
        engine, _ = make_engine(backend)
        out = run(engine.turn("My name is Kalpana"))
        tool_msg = json.loads(backend.seen[1]["messages"][-1]["content"])
        self.assertEqual(tool_msg["code"], "not_from_caller")
        self.assertNotIn("Saturday", out.reply)


class DayGrounding(unittest.TestCase):
    """The agent may not pick a day for the caller (it once announced 'closed on Sunday' after just a name)."""

    def setUp(self):
        self.engine, _ = make_engine(ScriptedBackend())
        self.tb = self.engine.toolbox

    def avail(self, date):
        return run(self.tb.execute("check_availability", {"date": date}))

    def test_guessed_day_is_refused(self):
        self.tb.said = ["My name is Kalpana"]
        self.tb.last_utterance = "My name is Kalpana"
        r = self.avail("Thursday")
        self.assertEqual(r["code"], "not_from_caller")
        self.assertEqual(r["field"], "date")

    def test_day_the_caller_named_is_allowed(self):
        self.tb.said = ["can I come on Thursday?"]
        self.tb.last_utterance = "can I come on Thursday?"
        self.assertTrue(self.avail("Thursday")["ok"])

    def test_a_yes_accepts_the_day_we_proposed(self):
        self.tb.said = ["I need an appointment", "sure"]
        self.tb.last_utterance = "sure"
        self.tb.last_assistant = "The clinic is closed tomorrow. How about Thursday?"
        self.assertTrue(self.avail("Thursday")["ok"])

    def test_a_non_yes_does_not_accept_it(self):
        self.tb.said = ["I need an appointment", "hmm, not sure"]
        self.tb.last_utterance = "hmm, not sure"
        self.tb.last_assistant = "How about Thursday?"
        self.assertEqual(self.avail("Thursday")["code"], "not_from_caller")

    def test_affirmative_detection(self):
        from backend.ai.engine.agent.validator import is_affirmative as yes

        for y in ("yes please", "Sure!", "haan theek hai", "sounds good", "OK"):
            self.assertTrue(yes(y), y)
        for n in ("no", "Thursday please", "maybe later", "who are you"):
            self.assertFalse(yes(n), n)


class CancelAndReschedule(unittest.TestCase):
    def setUp(self):
        self.engine, self.factory = make_engine(ScriptedBackend())
        self.tb, self.gate = self.engine.toolbox, self.engine.gate
        self.tb.said = list(CALLER_SAID)
        self.gate.turn = 1
        run(self.tb.execute("book_appointment", {**BOOK, "confirmed_by_caller": False}))
        self.gate.turn = 2
        run(self.tb.execute("book_appointment", {**BOOK, "confirmed_by_caller": True}))

    def test_cancel_requires_lookup(self):
        r = run(self.tb.execute("cancel_appointment", {"ref": "A1", "confirmed_by_caller": True}))
        self.assertEqual(r["code"], "lookup_first")

    def test_lookup_only_returns_that_phones_appointments(self):
        other = run(self.tb.execute("lookup_appointment", {"phone_number": "9000000000"}))
        self.assertEqual(other["appointments"], [])
        mine = run(self.tb.execute("lookup_appointment", {"phone_number": "+91 98765 43210"}))
        self.assertEqual(len(mine["appointments"]), 1)
        self.assertNotIn("patient_name", json.dumps(mine))  # no extra PII leaks

    def test_cancel_two_step(self):
        run(self.tb.execute("lookup_appointment", {"phone_number": "9876543210"}))
        self.gate.turn = 3
        self.assertEqual(run(self.tb.execute("cancel_appointment", {"ref": "A1", "confirmed_by_caller": False}))["code"], "needs_confirmation")
        self.gate.turn = 4
        self.assertEqual(run(self.tb.execute("cancel_appointment", {"ref": "A1", "confirmed_by_caller": True}))["code"], "cancelled")
        again = run(self.tb.execute("lookup_appointment", {"phone_number": "9876543210"}))
        self.assertEqual(again["appointments"], [])

    def test_reschedule_validates_new_slot(self):
        run(self.tb.execute("lookup_appointment", {"phone_number": "9876543210"}))
        self.gate.turn = 3
        r = run(self.tb.execute("reschedule_appointment", {"ref": "A1", "new_date": "2026-10-04", "new_time": "10 AM", "confirmed_by_caller": False}))
        self.assertEqual(r["code"], "closed")
        args = {"ref": "A1", "new_date": "Wednesday", "new_time": "2 PM"}
        self.assertEqual(run(self.tb.execute("reschedule_appointment", {**args, "confirmed_by_caller": False}))["code"], "needs_confirmation")
        self.gate.turn = 4
        self.assertEqual(run(self.tb.execute("reschedule_appointment", {**args, "confirmed_by_caller": True}))["code"], "rescheduled")


class AgentLoop(unittest.TestCase):
    def test_prompt_contains_tenant_facts_and_identity(self):
        engine, _ = make_engine(ScriptedBackend())
        p = engine._system
        for needle in ("Maya", "Sanjeevani Clinic", "Dr. Sharma", "Dental Cleaning", "Monday, 28 September 2026", "female", "Sun closed", "if unclear use English", "SMALL TALK", "kaise ho", "PERSONALITY: warm, cheerful"):
            self.assertIn(needle, p)

    def test_plain_reply_no_tools(self):
        backend = ScriptedBackend(reply("I am Maya, the AI receptionist at Sanjeevani Clinic."))
        engine, _ = make_engine(backend)
        out = run(engine.turn("who are you"))
        self.assertIn("Maya", out.reply)
        self.assertEqual(out.tools, [])
        self.assertEqual(backend.seen[0]["messages"][0]["role"], "system")

    def test_tool_round_then_reply_and_history_kept(self):
        backend = ScriptedBackend(
            call("check_availability", date="tomorrow"),
            reply("We have ten AM open tomorrow. Shall I book it?"),
            reply("Sure."),
        )
        engine, _ = make_engine(backend)
        out = run(engine.turn("anything tomorrow?"))
        self.assertEqual(out.tools[0]["tool"], "check_availability")
        self.assertIn("ten AM", out.reply)
        second = backend.seen[1]["messages"]
        self.assertEqual(second[-1]["role"], "tool")  # the model saw the real tool result
        run(engine.turn("yes"))
        roles = [m["role"] for m in backend.seen[2]["messages"]]
        self.assertEqual(roles.count("user"), 2)  # history carried into the next turn

    def test_safety_gate_transfers_without_calling_llm(self):
        backend = ScriptedBackend()  # any LLM call raises AssertionError
        engine, _ = make_engine(backend)
        out = run(engine.turn("I have severe chest pain"))
        self.assertTrue(out.transferred)
        self.assertIn("emergency", out.reply.lower())
        self.assertEqual(backend.seen, [])

    def test_human_request_transfers(self):
        engine, _ = make_engine(ScriptedBackend())
        out = run(engine.turn("I want to speak to a human"))
        self.assertTrue(out.transferred)

    def test_ai_identity_question_is_not_a_transfer(self):
        backend = ScriptedBackend(reply("I'm an AI receptionist. Want me to connect you to a person?"))
        engine, _ = make_engine(backend)
        out = run(engine.turn("Are you an AI?"))
        self.assertFalse(out.transferred)

    def test_tool_round_budget_ends_gracefully(self):
        backend = ScriptedBackend(*[call("check_availability", date="tomorrow")] * 4)
        engine, _ = make_engine(backend)
        out = run(engine.turn("loop forever"))
        self.assertEqual(len(backend.seen), 4)  # 3 tool rounds + 1 forced final without tools
        self.assertEqual(backend.seen[3]["tools"], [])
        self.assertTrue(out.reply)

    def test_llm_outage_degrades_without_crashing(self):
        engine, _ = make_engine(ScriptedBackend(LLMUnavailable("down")))
        out = run(engine.turn("hello"))
        self.assertTrue(out.degraded)
        self.assertIn("front desk", out.reply)

    def test_end_call_sets_hangup(self):
        backend = ScriptedBackend(call("end_call"), reply("Goodbye, take care."))
        engine, _ = make_engine(backend)
        out = run(engine.turn("that's all, bye"))
        self.assertTrue(out.hangup)

    def test_full_booking_conversation_through_the_loop(self):
        book = lambda c: call("book_appointment", **{**BOOK, "confirmed_by_caller": c})
        backend = ScriptedBackend(
            book(False), reply("Booking General Consultation tomorrow at ten AM with Dr. Sharma. Shall I confirm?"),
            book(True), reply("All set, you're booked."),
        )
        engine, factory = make_engine(backend)
        first = run(engine.turn("book me with Dr Sharma tomorrow 10 am, general consultation, Parikshit Verma, 9876543210"))
        self.assertIn("confirm", first.reply)
        second = run(engine.turn("yes please"))
        self.assertIn("booked", second.reply)
        from backend.server.database.models.transaction import Transaction

        with factory() as db:
            self.assertEqual(db.query(Transaction).count(), 1)

    def test_llm_cannot_book_by_confirming_in_the_same_turn(self):
        book = lambda c: call("book_appointment", **{**BOOK, "confirmed_by_caller": c})
        backend = ScriptedBackend(book(False), book(True), reply("Please confirm the details."))
        engine, factory = make_engine(backend)
        run(engine.turn("book me tomorrow 10 am"))
        from backend.server.database.models.transaction import Transaction

        with factory() as db:
            self.assertEqual(db.query(Transaction).count(), 0)

    def test_streaming_yields_sentences_before_done(self):
        backend = ScriptedBackend(reply("Hello there. I am Maya, the receptionist. How can I help?"))
        engine, _ = make_engine(backend)

        async def collect():
            return [e async for e in engine.turn_events("hi", stream=True)]

        events = run(collect())
        sentences = [e["text"] for e in events if e["type"] == "sentence"]
        self.assertEqual(sentences, ["Hello there.", "I am Maya, the receptionist.", "How can I help?"])
        self.assertEqual(events[-1]["type"], "done")
        self.assertIsNotNone(events[-1]["turn"].first_sentence_ms)


class TransferGuard(unittest.TestCase):
    def setUp(self):
        self.engine, _ = make_engine(ScriptedBackend())
        self.tb, self.gate = self.engine.toolbox, self.engine.gate

    def test_explicit_request_detection(self):
        from backend.ai.engine.agent.validator import explicit_human_request as req

        for yes in ("I want to talk to a human", "connect me to the front desk", "mujhe kisi insaan se baat karni hai", "Are you a human? I want to talk to a real person"):
            self.assertTrue(req(yes), yes)
        for no in ("Are you a robot or a real person?", "Aapka naam kya hai?", "kya aap robot ho", "Who is this?", "book me tomorrow"):
            self.assertFalse(req(no), no)

    def test_llm_cannot_transfer_on_identity_question(self):
        self.tb.last_utterance = "Aapka naam kya hai?"
        self.gate.turn = 1
        r = run(self.tb.execute("transfer_to_human", {"department": "front_desk"}))
        self.assertEqual(r["code"], "needs_confirmation")
        self.assertIsNone(self.tb.pending)

    def test_transfer_after_caller_agrees(self):
        self.tb.last_utterance = "not sure"
        self.gate.turn = 1
        run(self.tb.execute("transfer_to_human", {"department": "front_desk"}))
        self.tb.last_utterance = "yes please"
        self.gate.turn = 2
        r = run(self.tb.execute("transfer_to_human", {"department": "front_desk", "confirmed_by_caller": True}))
        self.assertEqual(r["code"], "transferring")
        self.assertEqual(self.tb.pending["type"], "transfer")

    def test_explicit_request_and_emergency_skip_confirmation(self):
        self.tb.last_utterance = "please connect me to a person"
        self.gate.turn = 1
        self.assertEqual(run(self.tb.execute("transfer_to_human", {"department": "front_desk"}))["code"], "transferring")
        engine, _ = make_engine(ScriptedBackend())
        engine.toolbox.last_utterance = "hello"
        self.assertEqual(run(engine.toolbox.execute("transfer_to_human", {"department": "emergency"}))["code"], "transferring")


class Runtime(unittest.TestCase):
    def test_resolve_mode_prefers_tenant_and_defaults_to_legacy(self):
        from backend.ai.engine.agent.runtime import resolve_mode

        self.assertEqual(resolve_mode(None, None), "state_machine")
        self.assertEqual(resolve_mode(None, "shadow"), "shadow")
        self.assertEqual(resolve_mode("llm_agent", "state_machine"), "llm_agent")
        self.assertEqual(resolve_mode("nonsense", "also-nonsense"), "state_machine")

    def _runtime(self, backend):
        from backend.ai.engine.agent.runtime import AgentRuntime
        from backend.ai.engine.agent.facts import AgentProfile

        engine, _ = make_engine(backend)
        return AgentRuntime(engine, "llm_agent", AgentProfile())

    def test_run_turn_speaks_each_sentence_in_order(self):
        rt = self._runtime(ScriptedBackend(reply("Sure thing. Ten AM works. Shall I book it?")))
        said = []

        async def speak(text):
            said.append(text)
            return True

        run = asyncio.run(rt.run_turn("book me", speak))
        self.assertEqual(said, ["Sure thing.", "Ten AM works.", "Shall I book it?"])
        self.assertTrue(run.spoken_any)
        self.assertFalse(run.interrupted)

    def test_barge_in_stops_speaking_but_history_stays_consistent(self):
        backend = ScriptedBackend(reply("One. Two. Three."), reply("Okay."))
        rt = self._runtime(backend)
        said = []

        async def speak(text):
            said.append(text)
            return False  # caller interrupts during the first sentence

        run = asyncio.run(rt.run_turn("hello", speak))
        self.assertEqual(said, ["One."])  # nothing spoken after the interruption
        self.assertTrue(run.interrupted)
        self.assertEqual(len(rt.engine._turns), 1)  # the turn was still committed
        asyncio.run(rt.engine.turn("next"))
        roles = [m["role"] for m in backend.seen[1]["messages"]]
        self.assertEqual(roles.count("user"), 2)

    def test_llm_outage_speaks_nothing_so_the_gateway_can_fall_back(self):
        rt = self._runtime(ScriptedBackend(LLMUnavailable("down")))
        said = []

        async def speak(text):
            said.append(text)

        run = asyncio.run(rt.run_turn("hello", speak))
        self.assertTrue(run.turn.degraded)
        self.assertFalse(run.spoken_any)
        self.assertEqual(said, [])

    def test_shadow_mode_never_writes_or_transfers(self):
        from backend.server.database.models.transaction import Transaction

        book = lambda c: call("book_appointment", **{**BOOK, "confirmed_by_caller": c})
        backend = ScriptedBackend(book(False), reply("Confirm?"), book(True), reply("Done."))
        engine, factory = make_engine(backend)
        engine.dry_run = engine.toolbox.dry_run = True
        asyncio.run(engine.turn("book me tomorrow 10 am, Parikshit Verma, 9876543210, general consultation with Dr Sharma"))
        asyncio.run(engine.turn("yes"))
        with factory() as db:
            self.assertEqual(db.query(Transaction).count(), 0)
        out = asyncio.run(engine.turn("I have chest pain"))
        self.assertTrue(out.transferred)  # flagged for scoring/logging...
        self.assertIsNone(out.transfer_twiml)  # ...but no call is ever redirected
        self.assertTrue(engine.toolbox.pending["dry_run"])


class GatewayWiring(unittest.TestCase):
    """CallSession._handle_agent_turn against a fake agent runtime (no sockets, no DB writes)."""

    def _session(self, backend):
        from unittest.mock import MagicMock

        from backend.ai.engine.agent.runtime import AgentRuntime
        from backend.ai.engine.agent.facts import AgentProfile
        from backend.ai.engine.conversation.state_machine import ConversationStateMachine
        from backend.ai.realtime.twilio.gateway import CallSession

        engine, _ = make_engine(backend)
        s = CallSession(MagicMock(), "biz")
        s.call_id = "CA123"
        s.agent_rt = AgentRuntime(engine, "llm_agent", AgentProfile())
        s.state_machine = ConversationStateMachine("CA123", "biz", "+91", vertical_registry.get_vertical("clinic"))
        s.spoken = []

        async def speak(text):
            s.spoken.append(text)
            return True

        s._speak_turn = speak
        return s

    def test_agent_turn_speaks_records_and_continues(self):
        from unittest.mock import patch

        s = self._session(ScriptedBackend(reply("I am Maya. How can I help?")))
        with patch("backend.ai.realtime.twilio.gateway.record_call_turn") as rec:
            handled = asyncio.run(s._handle_agent_turn("who are you"))
        self.assertTrue(handled)
        self.assertEqual(s.spoken, ["I am Maya.", "How can I help?"])
        self.assertFalse(s.should_close)
        self.assertEqual(rec.call_args.kwargs["turn_sequence"], 1)

    def test_llm_outage_hands_the_turn_back_to_the_state_machine(self):
        s = self._session(ScriptedBackend(LLMUnavailable("429")))
        self.assertFalse(asyncio.run(s._handle_agent_turn("hello")))
        self.assertEqual(s.spoken, [])

    def test_hangup_closes_the_call(self):
        from unittest.mock import patch

        s = self._session(ScriptedBackend(call("end_call"), reply("Goodbye.")))
        with patch("backend.ai.realtime.twilio.gateway.record_call_turn"):
            self.assertTrue(asyncio.run(s._handle_agent_turn("that's all, bye")))
        self.assertTrue(s.should_close)


class GroundingGuard(unittest.TestCase):
    def test_times_extraction(self):
        from backend.ai.engine.agent.grounding import times_in

        self.assertEqual(times_in("10:30 AM or 3 pm, also ten thirty pm"), {(10, 30), (15, 0), (22, 30)})
        self.assertEqual(times_in("Dr. Sharma, 500 rupees, room 12"), set())

    def test_invented_slots_are_never_spoken(self):
        backend = ScriptedBackend(
            reply("We have 10:30 AM, 12:00 PM or 3 PM tomorrow. Which works?"),  # invented: no tool, caller gave none
            call("check_availability", date="tomorrow"),
            reply("Tomorrow I have 09:00 AM open. Would that work?"),  # 09:00 AM comes from the tool result
        )
        engine, _ = make_engine(backend)

        async def collect():
            return [e async for e in engine.turn_events("hmm", stream=True)]

        events = run(collect())
        spoken = " ".join(e["text"] for e in events if e["type"] == "sentence")
        self.assertNotIn("10:30", spoken)
        self.assertNotIn("3 PM", spoken)
        self.assertIn("09:00 AM", spoken)
        self.assertIn("Your draft mentioned", backend.seen[1]["messages"][-1]["content"])  # model was told why

    def test_grounded_times_pass_untouched(self):
        engine, _ = make_engine(ScriptedBackend(reply("Ten AM tomorrow works. We are open 9 AM to 5 PM.")))
        out = run(engine.turn("can I come tomorrow at 10 am?"))
        self.assertIn("Ten AM", out.reply)  # caller said 10 am; 9 AM / 5 PM come from the clinic hours in the prompt

    def test_repeat_offender_gets_a_safe_line(self):
        engine, _ = make_engine(ScriptedBackend(reply("How about 4:45 PM?"), reply("Still 4:45 PM then.")))
        out = run(engine.turn("hello"))
        self.assertNotIn("4:45", out.reply)
        self.assertIn("Which day", out.reply)


class ConfirmationSms(unittest.TestCase):
    def test_booking_triggers_a_confirmation_sms_but_tests_never_send_it(self):
        import os
        from unittest.mock import patch

        self.assertEqual(os.environ.get("AMSH_DISABLE_SMS"), "1")  # set by fixtures: no real SMS from tests
        engine, _ = make_engine(ScriptedBackend())
        tb, gate = engine.toolbox, engine.gate
        tb.said = list(CALLER_SAID)
        gate.turn = 1
        run(tb.execute("book_appointment", {**BOOK, "confirmed_by_caller": False}))
        gate.turn = 2
        with patch("backend.ai.tools.common.send_sms._SMS_EXECUTOR.submit") as submit:
            r = run(tb.execute("book_appointment", {**BOOK, "confirmed_by_caller": True}))
        self.assertEqual(r["code"], "booked")
        submit.assert_not_called()  # kill-switch on: the import bug is gone, and nothing was sent

    def test_send_sms_sync_exists_and_queues_when_enabled(self):
        import os
        from unittest.mock import patch

        from backend.ai.tools.common.send_sms import send_sms_sync

        self.assertEqual(send_sms_sync("+919876543210", "hi")["skipped"], "AMSH_DISABLE_SMS")
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("AMSH_DISABLE_SMS")
            with patch("backend.ai.tools.common.send_sms._SMS_EXECUTOR.submit") as submit:
                self.assertTrue(send_sms_sync("+919876543210", "hi")["queued"])
                submit.assert_called_once()
                self.assertEqual(send_sms_sync("", "hi")["skipped"], "no recipient")
            os.environ["AMSH_DISABLE_SMS"] = "1"


class BehaviorSettings(unittest.TestCase):
    """The dashboard's Behavior/Voice tabs (Agent.config) must actually change what the agent does."""

    def engine(self, backend=None, **kw):
        from backend.ai.engine.agent.agent_loop import AgentEngine
        from backend.ai.engine.agent.facts import load_all

        factory, biz = make_db_factory()
        facts, profile = load_all(factory, biz)
        return AgentEngine(
            business_id=biz, caller_number="+919876543210", call_id=None, facts=facts,
            vertical_config=vertical_registry.get_vertical("clinic"), backend=backend or ScriptedBackend(),
            db_factory=factory, agent_name="Maya", now_fn=lambda: FIXED_NOW, **kw,
        )

    def test_personality_changes_the_prompt(self):
        for tone, needle in (
            ("Energetic & Fast", "energetic and upbeat"),
            ("Warm & Friendly", "warm, cheerful"),
            ("Crisp & Professional", "polished, efficient"),
            ("Empathetic & Calm", "gentle, reassuring"),
            (None, "warm, cheerful"),  # default is friendly, never flat
            ("Sassy Pirate", "PERSONALITY: Sassy Pirate"),  # a custom value is passed through
        ):
            self.assertIn(needle, self.engine(tone=tone)._system, tone)

    def test_owner_instructions_are_included_capped_and_cannot_override_rules(self):
        p = self.engine(instructions="Always mention our free parking. " + "x" * 5000)._system
        self.assertIn("free parking", p)
        self.assertIn("never override the safety", p)
        self.assertLess(len(p), 6500)

    def test_small_talk_toggle(self):
        self.assertIn("deserve a real, friendly answer", self.engine(small_talk=True)._system)
        off = self.engine(small_talk=False)._system
        self.assertIn("no jokes or chit-chat", off)
        self.assertNotIn("deserve a real, friendly answer", off)

    def test_disabled_capabilities_remove_tools_and_are_refused_in_code(self):
        e = self.engine(capabilities={"cancel": False, "transfer": False, "book": True, "services": False})
        names = {t["function"]["name"] for t in e.tools}
        self.assertNotIn("cancel_appointment", names)
        self.assertNotIn("transfer_to_human", names)
        self.assertIn("book_appointment", names)
        self.assertIn("cancelling appointments", e._system)
        self.assertIn("explaining the clinic's services", e._system)
        r = run(e.toolbox.execute("cancel_appointment", {"ref": "A1", "confirmed_by_caller": True}))  # even if the model tries
        self.assertEqual(r["code"], "disabled")

    def test_transfers_off_still_allows_emergencies(self):
        e = self.engine(ScriptedBackend(reply("Sorry, I can't transfer calls here. Anything else?")), capabilities={"transfer": False})
        human = run(e.turn("I want to speak to a human"))
        self.assertFalse(human.transferred)  # declined by the LLM, not transferred
        emergency = run(e.turn("I have severe chest pain"))
        self.assertTrue(emergency.transferred)

    def test_confirmation_toggle_off_books_without_a_second_turn_but_still_grounds(self):
        from backend.server.database.models.transaction import Transaction

        book = call("book_appointment", **{**BOOK, "confirmed_by_caller": True})
        e = self.engine(ScriptedBackend(book, reply("Booked!")), require_confirmation=False)
        self.assertIn("does not require a read-back", e._system)
        run(e.turn("book General Consultation with Dr Sharma tomorrow 10 am, Parikshit Verma, 9876543210"))
        with e.toolbox.db_factory() as db:
            self.assertEqual(db.query(Transaction).count(), 1)
        # grounding is not switchable: a guessed booking is still refused
        e2 = self.engine(ScriptedBackend(book, reply("Which day suits you?")), require_confirmation=False)
        run(e2.turn("My name is Kalpana"))
        with e2.toolbox.db_factory() as db:
            self.assertEqual(db.query(Transaction).count(), 0)

    def test_confirmation_stays_on_by_default(self):
        self.assertIn("read the details back", self.engine()._system)

    def test_temperature_slider_is_clamped(self):
        from backend.ai.engine.agent.llm_backend import GroqChatBackend

        self.assertEqual(GroqChatBackend().temperature, 0.5)
        self.assertEqual(GroqChatBackend(temperature=0.2).temperature, 0.2)
        self.assertEqual(GroqChatBackend(temperature=1.0).temperature, 0.8)
        self.assertEqual(GroqChatBackend(temperature=0.0).temperature, 0.1)

    def test_profile_reads_the_dashboard_config(self):
        from backend.ai.engine.agent.facts import load_profile
        from backend.server.database.models.agent import Agent

        factory, biz = make_db_factory()
        with factory() as db:
            db.query(Agent).filter(Agent.business_id == biz).one().config = {
                "personality": "Energetic & Fast", "system_prompt": "Be brief.", "temperature": 35,
                "toggles": {"small_talk": False, "confirm": False}, "capabilities": {"cancel": False, "book": True},
                "voice_settings": {"speed": 65, "pitch": 50}, "gender": "female", "engine": "LLM_Agent",
            }
            db.commit()
            p = load_profile(db, biz)
        self.assertEqual((p.instructions, p.temperature, p.small_talk, p.require_confirmation), ("Be brief.", 0.35, False, False))
        self.assertEqual((p.capabilities, p.speed, p.gender, p.engine), ({"cancel": False, "book": True}, 1.3, "female", "llm_agent"))

    def test_speed_resolution(self):
        from backend.ai.speech.tts.voice_profile import resolve_speed

        self.assertEqual(resolve_speed(65, "Crisp & Professional"), 1.3)  # the slider stores x*50
        self.assertEqual(resolve_speed(1.2, None), 1.2)
        self.assertEqual(resolve_speed(50, "Energetic & Fast"), 1.15)  # untouched slider (1.0x): personality decides
        self.assertEqual(resolve_speed(None, "Empathetic & Calm"), 0.95)
        self.assertEqual(resolve_speed(None, None), 1.05)  # never flat by default
        self.assertEqual(resolve_speed(500, None), 1.5)  # clamped

    def test_tts_language_detection(self):
        from backend.ai.speech.tts.voice_profile import detect_tts_language as lang

        for hindi in ("Maaf kijiye, mujhe theek se sunai nahi diya.", "नमस्ते, मैं माया हूँ", "Aapka naam kya hai?", "ही हाउ आर यू"):
            self.assertEqual(lang(hindi), "hi", hindi)
        for english in ("Hi! Thank you for calling Sanjeevani Clinic. How can I help?", "Your appointment is booked for tomorrow at ten AM.",
                        "The main doctor is Dr. Sharma", "", "Sure thing!"):
            self.assertEqual(lang(english), "en", english)

    def test_preview_endpoint_forwards_language_and_settings_to_cartesia(self):
        import asyncio as aio
        from unittest.mock import AsyncMock, patch

        from backend.server.api.routes import voice

        with patch.object(voice.cartesia_tts, "generate_preview_audio", AsyncMock(return_value=b"mp3")) as gen:
            aio.run(voice.preview_voice(voice_id="v", text="Hello there", speed=1.2, emotion=None, language="hi"))
            self.assertEqual(gen.call_args.kwargs["language"], "hi")  # the dashboard sends it; it used to be dropped
            self.assertEqual(gen.call_args.kwargs["speed"], 1.2)
            aio.run(voice.preview_voice(voice_id="v", text="Aapka naam kya hai?", speed=None, emotion=None, language=None))
            self.assertEqual(gen.call_args.kwargs["language"], "hi")  # detected from the text when not supplied
            aio.run(voice.preview_voice(voice_id="v", text="How can I help you today?", speed=None, emotion=None, language=None))
            self.assertEqual(gen.call_args.kwargs["language"], "en")

    def test_cartesia_generation_config(self):
        from backend.ai.speech.tts.cartesia import CartesiaTTS

        self.assertEqual(CartesiaTTS.generation_config(None, None), {})
        self.assertEqual(CartesiaTTS.generation_config(1.0, None), {})
        self.assertEqual(CartesiaTTS.generation_config(1.15, "excited"), {"speed": 1.15, "emotion": "excited"})
        self.assertEqual(CartesiaTTS.generation_config(9, None), {"speed": 1.5})

    def test_legacy_engine_now_honours_the_dashboard_personalities(self):
        from backend.ai.capabilities.skills.emotional_tone import ToneProfile, parse_profile

        self.assertEqual(parse_profile("Warm & Friendly"), ToneProfile.FRIENDLY)
        self.assertEqual(parse_profile("Empathetic & Calm"), ToneProfile.CALM)
        self.assertEqual(parse_profile("Crisp & Professional"), ToneProfile.PROFESSIONAL)
        self.assertEqual(parse_profile(None), ToneProfile.PROFESSIONAL)


class DashboardTabsAreLive(unittest.TestCase):
    """Every setting on the /ai page (Behavior, Voice, Languages, Appointments, Call Handling, Escalation) is read
    from Agent.config per call and changes what the AI does."""

    CONFIG = {
        "personality": "Warm & Friendly",
        "auto_detect_language": False,
        "limits": {"buffer_minutes": 10, "notice_hours": 2, "max_duration_minutes": 5, "silence_timeout_seconds": 6},
        "toggles": {"allow_cancel": False, "allow_reschedule": True, "record": False, "transcribe": False},
        "transfer_phone": "+919000000001",
        "escalation_triggers": [
            {"id": "human_request", "label": "x", "active": False},
            {"id": "complex_billing", "label": "y", "active": True},
        ],
    }

    def engine(self, backend=None, cfg=None, **kw):
        from backend.ai.engine.agent.agent_loop import AgentEngine
        from backend.ai.engine.agent.facts import load_all
        from backend.server.database.models.agent import Agent

        factory, biz = make_db_factory()
        with factory() as db:
            a = db.query(Agent).filter(Agent.business_id == biz).one()
            a.config, a.primary_language, a.languages = cfg or self.CONFIG, "hi", ["hi", "en"]
            db.commit()
        facts, p = load_all(factory, biz)
        e = AgentEngine(
            business_id=biz, caller_number="+919876543210", call_id=None, facts=facts,
            vertical_config=vertical_registry.get_vertical("clinic"), backend=backend or ScriptedBackend(),
            db_factory=factory, agent_name=p.name, language="hi", tone=p.tone, now_fn=lambda: FIXED_NOW,
            capabilities=p.capabilities, triggers=p.triggers, transfer_phone=p.transfer_phone,
            languages=p.languages, auto_detect_language=p.auto_detect_language, **kw,
        )
        return e, p, facts

    def test_saving_one_tab_no_longer_erases_the_others(self):
        from backend.server.api.routes.agents import merge_agent_config as merge

        behavior = {"toggles": {"small_talk": False, "confirm": True}, "voice_settings": {"speed": 60}}
        call_handling = {"toggles": {"record": True, "transcribe": False}, "limits": {"max_duration_minutes": 9}}
        appointments = {"toggles": {"allow_cancel": False}, "limits": {"buffer_minutes": 5}}
        cfg = merge(merge(merge({}, behavior), call_handling), appointments)
        self.assertEqual(cfg["toggles"], {"small_talk": False, "confirm": True, "record": True, "transcribe": False, "allow_cancel": False})
        self.assertEqual(cfg["limits"], {"max_duration_minutes": 9, "buffer_minutes": 5})
        self.assertEqual(cfg["voice_settings"], {"speed": 60})
        # lists and scalars still replace
        self.assertEqual(merge({"escalation_triggers": [1, 2]}, {"escalation_triggers": [3]})["escalation_triggers"], [3])

    def test_profile_reads_every_tab(self):
        _, p, facts = self.engine()
        self.assertEqual((p.languages, p.auto_detect_language, p.language), (["hi", "en"], False, "hi"))
        self.assertEqual((p.buffer_minutes, p.notice_hours, p.max_duration_minutes, p.silence_timeout_seconds), (10, 2.0, 5, 6))
        self.assertEqual((p.record, p.transcribe, p.transfer_phone), (False, False, "+919000000001"))
        self.assertEqual((p.triggers["human_request"], p.triggers["complex_billing"], p.triggers["emergency"]), (False, True, True))
        self.assertEqual(p.capabilities["cancel"], False)  # Appointments-tab "allow cancel" off
        self.assertNotIn("reschedule", {k for k, v in p.capabilities.items() if v is False})
        self.assertEqual((facts.slot_minutes, facts.notice_hours), (40, 2.0))  # 30 min visit + 10 min buffer

    def test_languages_tab_shapes_the_prompt(self):
        e, _, _ = self.engine()
        self.assertIn("always reply in Hindi", e._system)  # auto-detect off
        auto, _, _ = self.engine(cfg={**self.CONFIG, "auto_detect_language": True})
        self.assertIn("if unclear use Hindi", auto._system)
        self.assertIn("Languages you support: Hindi (Hinglish is fine), English", auto._system)

    def test_appointments_tab_switches_and_notice(self):
        e, _, facts = self.engine()
        self.assertNotIn("cancel_appointment", {t["function"]["name"] for t in e.tools})
        self.assertIn("reschedule_appointment", {t["function"]["name"] for t in e.tools})
        tb = e.toolbox
        tb.said = ["tomorrow", "Today at 11 AM", "12 PM", "3 PM"]
        tb.last_utterance = "Today at 11 AM"
        soon = run(tb.execute("check_availability", {"date": "today", "time": "11 AM"}))  # 10:00 now + 2h notice = 12:00
        self.assertFalse(soon["requested_time_free"])
        self.assertEqual(soon["reason"], "too_soon")
        later = run(tb.execute("check_availability", {"date": "today", "time": "3 PM"}))
        self.assertTrue(later["requested_time_free"])
        slots = run(tb.execute("check_availability", {"date": "today"}))["open_slots"]
        self.assertTrue(all(s not in ("09:00 AM", "10:30 AM", "11:20 AM") for s in slots), slots)

    def test_escalation_tab_controls_which_triggers_fire(self):
        # human_request OFF: the LLM answers instead of transferring
        e, _, _ = self.engine(ScriptedBackend(reply("Main aapki madad karti hoon. Kya chahiye?")))
        self.assertFalse(run(e.turn("I want to speak to a human")).transferred)
        # complex_billing ON: refund talk goes to the front desk without asking the LLM
        backend = ScriptedBackend()
        e2, _, _ = self.engine(backend)
        out = run(e2.turn("I want a refund, I was charged twice"))
        self.assertTrue(out.transferred)
        self.assertEqual(backend.seen, [])
        # emergencies always fire, even with human_request off
        self.assertTrue(run(self.engine(ScriptedBackend())[0].turn("mujhe chest pain ho raha hai, emergency")).transferred)

    def test_frustration_trigger_needs_two_upset_turns(self):
        backend = ScriptedBackend(reply("I'm sorry about that. What can I fix?"))
        e, _, _ = self.engine(backend, cfg={**self.CONFIG, "escalation_triggers": [{"id": "frustration", "active": True}]})
        self.assertFalse(run(e.turn("this is useless, I'm so annoyed")).transferred)
        self.assertTrue(run(e.turn("you are not listening, this is ridiculous")).transferred)

    def test_fallback_phone_is_where_transfers_ring(self):
        from backend.ai.tools.common.transfer_call import TransferCallTool
        from backend.ai.tools.framework.base import ToolContext

        ctx = ToolContext(business_id="b", caller_number="+91", metadata={"transfer_phone": "+919000000001"})
        self.assertEqual(TransferCallTool._resolve_target(ctx, "front_desk"), ("+919000000001", "our front desk"))

    def test_record_and_transcribe_toggles_control_what_is_stored(self):
        from unittest.mock import patch

        from backend.server.database.models.agent import Agent
        from backend.server.database.models.message import Message
        from backend.server.services import call_recorder as rec

        for transcribe, record, expected_msgs, expected_url in ((True, True, 3, "http://rec/1"), (False, False, 0, None)):
            factory, biz = make_db_factory()
            with factory() as db:
                db.query(Agent).filter(Agent.business_id == biz).one().config = {"toggles": {"transcribe": transcribe, "record": record}}
                db.commit()
            with patch.object(rec, "SessionLocal", factory):
                rec.record_call_start("CA1", biz, "+91", greeting="Hello")
                rec.record_call_turn("CA1", "hi there", "hello!", 1)
                rec.update_call_recording_webhook("CA1", recording_url="http://rec/1", duration_seconds=30)
            with factory() as db:
                from backend.server.database.models.call import Call

                self.assertEqual(db.query(Message).count(), expected_msgs, (transcribe, record))
                self.assertEqual(db.get(Call, "CA1").recording_url, expected_url)
                self.assertEqual(db.get(Call, "CA1").duration_seconds, 30)  # the call itself is always logged

    def test_watchdog_prompts_then_hangs_up_on_silence_and_ends_at_max_duration(self):
        import time as _t
        from unittest.mock import MagicMock

        from backend.ai.realtime.twilio.gateway import CallSession

        def session(**settings):
            s = CallSession(MagicMock(), "biz")
            s.agent_settings = {"language": "en", **settings}
            s.said = []

            async def speak(text):
                s.said.append(text)
                return True

            s._speak_turn = speak
            return s

        idle = session(silence_timeout_seconds=1)
        idle.last_activity = _t.monotonic() - 100
        run(asyncio.wait_for(idle._watchdog(), 6))
        self.assertEqual(idle.said[0], "Are you still there?")
        self.assertIn("end the call", idle.said[1])
        self.assertTrue(idle.should_close)

        busy = session(silence_timeout_seconds=1)  # an answer in progress is not "silence"
        busy.last_activity, busy._busy = _t.monotonic() - 100, True

        async def watch_briefly():
            task = asyncio.create_task(busy._watchdog())
            await asyncio.sleep(2.5)
            still_running = not task.done()
            task.cancel()
            await task
            return still_running

        self.assertTrue(run(watch_briefly()))
        self.assertEqual(busy.said, [])
        self.assertFalse(busy.should_close)

        long_call = session(max_duration_minutes=1)
        long_call.call_started = _t.monotonic() - 1000
        run(asyncio.wait_for(long_call._watchdog(), 4))
        self.assertIn("maximum time", long_call.said[0])
        self.assertTrue(long_call.should_close)

        untouched = session()  # nothing configured: the watchdog does nothing at all
        run(asyncio.wait_for(untouched._watchdog(), 2))
        self.assertEqual(untouched.said, [])


class HindiAndDevanagari(unittest.TestCase):
    """Speech-to-text often returns Devanagari; the code-side guards must not lock those callers out."""

    def test_normalizer_and_fuzzy_names(self):
        from backend.ai.engine.agent.hindi import fuzzy_in, normalize

        self.assertEqual(normalize("कल सुबह १० बजे"), "kal subah 10 baje")
        self.assertEqual(normalize("Plain English 5 pm"), "Plain English 5 pm")  # Latin passes through untouched
        self.assertTrue(fuzzy_in("parikshit", ["मेरा नाम परीक्षित है"]))
        self.assertTrue(fuzzy_in("sharma", ["शर्मा जी"]))
        self.assertFalse(fuzzy_in("pritik", ["मेरा नाम परीक्षित है"]))  # a mangled name is not what the caller said

    def test_time_of_day_words_settle_am_pm(self):
        self.assertEqual(parse_time("subah 10 baje"), time(10, 0))
        self.assertEqual(parse_time("shaam 5 baje"), time(17, 0))
        self.assertEqual(parse_time("dopahar 12 baje"), time(12, 0))
        self.assertEqual(parse_time("raat 12 baje"), time(0, 0))
        self.assertEqual(parse_time("10 in the morning"), time(10, 0))
        self.assertIsNone(parse_time("10 baje"))  # still ambiguous: the agent must ask
        self.assertEqual(parse_date("kal", TODAY), date(2026, 9, 29))

    def test_devanagari_caller_can_book(self):
        from backend.server.database.models.transaction import Transaction

        book = call("book_appointment", **{**BOOK, "patient_name": "Parikshit Verma", "preferred_time": "10:00 AM"})
        backend = ScriptedBackend(book, reply("Parikshit ji, kya main yeh confirm kar doon?"))
        engine, factory = make_engine(backend)
        said = "मेरा नाम परीक्षित वर्मा है, नंबर ९८७६५४३२१०, कल सुबह १० बजे जनरल कंसल्टेशन डॉक्टर शर्मा"
        out = run(engine.turn(said))
        tool_msgs = [m for m in backend.seen[1]["messages"] if m["role"] == "tool"]  # (a language note may follow it)
        result = json.loads(tool_msgs[-1]["content"])
        self.assertEqual(result["code"], "needs_confirmation", result)  # grounded in Devanagari: name, digits, day, time
        self.assertNotEqual(result.get("code"), "not_from_caller")

    def test_mangled_devanagari_name_is_still_refused(self):
        book = call("book_appointment", **{**BOOK, "patient_name": "Pritik Verma"})
        backend = ScriptedBackend(book, reply("Kya aap apna naam spell kar sakte hain?"))
        engine, _ = make_engine(backend)
        run(engine.turn("मेरा नाम परीक्षित वर्मा है, नंबर ९८७६५४३२१०, कल सुबह १० बजे"))
        tool_msgs = [m for m in backend.seen[1]["messages"] if m["role"] == "tool"]
        self.assertEqual(json.loads(tool_msgs[-1]["content"])["field"], "patient_name")

    def test_hindi_emergency_and_human_request_skip_the_llm(self):
        for said, department in (("मुझे सीने में दर्द हो रहा है", "emergency"), ("mujhe kisi insaan se baat karni hai", "front_desk")):
            backend = ScriptedBackend()
            engine, _ = make_engine(backend)
            out = run(engine.turn(said))
            self.assertTrue(out.transferred, said)
            self.assertEqual(backend.seen, [], said)
            self.assertEqual(engine.toolbox.pending["department"], department)


class CartesiaCredits(unittest.TestCase):
    """The dashboard's 'robotic / different voice' was Cartesia 402 (out of credits) plus a silent voice swap."""

    def _tts(self, *responses):
        from unittest.mock import MagicMock

        from backend.ai.speech.tts.cartesia import CartesiaTTS

        t = CartesiaTTS()
        t.api_key = "test"
        t._client = MagicMock()
        seq = list(responses)

        async def post(url, headers=None, json=None):
            r = MagicMock()
            r.status_code, r.text, r.content = seq.pop(0)
            t.calls = getattr(t, "calls", []) + [json["voice"]["id"]]
            return r

        t._client.post = post
        return t

    def test_402_is_not_papered_over_with_a_different_voice(self):
        t = self._tts((402, "Insufficient credits: you have 6 remaining", b""))
        self.assertIsNone(run(t.generate_preview_audio("Hello there", "custom-voice")))
        self.assertEqual(t.calls, ["custom-voice"])  # no second request with the default voice
        self.assertEqual(t.last_error[0], 402)

    def test_unknown_voice_still_falls_back_to_default(self):
        t = self._tts((404, "voice not found", b""), (200, "", b"mp3"))
        self.assertEqual(run(t.generate_preview_audio("Hello there", "gone-voice")), b"mp3")
        self.assertEqual(t.calls, ["gone-voice", t.voice_id])

    def test_previews_are_cached_so_repeats_cost_nothing(self):
        t = self._tts((200, "", b"mp3"))
        self.assertEqual(run(t.generate_preview_audio("Same sentence", "v", language="en")), b"mp3")
        self.assertEqual(run(t.generate_preview_audio("Same sentence", "v", language="en")), b"mp3")  # 2nd: no request
        self.assertEqual(t.calls, ["v"])

    def test_route_returns_402_with_a_clear_message(self):
        from unittest.mock import AsyncMock, patch

        from backend.server.api.routes import voice

        with patch.object(voice.cartesia_tts, "generate_preview_audio", AsyncMock(return_value=None)), \
             patch.object(voice.cartesia_tts, "last_error", (402, "Insufficient credits")):
            resp = run(voice.preview_voice(voice_id="v", text="Hello", speed=None, emotion=None, language=None))
        self.assertEqual(resp.status_code, 402)
        self.assertIn("credits", resp.body.decode().lower())


class _Resp:
    def __init__(self, status=200, body=None, text="", headers=None, lines=None):
        self.status_code, self._body, self.text, self.headers, self._lines = status, body or {}, text or json.dumps(body or {}), headers or {}, lines or []

    def json(self):
        return self._body

    async def aread(self):
        return self.text.encode()

    async def aiter_lines(self):
        for line in self._lines:
            yield line


class _Stream:
    def __init__(self, resp):
        self.resp = resp

    async def __aenter__(self):
        return self.resp

    async def __aexit__(self, *exc):
        return False


class _FakeHttp:
    def __init__(self, *responses):
        self.responses, self.requests = list(responses), []

    async def post(self, url, headers=None, json=None, timeout=None):
        self.requests.append(json)
        return self.responses.pop(0)

    def stream(self, method, url, headers=None, json=None, timeout=None):
        self.requests.append(json)
        return _Stream(self.responses.pop(0))


def _ok(content=None, tool=None):
    message = {"content": content}
    if tool:
        message["tool_calls"] = [{"id": "c1", "type": "function", "function": {"name": tool, "arguments": "{}"}}]
    return _Resp(200, {"choices": [{"message": message}], "usage": {"prompt_tokens": 10, "completion_tokens": 5}})


def _sse(*deltas):
    return _Resp(200, lines=[f"data: {json.dumps({'choices': [{'delta': d}]})}" for d in deltas] + ["data: [DONE]"])


def _compat(name, *responses, **kw):
    from backend.ai.engine.agent.llm_backend import OpenAICompatBackend

    class Fake(OpenAICompatBackend):
        provider = name

        def default_model(self):
            return "m"

        def api_url(self):
            return "http://x"

        def api_key(self):
            return "k"

        def client(self):
            return self.http

    b = Fake(**kw)
    b.http = _FakeHttp(*responses)
    return b


class MultiProviderLLM(unittest.TestCase):
    """Groq first, Gemini as the fallback: a rate-limited provider must not stop the conversation."""

    def setUp(self):
        from backend.ai.engine.agent.llm_backend import reset_cooldowns

        reset_cooldowns()

    def test_wait_hints_are_parsed(self):
        from backend.ai.engine.agent.llm_backend import parse_wait_seconds as w

        self.assertAlmostEqual(w("Please try again in 12m1.872s."), 721.872)
        self.assertAlmostEqual(w("try again in 1h2m3s"), 3723)
        self.assertAlmostEqual(w("try again in 350ms"), 0.35)
        self.assertAlmostEqual(w('{"retryDelay": "23s"}'), 23)
        self.assertIsNone(w("no hint here"))

    def test_daily_cap_is_not_retried_and_reports_the_wait(self):
        from backend.ai.engine.agent.llm_backend import LLMUnavailable

        b = _compat("groq", _Resp(429, text="Rate limit ... tokens per day (TPD). Please try again in 12m1.87s."))
        with self.assertRaises(LLMUnavailable) as cm:
            run(b.chat([{"role": "user", "content": "hi"}], []))
        self.assertEqual(len(b.http.requests), 1)  # no pointless retries against a daily cap
        self.assertGreater(cm.exception.retry_after, 700)

    def test_short_rate_limit_is_retried(self):
        from unittest.mock import patch

        b = _compat("groq", _Resp(429, text="try again in 200ms"), _ok("Hello!"))
        real_sleep = asyncio.sleep  # captured first: patching asyncio.sleep replaces it for everyone

        async def instant(seconds):
            await real_sleep(0)

        with patch("backend.ai.engine.agent.llm_backend.asyncio.sleep", new=instant):
            self.assertEqual(run(b.chat([{"role": "user", "content": "hi"}], []))["content"], "Hello!")
        self.assertEqual(len(b.http.requests), 2)

    def test_gemini_gets_function_names_on_tool_results(self):
        from backend.ai.engine.agent.llm_backend import GeminiChatBackend

        msgs = [
            {"role": "user", "content": "x"},
            {"role": "assistant", "content": None, "tool_calls": [{"id": "c9", "type": "function", "function": {"name": "check_availability", "arguments": "{}"}}]},
            {"role": "tool", "tool_call_id": "c9", "content": "{}"},
        ]
        out = GeminiChatBackend().prepare_messages(msgs)
        self.assertEqual(out[2]["name"], "check_availability")
        self.assertNotIn("name", msgs[2])  # the shared history is not mutated (Groq must not see it)

    def test_second_provider_answers_when_the_first_is_down_and_the_first_is_then_skipped(self):
        from backend.ai.engine.agent.llm_backend import FallbackChatBackend

        groq = _compat("groq", _Resp(429, text="tokens per day. try again in 10m"))
        gemini = _compat("gemini", _ok("Hi from Gemini"), _ok("Second turn from Gemini"))
        fb = FallbackChatBackend([groq, gemini])
        first = run(fb.chat([{"role": "user", "content": "hi"}], []))
        self.assertEqual((first["content"], fb.last_provider), ("Hi from Gemini", "gemini"))
        run(fb.chat([{"role": "user", "content": "again"}], []))
        self.assertEqual(len(groq.http.requests), 1)  # sidelined: the 2nd turn did not waste a round trip on Groq
        self.assertEqual(fb.usage["calls"], 2)

    def test_provider_is_retried_after_its_cooldown(self):
        from backend.ai.engine.agent import llm_backend as lb

        groq = _compat("groq", _Resp(500, text="boom"), _Resp(500, text="boom"), _Resp(500, text="boom"), _ok("Groq is back"))
        gemini = _compat("gemini", _ok("Gemini"))
        fb = lb.FallbackChatBackend([groq, gemini])
        run(fb.chat([{"role": "user", "content": "1"}], []))
        lb._COOLDOWN_UNTIL["groq"] = 0.0  # cooldown over
        self.assertEqual(run(fb.chat([{"role": "user", "content": "2"}], []))["content"], "Groq is back")
        self.assertEqual(fb.last_provider, "groq")

    def test_all_providers_failing_lists_every_error(self):
        from backend.ai.engine.agent.llm_backend import FallbackChatBackend, LLMUnavailable

        fb = FallbackChatBackend([_compat("groq", _Resp(401, text="bad key")), _compat("gemini", _Resp(403, text="no access"))])
        with self.assertRaises(LLMUnavailable) as cm:
            run(fb.chat([{"role": "user", "content": "hi"}], []))
        self.assertIn("groq", str(cm.exception))
        self.assertIn("gemini", str(cm.exception))

    def test_streaming_falls_back_before_any_word_but_never_mid_sentence(self):
        from backend.ai.engine.agent.llm_backend import FallbackChatBackend, LLMUnavailable, reset_cooldowns

        async def collect(fb):
            return [e async for e in fb.chat_stream([{"role": "user", "content": "hi"}], [])]

        down = _compat("groq", _Resp(503, text="unavailable"))
        up = _compat("gemini", _sse({"content": "Hello "}, {"content": "there."}))
        events = run(collect(FallbackChatBackend([down, up])))
        self.assertEqual([e["delta"] for e in events if e["type"] == "text"], ["Hello ", "there."])
        self.assertEqual(events[-1]["content"], "Hello there.")

        reset_cooldowns()
        broke_midway = _compat("groq", _sse({"content": "Hel"}), _Resp(200, lines=["data: {\"choices\": [{\"delta\": {\"content\": \"lo\"}}]}"]))

        async def die(*a, **k):  # the stream dies after the first word has been yielded
            yield {"type": "text", "delta": "Hel"}
            raise LLMUnavailable("connection lost")

        broke_midway.chat_stream = die
        with self.assertRaises(LLMUnavailable):
            run(collect(FallbackChatBackend([broke_midway, _compat("gemini", _sse({"content": "should not be used"}))])))

    def test_factory_builds_the_configured_chain(self):
        from types import SimpleNamespace
        from unittest.mock import patch

        from backend.ai.engine.agent.llm_backend import FallbackChatBackend, GeminiChatBackend, GroqChatBackend, build_chat_backend
        from backend.ai.llm.client import llm_client

        def build(groq_key, gemini_key, order="groq,gemini"):
            settings = SimpleNamespace(GEMINI_API_KEY=gemini_key, GEMINI_MODEL="gemini-x", LLM_PROVIDERS=order)
            with patch.object(llm_client, "api_key", groq_key), patch("backend.server.common.config.get_settings", return_value=settings):
                return build_chat_backend(temperature=0.3)

        both = build("g", "k")
        self.assertIsInstance(both, FallbackChatBackend)
        self.assertEqual([b.provider for b in both.backends], ["groq", "gemini"])
        self.assertEqual(both.backends[1].model, "gemini-x")
        self.assertEqual(both.backends[0].temperature, 0.3)
        self.assertEqual([b.provider for b in build("g", "k", "gemini,groq").backends], ["gemini", "groq"])
        self.assertIsInstance(build("g", None), GroqChatBackend)  # no Gemini key: exactly the old behaviour
        self.assertIsInstance(build("", "k"), GeminiChatBackend)
        self.assertIsInstance(build("", None), GroqChatBackend)  # nothing configured: fails clearly at first use

    def test_provider_spec_lists_several_groq_models(self):
        from types import SimpleNamespace
        from unittest.mock import patch

        from backend.ai.engine.agent.llm_backend import build_chat_backend, parse_provider_spec
        from backend.ai.llm.client import llm_client

        self.assertEqual(
            parse_provider_spec("groq, groq:openai/gpt-oss-120b ,gemini,bogus,groq:Qwen/Qwen3.8-27b,"),
            [{"kind": "groq", "model": None}, {"kind": "groq", "model": "openai/gpt-oss-120b"}, {"kind": "gemini", "model": None},
             {"kind": "groq", "model": "Qwen/Qwen3.8-27b"}],
        )
        spec = "groq,groq:openai/gpt-oss-120b,gemini,groq:qwen/qwen3.8-27b,groq:openai/gpt-oss-120b"
        settings = SimpleNamespace(GEMINI_API_KEY="k", GEMINI_MODEL="gemini-3.8-flash", LLM_PROVIDERS=spec)
        with patch.object(llm_client, "api_key", "g"), patch("backend.server.common.config.get_settings", return_value=settings):
            chain = build_chat_backend()
        names = [b.provider for b in chain.backends]
        self.assertEqual(names, ["groq", "groq:openai/gpt-oss-120b", "gemini", "groq:qwen/qwen3.8-27b"])  # duplicates dropped
        # earlier providers fail fast on a short rate limit; the last one may wait a little
        self.assertEqual([b.max_retry_wait for b in chain.backends], [1.0, 1.0, 1.0, 4.0])
        # every Groq model has its own cooldown key
        self.assertEqual(len(set(names)), len(names))

    def test_groq_models_get_the_right_parameters_and_never_see_gemini_fields(self):
        from backend.ai.engine.agent.llm_backend import GroqChatBackend

        self.assertEqual(GroqChatBackend(model="openai/gpt-oss-120b").extra_payload(), {"reasoning_effort": "low"})
        self.assertEqual(GroqChatBackend(model="qwen/qwen3.8-27b").extra_payload(), {"reasoning_effort": "none", "parallel_tool_calls": False})
        self.assertEqual(GroqChatBackend(model="llama-x").extra_payload(), {})  # unknown families get no reasoning params
        history = [{"role": "assistant", "content": None, "tool_calls": [{"id": "c", "type": "function", "function": {"name": "f", "arguments": "{}"}, "extra_content": {"google": {"thought_signature": "sig"}}}]}]
        cleaned = GroqChatBackend().prepare_messages(history)
        self.assertNotIn("extra_content", cleaned[0]["tool_calls"][0])
        self.assertIn("extra_content", history[0]["tool_calls"][0])  # shared history untouched

    def test_gemini_thought_signature_is_echoed_or_skipped(self):
        from backend.ai.engine.agent.llm_backend import GeminiChatBackend

        real = {"google": {"thought_signature": "REAL"}}
        history = [
            {"role": "assistant", "content": None, "tool_calls": [
                {"id": "a", "type": "function", "function": {"name": "f", "arguments": "{}"}, "extra_content": real},
                {"id": "b", "type": "function", "function": {"name": "g", "arguments": "{}"}},  # made by another provider
            ]},
        ]
        calls = GeminiChatBackend().prepare_messages(history)[0]["tool_calls"]
        self.assertEqual(calls[0]["extra_content"], real)  # its own signature goes back untouched
        self.assertEqual(calls[1]["extra_content"]["google"]["thought_signature"], "skip_thought_signature_validator")

    def test_tool_call_signature_survives_parsing_and_the_agent_loop(self):
        sig = {"google": {"thought_signature": "SIG"}}
        first = _Resp(200, {"choices": [{"message": {"content": None, "tool_calls": [{"id": "c1", "type": "function", "function": {"name": "check_availability", "arguments": json.dumps({"date": "tomorrow"})}, "extra_content": sig}]}}]})
        backend = _compat("gemini", first, _ok("Tomorrow at 09:00 AM is open."))
        engine, _ = make_engine(backend)
        run(engine.turn("is there any slot tomorrow?"))
        resent = backend.http.requests[1]["messages"]
        assistant_call = [m for m in resent if m.get("tool_calls")][0]["tool_calls"][0]
        self.assertEqual(assistant_call["extra_content"], sig)  # echoed back on the tool-result round trip

    def test_agent_turn_reports_which_provider_answered(self):
        from backend.ai.engine.agent.llm_backend import FallbackChatBackend

        fb = FallbackChatBackend([_compat("groq", _Resp(429, text="try again in 5m")), _compat("gemini", _ok("I'm Maya, the AI receptionist."))])
        engine, _ = make_engine(fb)
        out = run(engine.turn("who are you"))
        self.assertEqual((out.reply, out.provider, out.degraded), ("I'm Maya, the AI receptionist.", "gemini", False))


class DoctorPlaceholder(unittest.TestCase):
    """A model that fills the optional doctor with 'any' means 'no preference', not a doctor named Any."""

    def test_placeholders_mean_no_preference(self):
        from backend.ai.engine.agent.validator import no_doctor_preference as none_pref

        for v in ("any", "Any doctor", "none", "koi bhi", "कोई भी", "No preference", "", None, "N/A."):
            self.assertTrue(none_pref(v), v)
        for v in ("Dr. Sharma", "Sharma", "Mehta"):
            self.assertFalse(none_pref(v), v)

    def test_booking_and_availability_accept_the_placeholder(self):
        engine, _ = make_engine(ScriptedBackend())
        tb = engine.toolbox
        tb.said = list(CALLER_SAID)
        tb.last_utterance = "tomorrow at 10 AM"
        engine.gate.turn = 1
        r = run(tb.execute("book_appointment", {**BOOK, "doctor_name": "any", "confirmed_by_caller": False}))
        self.assertEqual(r["code"], "needs_confirmation", r)
        avail = run(tb.execute("check_availability", {"date": "tomorrow", "doctor_name": "koi bhi"}))
        self.assertTrue(avail["ok"], avail)
        # a real but unknown doctor is still refused
        bad = run(tb.execute("book_appointment", {**BOOK, "doctor_name": "Dr. Nobody", "confirmed_by_caller": False}))
        self.assertEqual(bad["code"], "unknown_doctor")


class CallRecordings(unittest.TestCase):
    """/calls playback: real recordings of browser calls, an honest 'no audio' otherwise, and calls that actually end."""

    def setUp(self):
        import tempfile
        from datetime import datetime, timedelta, timezone
        from pathlib import Path
        from types import SimpleNamespace
        from unittest.mock import patch

        from backend.server.api.routes import calls
        from backend.server.database.models.call import Call

        self.calls = calls
        self.tmp = tempfile.TemporaryDirectory()
        self.factory, self.biz = make_db_factory()
        self.db = self.factory()
        self.db.add(Call(id="studio_abc123", business_id=self.biz, caller_number="+919876543210", outcome="live",
                         started_at=datetime.now(timezone.utc) - timedelta(seconds=75)))
        self.db.commit()
        self.request = SimpleNamespace(base_url="http://localhost:8010/")
        self.user = SimpleNamespace()
        self.patches = [
            patch.object(calls, "RECORDINGS_DIR", Path(self.tmp.name)),
            patch.object(calls, "get_business_or_404", lambda *a, **k: None),
            patch.object(calls, "require_membership", lambda *a, **k: None),
        ]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        self.db.close()
        self.tmp.cleanup()

    def upload(self, data=b"x" * 4000, content_type="audio/webm;codecs=opus", call_id="studio_abc123"):
        import io

        from starlette.datastructures import Headers, UploadFile

        f = UploadFile(file=io.BytesIO(data), filename="call.webm", headers=Headers({"content-type": content_type}))
        return run(self.calls.upload_call_recording(self.biz, call_id, self.request, f, self.db, self.user))

    def test_upload_stores_the_file_and_playback_url_serves_it(self):
        from pathlib import Path

        out = self.upload(b"RIFFfakeaudio" * 400)
        self.assertTrue(out["stored"])
        url = out["recording_url"]
        self.assertRegex(url, r"^http://localhost:8010/api/recordings/studio_abc123/[A-Za-z0-9_-]+$")
        call_id, token = url.rsplit("/", 2)[-2:]
        resp = self.calls.stream_recording(call_id, token)  # what the <audio> element requests (no login header possible)
        self.assertEqual(resp.media_type, "audio/webm")
        self.assertEqual(Path(resp.path).read_bytes(), b"RIFFfakeaudio" * 400)
        from backend.server.database.models.call import Call

        self.assertEqual(self.db.get(Call, "studio_abc123").recording_url, url)

    def test_wrong_token_and_path_tricks_are_not_found(self):
        from fastapi import HTTPException

        token = self.upload()["recording_url"].rsplit("/", 1)[1]
        for cid, tok in (("studio_abc123", "wrong-token"), ("studio_abc123", token[:-1]), ("../etc", token), ("studio_abc123", "*"), ("studio_*", token)):
            with self.assertRaises(HTTPException) as cm:
                self.calls.stream_recording(cid, tok)
            self.assertEqual(cm.exception.status_code, 404, (cid, tok))

    def test_validation(self):
        from fastapi import HTTPException

        for kwargs, code in (({"content_type": "text/html"}, 415), ({"data": b"x" * 10}, 400), ({"call_id": "does-not-exist"}, 404)):
            with self.assertRaises(HTTPException) as cm:
                self.upload(**kwargs)
            self.assertEqual(cm.exception.status_code, code, kwargs)
        from unittest.mock import patch

        with patch.object(self.calls, "MAX_RECORDING_BYTES", 1000), self.assertRaises(HTTPException) as cm:
            self.upload(b"x" * 2000)
        self.assertEqual(cm.exception.status_code, 413)

    def test_a_reupload_replaces_the_old_file(self):
        from pathlib import Path

        first = self.upload(b"a" * 900)["recording_url"]
        second = self.upload(b"b" * 900)["recording_url"]
        self.assertNotEqual(first, second)
        self.assertEqual(len(list(Path(self.tmp.name).iterdir())), 1)

    def test_recording_can_be_switched_off_in_the_dashboard(self):
        from pathlib import Path

        from backend.server.database.models.agent import Agent

        self.db.query(Agent).filter(Agent.business_id == self.biz).one().config = {"toggles": {"record": False}}
        self.db.commit()
        out = self.upload()
        self.assertFalse(out["stored"])
        self.assertEqual(list(Path(self.tmp.name).iterdir()), [])

    def test_a_playground_call_can_be_ended_once_and_only_while_live(self):
        out = self.calls.end_simulated_call(self.biz, "studio_abc123", self.db, self.user)
        self.assertTrue(out["ended"])
        self.assertGreaterEqual(out["duration_seconds"], 74)  # started 75 s ago
        self.assertEqual(out["outcome"], "resolved")
        again = self.calls.end_simulated_call(self.biz, "studio_abc123", self.db, self.user)
        self.assertFalse(again["ended"])  # idempotent: a finished call is left alone

    def test_playground_calls_are_labelled_as_test_calls(self):
        from backend.server.database.models.call import Call

        self.assertTrue(self.calls._format_call(self.db.get(Call, "studio_abc123"))["is_test"])
        for cid in ("studio_x", "webcall_x", "sim_x", "test_call_x"):
            self.assertTrue(self.calls.is_test_call(cid), cid)
        self.assertFalse(self.calls.is_test_call("CA1234567890abcdef"))  # a provider (Twilio/Exotel) call id

    def test_calls_left_live_are_closed_when_the_list_is_loaded(self):
        from datetime import datetime, timedelta, timezone

        from backend.server.database.models.call import Call

        old = datetime.now(timezone.utc) - timedelta(minutes=30)
        self.db.add(Call(id="webcall_old", business_id=self.biz, caller_number="Anonymous", outcome="live", started_at=old))
        self.db.add(Call(id="CAreal0001", business_id=self.biz, caller_number="+911", outcome="live", started_at=old))
        self.db.commit()
        self.calls._close_stale_live_calls(self.db, self.biz)
        self.assertEqual(self.db.get(Call, "webcall_old").outcome, "resolved")  # a test call idle for 10+ minutes
        self.assertEqual(self.db.get(Call, "CAreal0001").outcome, "live")  # a real call may run 30 minutes
        self.assertEqual(self.db.get(Call, "studio_abc123").outcome, "live")  # started 75 s ago

    def test_the_fake_song_fallback_is_gone_from_the_call_panel(self):
        from pathlib import Path

        panel = Path("frontend/user/components/dashboard/CallDetailPanel.tsx").read_text(encoding="utf-8")
        self.assertNotIn("soundhelix", panel.lower())


class SpeechToTextLanguage(unittest.TestCase):
    """Phone STT: one multilingual model for English + Hindi callers, never a call left deaf."""

    def test_language_resolution(self):
        from backend.ai.speech.stt.deepgram import model_for, resolve_stt_language as res

        for explicit in (None, "", "en-IN", "en-US", "en-GB", "hi-IN", "hi", "multi"):
            self.assertEqual(res(explicit), "multi", explicit)
        for explicit in ("pa-IN", "bn-IN", "es-ES", "de-DE"):  # not covered by the multilingual mode: keep the owner's choice
            self.assertEqual(res(explicit), explicit)
        self.assertEqual((model_for("multi"), model_for("pa-IN")), ("nova-3", "nova-2"))

    def test_falls_back_to_the_old_setting_if_multi_is_refused(self):
        from unittest.mock import patch

        from backend.ai.speech.stt import deepgram as dg

        class FakeWs:
            def __aiter__(self):
                return self

            async def __anext__(self):
                raise StopAsyncIteration

            async def close(self):
                pass

        urls = []

        async def fake_connect(url, **kw):
            urls.append(url)
            if "language=multi" in url:
                raise RuntimeError("HTTP 400")
            return FakeWs()

        conn = dg.DeepgramLiveConnection(encoding="mulaw", language="en-IN")
        conn.api_key = "k"
        with patch.object(dg.websockets, "connect", fake_connect):
            self.assertTrue(run(conn.connect()))
        self.assertEqual(conn.language, "en-IN")
        self.assertIn("model=nova-3", urls[0])
        self.assertIn("model=nova-2", urls[1])

        conn2 = dg.DeepgramLiveConnection(encoding="mulaw", language="pa-IN")
        conn2.api_key = "k"
        urls.clear()
        with patch.object(dg.websockets, "connect", fake_connect):
            self.assertTrue(run(conn2.connect()))
        self.assertEqual(len(urls), 1)  # an explicit non-multilingual choice is used as is


class StreamedPlayground(unittest.TestCase):
    """The playground streams each sentence the moment it exists and pre-generates its audio."""

    def test_long_sentences_are_cut_for_faster_first_audio_without_losing_words(self):
        from backend.ai.realtime.twilio.gateway import speech_chunks

        short = "Hello there, how are you today?"
        self.assertEqual(speech_chunks(short), [short])
        long = "We are open Monday to Thursday from nine am to one pm and two pm to six pm, Friday nine am to one pm and two pm to five pm, and Saturday nine am to one pm."
        parts = speech_chunks(long)
        self.assertGreater(len(parts), 1)
        self.assertTrue(all(len(p) <= 115 for p in parts))
        self.assertEqual(" ".join(parts).split(), long.split())
        hindi = "आपका अपॉइंटमेंट कल सुबह दस बजे के लिए बुक है, और डॉक्टर शर्मा आपको देखेंगे, क्या मैं कुछ और मदद कर सकती हूँ इसके बारे में आज?"
        self.assertEqual(" ".join(speech_chunks(hindi)).split(), hindi.split())
        self.assertEqual(speech_chunks(""), [])

    def _stream(self, events, has_runtime=True, degraded=False):
        from types import SimpleNamespace
        from unittest.mock import AsyncMock, patch

        from backend.ai.realtime.twilio import gateway as gw

        class Engine:
            language_pref = "hi"

            async def turn_events(self, text, stream=True):
                for e in events:
                    yield e
                yield {"type": "done", "turn": SimpleNamespace(reply=" ".join(x["text"] for x in events), degraded=degraded, provider="groq", latency_ms=5, first_sentence_ms=2, hangup=False, transferred=False)}

        runtime = SimpleNamespace(engine=Engine(), profile=SimpleNamespace(voice_id="SAVED"))
        prefetched = []
        payload = gw.VoiceSimulateRequest(business_id="b", user_transcript="hi", call_id="c1", voice_id="PICKED")
        patches = [
            patch.object(gw, "_ensure_sim_session", AsyncMock(return_value=("c1", SimpleNamespace(sequence=0, current_state=SimpleNamespace(value="x"), collected_slots={})))),
            patch.object(gw, "get_sim_runtime", lambda cid: runtime if has_runtime else None),
            patch.object(gw, "_prefetch_tts", lambda text, voice, *more: prefetched.append((text, voice))),
            patch.object(gw, "record_call_turn", lambda **kw: None),
            patch.object(gw, "record_call_end", lambda **kw: None),
            patch.object(gw, "_legacy_turn", AsyncMock(return_value={"call_id": "c1", "state": "s", "bot_response": "legacy reply", "should_hangup": False})),
        ]

        async def go():
            resp = await gw.simulate_voice_turn_stream(payload, db=None)
            return [json.loads(chunk) async for chunk in resp.body_iterator], resp

        for p in patches:
            p.start()
        try:
            out, resp = run(go())
        finally:
            for p in patches:
                p.stop()
        return out, prefetched, resp

    def test_sentences_stream_in_order_then_done_and_audio_is_prefetched_in_the_picked_voice(self):
        out, prefetched, resp = self._stream([{"type": "sentence", "text": "Sure!"}, {"type": "sentence", "text": "Which day works for you?"}])
        self.assertEqual([e["type"] for e in out], ["sentence", "sentence", "done"])
        self.assertEqual([e["text"] for e in out[:2]], ["Sure!", "Which day works for you?"])
        self.assertEqual(prefetched, [("Sure!", "PICKED"), ("Which day works for you?", "PICKED")])  # the voice the user chose, not the saved one
        self.assertEqual(out[-1]["bot_response"], "Sure! Which day works for you?")
        self.assertEqual(out[-1]["stt_language"], "hi-IN")  # the caller asked for Hindi: the browser should listen in Hindi
        self.assertEqual(out[-1]["llm_provider"], "groq")
        self.assertEqual(resp.media_type, "application/x-ndjson")

    def test_legacy_or_unavailable_llm_uses_the_same_protocol(self):
        out, prefetched, _ = self._stream([], has_runtime=False)
        self.assertEqual([e["type"] for e in out], ["sentence", "done"])
        self.assertEqual((out[0]["text"], out[1]["bot_response"]), ("legacy reply", "legacy reply"))
        out2, _, _ = self._stream([], has_runtime=True, degraded=True)  # LLM down before a single word: fall back, do not go silent
        self.assertEqual(out2[0]["text"], "legacy reply")

    def test_identical_audio_requests_share_one_synthesis(self):
        from backend.ai.speech.tts.cartesia import CartesiaTTS

        t = CartesiaTTS()
        t.api_key = "k"
        calls = []

        async def slow(text, voice_id, speed=None, emotion=None, language=None):
            calls.append(text)
            await asyncio.sleep(0.05)
            return b"mp3"

        t._generate_preview_uncached = slow

        async def go():
            # the server's prefetch and the browser's request for the same sentence arrive together
            return await asyncio.gather(t.generate_preview_audio("Hello", "V", language="en"), t.generate_preview_audio("Hello", "V", language="en"),
                                        t.generate_preview_audio("Different", "V", language="en"))

        self.assertEqual(run(go()), [b"mp3", b"mp3", b"mp3"])
        self.assertEqual(sorted(calls), ["Different", "Hello"])  # "Hello" was synthesised once, not twice
        self.assertEqual(t._preview_inflight, {})  # nothing left dangling


class LiveModelCatalog(unittest.TestCase):
    """The AI Studio model picker is fed by the providers' own model lists; a picked model actually drives the agent."""

    def setUp(self):
        from backend.ai.engine.agent.llm_backend import _NO_TOOLS, reset_cooldowns
        from backend.ai.llm import catalog

        catalog.clear_cache()
        _NO_TOOLS.clear()
        reset_cooldowns()

    def test_lists_are_parsed_and_non_chat_models_are_dropped(self):
        from backend.ai.llm import catalog

        groq = {"data": [
            {"id": "openai/gpt-oss-120b", "owned_by": "OpenAI", "active": True, "context_window": 131072},
            {"id": "whisper-large-v3", "active": True}, {"id": "playai-tts", "active": True},
            {"id": "meta-llama/llama-guard-4", "active": True}, {"id": "retired/model", "active": False},
        ]}
        gem = {"models": [
            {"name": "models/gemini-3.1-flash-lite", "displayName": "Gemini 3.1 Flash-Lite", "inputTokenLimit": 1048576, "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-embedding-001", "supportedGenerationMethods": ["embedContent"]},
            {"name": "models/lyria-3-pro-preview", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/nano-banana-pro-preview", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-3.5-transcribe", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-2.5-flash-preview-tts", "supportedGenerationMethods": ["generateContent"]},
        ]}
        self.assertEqual([r["id"] for r in catalog._groq_rows(groq)], ["openai/gpt-oss-120b"])
        rows = catalog._gemini_rows(gem)
        self.assertEqual([(r["id"], r["label"], r["context_window"]) for r in rows], [("gemini-3.1-flash-lite", "Gemini 3.1 Flash-Lite", 1048576)])

    def test_fetch_uses_both_providers_survives_one_failing_and_caches(self):
        from types import SimpleNamespace

        from backend.ai.llm import catalog

        class Client:
            def __init__(self):
                self.calls = []

            async def get(self, url, headers=None):
                self.calls.append(url)
                if "groq" in url:
                    return SimpleNamespace(raise_for_status=lambda: None, json=lambda: {"data": [{"id": "openai/gpt-oss-20b", "active": True}]})
                raise RuntimeError("gemini is down")

        client = Client()
        data = run(catalog.fetch_catalog("gk", "mk", client=client))
        self.assertEqual([m["id"] for m in data["models"]], ["openai/gpt-oss-20b"])  # Groq's models survive Gemini failing
        self.assertIn("gemini", data["errors"])
        run(catalog.fetch_catalog("gk", "mk", client=client))
        self.assertEqual(len(client.calls), 2)  # second call served from cache: no new requests
        self.assertEqual(run(catalog.fetch_catalog(None, None, client=Client(), force=True))["errors"].keys(), {"groq", "gemini"})

    def test_route_marks_chain_position_and_learned_tool_support(self):
        from types import SimpleNamespace
        from unittest.mock import AsyncMock, patch

        from backend.ai.engine.agent.llm_backend import _NO_TOOLS
        from backend.server.api.routes import voice

        rows = [{"provider": "groq", "id": "allam-2-7b", "label": "allam", "context_window": 4096},
                {"provider": "gemini", "id": "gemini-x", "label": "X", "context_window": 1},
                {"provider": "groq", "id": "openai/gpt-oss-120b", "label": "120b", "context_window": 131072}]
        settings = SimpleNamespace(GEMINI_API_KEY="k", GEMINI_MODEL="gemini-x", LLM_PROVIDERS="groq:openai/gpt-oss-120b,gemini")
        _NO_TOOLS.add(("groq", "allam-2-7b"))
        with patch("backend.ai.llm.catalog.fetch_catalog", AsyncMock(return_value={"models": rows, "errors": {}})), \
             patch("backend.server.common.config.get_settings", return_value=settings):
            out = run(voice.list_llm_models())
        self.assertEqual(out["chain"], ["groq:openai/gpt-oss-120b", "gemini:gemini-x"])
        self.assertEqual([m["value"] for m in out["models"]], ["groq:openai/gpt-oss-120b", "gemini:gemini-x", "groq:allam-2-7b"])  # chain first
        by = {m["value"]: m for m in out["models"]}
        self.assertEqual(by["groq:openai/gpt-oss-120b"]["chain_position"], 1)
        self.assertIsNone(by["groq:allam-2-7b"]["chain_position"])
        self.assertEqual(by["groq:allam-2-7b"]["tool_calling"], "no")  # learned from an earlier refusal
        self.assertEqual(by["gemini:gemini-x"]["tool_calling"], "unknown")

    def test_the_picked_model_goes_first_and_old_labels_are_ignored(self):
        from types import SimpleNamespace
        from unittest.mock import patch

        from backend.ai.engine.agent.llm_backend import build_chat_backend
        from backend.ai.llm.client import llm_client

        settings = SimpleNamespace(GEMINI_API_KEY="k", GEMINI_MODEL="gemini-3.1-flash-lite", LLM_PROVIDERS="groq,gemini")

        def chain(preferred):
            with patch.object(llm_client, "api_key", "g"), patch("backend.server.common.config.get_settings", return_value=settings):
                return [b.provider for b in build_chat_backend(preferred=preferred).backends]

        self.assertEqual(chain(None), ["groq", "gemini"])
        self.assertEqual(chain("groq:openai/gpt-oss-120b"), ["groq:openai/gpt-oss-120b", "groq", "gemini"])
        self.assertEqual(chain("gemini:gemini-3.8-flash"), ["gemini:gemini-3.8-flash", "groq", "gemini"])  # a different Gemini model is its own provider
        self.assertEqual(chain("gemini:gemini-3.1-flash-lite"), ["gemini", "groq"])  # already the default: not duplicated
        self.assertEqual(chain("Groq LLaMA 3.3 70B"), ["groq", "gemini"])  # the old static label from the old dropdown

    def test_profile_reads_the_picked_model(self):
        from backend.ai.engine.agent.facts import load_profile
        from backend.server.database.models.agent import Agent

        factory, biz = make_db_factory()
        with factory() as db:
            db.query(Agent).filter(Agent.business_id == biz).one().config = {"model": "gemini:gemini-3.8-flash"}
            db.commit()
            self.assertEqual(load_profile(db, biz).llm_model, "gemini:gemini-3.8-flash")

    def test_a_model_without_tool_support_is_learned_and_skipped_for_tool_turns(self):
        from backend.ai.engine.agent.llm_backend import FallbackChatBackend, _NO_TOOLS, tool_calling_status

        refusing = _compat("groq", _Resp(400, text='{"error":{"message":"`tool calling` is not supported with this model"}}'))
        refusing.kind, refusing.model = "groq", "allam-2-7b"
        working = _compat("gemini", _ok("Hi from the model with tools"), _ok("Second"))
        working.kind, working.model = "gemini", "gemini-x"
        tools = [{"type": "function", "function": {"name": "f", "parameters": {"type": "object", "properties": {}}}}]
        fb = FallbackChatBackend([refusing, working])
        self.assertEqual(run(fb.chat([{"role": "user", "content": "hi"}], tools))["content"], "Hi from the model with tools")
        self.assertIn(("groq", "allam-2-7b"), _NO_TOOLS)
        self.assertEqual(tool_calling_status("groq", "allam-2-7b"), "no")
        self.assertEqual(len(refusing.http.requests), 1)  # asked once, never retried
        # later tool turns skip it without even asking; plain chat (no tools) may still use it
        run(fb.chat([{"role": "user", "content": "again"}], tools))
        self.assertEqual(len(refusing.http.requests), 1)


class RememberedLanguage(unittest.TestCase):
    def test_language_requests_are_detected(self):
        from backend.ai.engine.agent.hindi import requested_language as ask

        for said in ("can we talk in hindi", "hindi mein baat karo", "कैन वी टॉक इन हिंदी", "हिंदी में बात करो", "please speak in Hindi"):
            self.assertEqual(ask(said), "hi", said)
        for said in ("english mein baat karo", "can we talk in english", "इंग्लिश में बोलो"):
            self.assertEqual(ask(said), "en", said)
        self.assertEqual(ask("hindi nahi, english mein"), "en")  # the later mention wins
        for said in ("hello", "मेरा नाम परीक्षित है", "I speak Hindi at home"):
            self.assertIsNone(ask(said), said)

    def test_request_is_remembered_on_every_later_turn_until_changed(self):
        backend = ScriptedBackend(reply("Ji zaroor."), reply("Aapka naam?"), reply("Sure, English."))
        engine, _ = make_engine(backend)
        run(engine.turn("can we talk in hindi"))
        run(engine.turn("my name is Parikshit Verma"))  # English words again: the model would tend to drift back
        second_turn_messages = backend.seen[1]["messages"]
        self.assertIn("speak Hindi", second_turn_messages[-1]["content"])
        self.assertEqual(second_turn_messages[-1]["role"], "system")
        run(engine.turn("english please, in english"))
        self.assertIn("speak English", backend.seen[2]["messages"][-1]["content"])

    def test_no_note_without_a_request(self):
        backend = ScriptedBackend(reply("Hello!"))
        engine, _ = make_engine(backend)
        run(engine.turn("hi"))
        self.assertEqual(backend.seen[0]["messages"][-1]["role"], "user")
        self.assertIsNone(engine.language_pref)

    def test_gemini_thinking_is_off_for_flash_models(self):
        from backend.ai.engine.agent.llm_backend import GeminiChatBackend

        self.assertEqual(GeminiChatBackend(model="gemini-3.1-flash-lite").extra_payload(), {"reasoning_effort": "none"})
        self.assertEqual(GeminiChatBackend(model="gemini-3.9-pro").extra_payload(), {})


class PersonaFollowsTheVoice(unittest.TestCase):
    """The persona (name, Hindi grammatical gender) must match the agent and voice the dashboard shows."""

    def test_voice_gender_lookup_and_caching(self):
        from types import SimpleNamespace
        from unittest.mock import patch

        from backend.ai.speech.tts import voice_meta

        voice_meta._GENDER_CACHE.clear()
        answers = {"f": "feminine", "m": "masculine", "n": "gender_neutral"}
        calls = []

        def fake_get(url, headers=None, timeout=None):
            calls.append(url)
            vid = url.rsplit("/", 1)[1]
            if vid == "boom":
                raise RuntimeError("network down")
            return SimpleNamespace(status_code=200, json=lambda: {"gender": answers.get(vid)})

        settings = SimpleNamespace(CARTESIA_API_KEY="k")
        with patch.object(voice_meta.httpx, "get", fake_get), patch("backend.server.common.config.get_settings", return_value=settings):
            self.assertEqual(voice_meta.voice_gender("f"), "female")
            self.assertEqual(voice_meta.voice_gender("m"), "male")
            self.assertIsNone(voice_meta.voice_gender("n"))  # neutral/unknown: no forced gender
            voice_meta.voice_gender("f")
            self.assertEqual(calls.count("https://api.cartesia.ai/voices/f"), 1)  # cached
            self.assertIsNone(voice_meta.voice_gender("boom"))
            self.assertIsNone(voice_meta.voice_gender("boom"))
            self.assertEqual(calls.count("https://api.cartesia.ai/voices/boom"), 2)  # failures are retried, not cached
            self.assertIsNone(voice_meta.voice_gender(None))
        voice_meta._GENDER_CACHE.clear()

    def _agent_config(self, config, voice_model=""):
        from backend.server.database.models.agent import Agent

        factory, biz = make_db_factory()
        with factory() as db:
            a = db.query(Agent).filter(Agent.business_id == biz).one()
            a.config, a.voice_model = config, voice_model
            db.commit()
        return factory, biz

    def test_profile_gender_comes_from_the_saved_voice(self):
        from unittest.mock import patch

        from backend.ai.engine.agent.facts import load_all

        factory, biz = self._agent_config({"tts_provider": {"voice_id": "VOICE-M"}})
        with patch("backend.ai.engine.agent.facts.voice_gender", lambda v: {"VOICE-M": "male"}.get(v)) as _:
            _, profile = load_all(factory, biz)
        self.assertEqual((profile.voice_id, profile.gender), ("VOICE-M", "male"))

        factory, biz = self._agent_config({}, voice_model="VOICE-F")  # falls back to Agent.voice_model
        with patch("backend.ai.engine.agent.facts.voice_gender", lambda v: {"VOICE-F": "female"}.get(v)):
            _, profile = load_all(factory, biz)
        self.assertEqual(profile.gender, "female")

        factory, biz = self._agent_config({"gender": "female", "tts_provider": {"voice_id": "VOICE-M"}})
        with patch("backend.ai.engine.agent.facts.voice_gender", lambda v: "male"):
            _, profile = load_all(factory, biz)
        self.assertEqual(profile.gender, "female")  # an explicit owner setting still wins

    def test_a_business_with_two_agents_always_uses_the_oldest_like_the_dashboard(self):
        from datetime import datetime, timezone

        from backend.ai.engine.agent.facts import load_profile
        from backend.server.database.models.agent import Agent

        factory, biz = make_db_factory()
        with factory() as db:
            db.add(Agent(business_id=biz, name="AMSh Receptionist", primary_language="hi", config={"personality": "Crisp & Professional"},
                         created_at=datetime(2030, 1, 1, tzinfo=timezone.utc)))
            db.commit()
            for _ in range(3):  # stable across repeated loads (an unordered .first() is not)
                self.assertEqual(load_profile(db, biz).name, "Maya")

    def test_prompt_pins_the_grammatical_gender(self):
        female = self._prompt("female")
        self.assertIn("your voice is female", female)
        self.assertIn("kar sakti hoon", female)
        self.assertNotIn("kar sakta hoon", female)
        male = self._prompt("male")
        self.assertIn("your voice is male", male)
        self.assertIn("kar sakta hoon", male)
        unknown = self._prompt(None)
        self.assertIn("GENDER: unknown", unknown)
        for p in (female, male, unknown):
            self.assertIn("slash form", p)  # the "sakta/sakti" hedge is explicitly banned

    @staticmethod
    def _prompt(gender):
        from backend.ai.engine.agent.facts import load_all
        from backend.ai.engine.agent.prompt_builder import build_system_prompt

        factory, biz = make_db_factory()
        facts, _ = load_all(factory, biz)
        return build_system_prompt(facts, "Maya", FIXED_NOW, "+91", None, gender)


class ClaimsLeaksAndConsent(unittest.TestCase):
    """Guards against what a real transcript showed: 'confirmed' said without a booking, model reasoning spoken aloud,
    the calling number used without asking, and English replies to a Hindi caller."""

    def test_completed_action_claims_need_a_tool(self):
        from backend.ai.engine.agent.grounding import unbacked_claim as claim

        for said in ("Your appointment is confirmed for tomorrow.", "I've booked you in.", "You're all set!", "आपका अपॉइंटमेंट कन्फर्म हो गया है।",
                     "आपकी बुकिंग बुक हो गई", "Booking is done.", "Your appointment has been cancelled.", "It has been rescheduled."):
            self.assertIsNotNone(claim(said, set()), said)
        for said in ("Shall I confirm this appointment?", "Should I book that for you?", "Your appointment details are: tomorrow at ten.",
                     "Would you like it confirmed?", "Which day works for you?"):
            self.assertIsNone(claim(said, set()), said)
        self.assertIsNone(claim("Your appointment is confirmed.", {"book"}))  # a tool did confirm it
        self.assertEqual(claim("Your appointment is cancelled.", {"book"}), "cancel")  # a booking does not back a cancel claim

    def test_a_false_confirmation_is_never_spoken(self):
        backend = ScriptedBackend(
            reply("Great, Parikshit! Your Dental Consultation is confirmed for tomorrow at 10 AM."),  # no tool was called
            reply("Let me read the details back. Shall I confirm the booking?"),
        )
        engine, _ = make_engine(backend)
        out = run(engine.turn("this is correct"))
        self.assertNotIn("is confirmed", out.reply)
        self.assertIn("Shall I confirm", out.reply)
        self.assertIn("no tool has confirmed", backend.seen[1]["messages"][-1]["content"])  # the model was told why

    def test_repeat_offender_gets_a_safe_line_instead_of_a_false_claim(self):
        backend = ScriptedBackend(reply("Your appointment is booked."), reply("Yes, you are booked!"))
        engine, _ = make_engine(backend)
        out = run(engine.turn("yes please"))
        self.assertNotIn("booked", out.reply.lower())
        self.assertIn("double-check", out.reply)

    def test_the_same_claim_is_fine_once_a_tool_really_booked(self):
        book = lambda c: call("book_appointment", **{**BOOK, "confirmed_by_caller": c})
        backend = ScriptedBackend(book(False), reply("Shall I confirm it?"), book(True), reply("You're all set, Parikshit! Your appointment is confirmed."))
        engine, _ = make_engine(backend)
        run(engine.turn("book General Consultation with Dr Sharma tomorrow 10 am, Parikshit Verma, 9876543210"))
        out = run(engine.turn("yes"))
        self.assertIn("all set", out.reply)
        self.assertIn("book", engine.toolbox.succeeded)

    def test_model_reasoning_is_never_spoken(self):
        from backend.ai.engine.agent.agent_loop import clean_for_speech

        garbled = "Your … ... … … …… … We need to respond confirming. Great, Parikshit! Your Dental Consultation is ready."
        cleaned = clean_for_speech(garbled)
        self.assertNotIn("We need to respond", cleaned)
        self.assertIn("Great, Parikshit!", cleaned)
        self.assertEqual(clean_for_speech("The user says hello. Hi there!"), "Hi there!")
        self.assertEqual(clean_for_speech("... … ..."), "")
        self.assertEqual(clean_for_speech("We need to confirm your number first."), "We need to confirm your number first.")  # real speech survives

    def test_calling_number_needs_an_explicit_yes(self):
        engine, _ = make_engine(ScriptedBackend(reply("Shall I use the number you're calling from?"), reply("Great."), reply("Ok."), reply("Sure.")))
        run(engine.turn("book an appointment"))
        self.assertFalse(engine.toolbox.caller_number_ok)
        run(engine.turn("yes"))  # yes to the offer
        self.assertTrue(engine.toolbox.caller_number_ok)

        engine2, _ = make_engine(ScriptedBackend(reply("Which day?"), reply("Fine.")))
        run(engine2.turn("book me tomorrow"))
        run(engine2.turn("yes"))  # a yes to something else is not consent to the calling number
        self.assertFalse(engine2.toolbox.caller_number_ok)

        engine3, _ = make_engine(ScriptedBackend(reply("What number should I use?")))
        run(engine3.turn("use the same number please"))
        self.assertTrue(engine3.toolbox.caller_number_ok)

        engine4, _ = make_engine(ScriptedBackend(reply("Is +91 98765 43210 right?"), reply("Ok.")))
        run(engine4.turn("book me"))
        run(engine4.turn("haan"))  # our reply quoted their number, so this yes is about it
        self.assertTrue(engine4.toolbox.caller_number_ok)

    def test_hindi_speaker_gets_a_devanagari_reply_instruction(self):
        backend = ScriptedBackend(reply("नमस्ते!"), reply("Hello!"), reply("ठीक है।"))
        engine, _ = make_engine(backend)
        run(engine.turn("टुमारो एट एनी टाइम"))  # English words in Devanagari: still a Hindi speaker for our purposes
        self.assertIn("reply in Hindi written in Devanagari", backend.seen[0]["messages"][-1]["content"])
        run(engine.turn("hello there"))
        self.assertEqual(backend.seen[1]["messages"][-1]["role"], "user")  # a Latin-script turn gets no note

        engine_off, _ = make_engine(ScriptedBackend(reply("ok")), )
        engine_off.auto_detect_language = False  # the owner pinned the language: never override it
        run(engine_off.turn("नमस्ते"))
        self.assertNotIn("Devanagari", engine_off.backend.seen[0]["messages"][-1]["content"])

        engine_en, _ = make_engine(ScriptedBackend(reply("Sure.")))
        run(engine_en.turn("please talk in english, नमस्ते"))
        self.assertIn("speak English", engine_en.backend.seen[0]["messages"][-1]["content"])  # an explicit request wins


class HindiVoiceConsistency(unittest.TestCase):
    """Transcript regression: a female Hindi agent said 'समझ गया' and then slid into English after being asked for Hindi."""

    def test_verb_endings_follow_the_agent_gender(self):
        from backend.ai.engine.agent.hindi import match_speaker_gender as fit

        self.assertEqual(fit("समझ गया। ठीक है", "female"), "समझ गई। ठीक है")
        self.assertEqual(fit("मैं बुक करूँगा", "female"), "मैं बुक करूँगी")
        self.assertEqual(fit("मैं आपकी मदद कर सकता हूँ", "female"), "मैं आपकी मदद कर सकती हूँ")
        self.assertEqual(fit("Main samajh gaya, karunga", "female"), "Main samajh gayi, karungi")
        self.assertEqual(fit("मैं समझ गई", "male"), "मैं समझ गया")
        self.assertEqual(fit("दिन निकल गया", "female"), "दिन निकल गया")  # not first person: untouched
        self.assertEqual(fit("समझ गया", None), "समझ गया")  # unknown gender: no guessing

    def test_english_sentence_detection(self):
        from backend.ai.engine.agent.hindi import looks_english

        self.assertTrue(looks_english("Which day works for you?"))
        for fine in ("Sure!", "Dr. Sharma ke saath", "Aap kis din aana chahenge?", "कल किस समय आना चाहेंगे?"):
            self.assertFalse(looks_english(fine), fine)

    def test_spoken_reply_is_gender_fixed(self):
        engine, _ = make_engine(ScriptedBackend(reply("समझ गया। कौन सा दिन ठीक रहेगा?")))
        engine.gender = "female"
        out = run(engine.turn("हिंदी में बात करो"))
        self.assertIn("समझ गई", out.reply)
        self.assertNotIn("समझ गया", out.reply)

    def test_english_reply_to_a_hindi_caller_is_regenerated_once(self):
        backend = ScriptedBackend(reply("ज़रूर, हिंदी में बात करते हैं।"), reply("Which day works for you?"), reply("आप किस दिन आना चाहेंगे?"))
        engine, _ = make_engine(backend)
        run(engine.turn("मेरे को हिंदी में बात करके दिखाओ"))  # asks for Hindi: remembered
        out = run(engine.turn("नथिंग"))
        self.assertEqual(len(backend.seen), 3)  # turn 1 once; turn 2 twice (English draft + Hindi correction)
        self.assertIn("किस दिन", out.reply)
        self.assertNotIn("Which day", out.reply)
        self.assertIn("Hindi", backend.seen[-1]["messages"][-1]["content"])

    def test_the_guard_corrects_only_once_per_turn(self):
        backend = ScriptedBackend(reply("Which day works for you?"), reply("Which day would suit you best?"))
        engine, _ = make_engine(backend)
        engine.language_pref = "hi"
        out = run(engine.turn("ok"))
        self.assertEqual(len(backend.seen), 2)  # no endless loop: the second English answer goes through
        self.assertIn("suit you", out.reply)

    def test_a_restarted_server_resumes_the_conversation(self):
        """Code reloads drop in-memory sessions: the agent re-greeted ('नमस्ते! मैं Sarah…') and forgot the caller wanted Hindi."""
        backend = ScriptedBackend(reply("ठीक है, आप कब आना चाहेंगे?"))
        engine, _ = make_engine(backend)
        engine.greeting("Hi, welcome.")
        engine.restore([("मेरे को हिंदी में बात करके दिखाओ", "ज़रूर, हिंदी में बात करते हैं।"), ("अपॉइंटमेंट बुक करनी है", "किस सेवा के लिए?")])
        self.assertEqual(engine.language_pref, "hi")
        run(engine.turn("कल"))
        sent = backend.seen[0]["messages"]
        texts = [m.get("content") for m in sent]
        self.assertIn("अपॉइंटमेंट बुक करनी है", texts)  # earlier turns are back in the model's context
        self.assertIn("किस सेवा के लिए?", texts)
        self.assertTrue(any("Reply in Hindi" in (m.get("content") or "") for m in sent if m["role"] == "system"))

    def test_saved_transcript_is_read_back_as_pairs(self):
        from unittest.mock import patch

        from backend.server.database.models.message import Message
        from backend.server.services import call_recorder

        factory, biz = make_db_factory()
        db = factory()
        from backend.server.database.models.call import Call

        db.add(Call(id="resume_1", business_id=biz, caller_number="+91", outcome="live"))
        for seq, who, text in ((0, "AI", "Hello"), (1, "User", "book"), (2, "AI", "which service?"), (3, "User", "cleaning"), (4, "AI", "which day?")):
            db.add(Message(id=f"m{seq}", call_id="resume_1", speaker=who, text=text, sequence=seq))
        db.commit()
        with patch.object(call_recorder, "SessionLocal", factory):
            self.assertEqual(call_recorder.load_call_turns("resume_1"), [("book", "which service?"), ("cleaning", "which day?")])
            self.assertEqual(call_recorder.load_call_turns("unknown"), [])

    def test_english_filler_and_emoji_are_not_spoken_in_a_hindi_call(self):
        backend = ScriptedBackend(reply("Sure! ठीक है 😄 आप कब आना चाहेंगे?"))
        engine, _ = make_engine(backend)
        engine.language_pref = "hi"
        out = run(engine.turn("ok"))
        self.assertNotIn("Sure", out.reply)
        self.assertNotIn("😄", out.reply)
        self.assertIn("आप कब आना चाहेंगे", out.reply)
        english, _ = make_engine(ScriptedBackend(reply("Sure! Which day works for you?")))
        self.assertIn("Sure", run(english.turn("hello")).reply)  # English call: untouched

    def test_an_open_booking_survives_small_talk(self):
        """Transcript: the caller gave 'परसों', then asked 'what is my name'; the date was never confirmed."""
        backend = ScriptedBackend(reply("ज़रूर।"), reply("आपका नाम परीक्षित है।"))
        engine, _ = make_engine(backend)
        run(engine.turn("मेरे को परसों की अपॉइंटमेंट बुक करनी है"))
        run(engine.turn("मेरा नाम क्या है"))
        note = backend.seen[1]["messages"][-1]["content"]
        self.assertIn("BOOKING IN PROGRESS", note)
        self.assertIn("2026-09-30", note)  # परसों resolved against the fixed test date
        self.assertIn("time", note)
        chat = ScriptedBackend(reply("Hello!"))
        engine2, _ = make_engine(chat)
        run(engine2.turn("hi, what are your timings?"))
        self.assertNotIn("BOOKING IN PROGRESS", " ".join(m.get("content") or "" for m in chat.seen[0]["messages"]))

    def test_a_finished_booking_stops_the_reminder(self):
        from backend.ai.engine.agent.progress import booking_note

        self.assertIsNone(booking_note(["book tomorrow 10 am"], {"book"}, date(2026, 9, 28)))

    def test_emotion_cues_are_parsed_and_never_spoken(self):
        from backend.ai.engine.agent.emotion import parse_cues, tts_text

        self.assertEqual(parse_cues("[warm] Of course, Parikshit."), ("Of course, Parikshit.", "warm", False))
        self.assertEqual(parse_cues("[laugh] Haha, good one!"), ("good one!", None, True))  # a written "Haha" is not read out
        self.assertEqual(parse_cues("[smile] Sure."), ("Sure.", None, False))  # unknown tag: dropped, not spoken
        self.assertEqual(parse_cues("Dr. Sharma (OPD) is in."), ("Dr. Sharma (OPD) is in.", None, False))  # real parentheses stay
        self.assertEqual(tts_text("Good one!", True), "[laughter] Good one!")
        self.assertEqual(tts_text("Good one!", False), "Good one!")

    def test_business_hours_rule_reads_the_real_schema(self):
        from datetime import datetime

        from backend.ai.capabilities.rules.business_hours import BusinessHoursRule as Hours

        week = {d: [{"start": "09:00", "end": "17:00"}] for d in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday")}
        week["Saturday"] = []
        mon = lambda h, m=0: datetime(2026, 9, 28, h, m)  # a Monday
        self.assertEqual(Hours.describe(week, mon(10)), "OPEN NOW until 05:00 PM today.")
        self.assertEqual(Hours.describe(week, mon(7)), "CLOSED NOW; opens today at 09:00 AM.")
        self.assertEqual(Hours.describe(week, mon(18)), "CLOSED NOW; next opens tomorrow at 09:00 AM.")
        self.assertEqual(Hours.describe(week, datetime(2026, 10, 3, 11)), "CLOSED NOW; next opens Monday at 09:00 AM.")  # Saturday
        self.assertEqual(Hours.describe({}, mon(10)), "")
        self.assertIn("OPEN NOW", Hours.describe(week, mon(10)))

    def test_emergency_and_pii_rules_are_wired_into_the_agent(self):
        from backend.ai.capabilities.rules.compliance_pii import CompliancePIIRule

        engine, _ = make_engine(ScriptedBackend(reply("ok")))
        out = run(engine.turn("mujhe seene mein dard hai aur saans nahi aa rahi"))
        self.assertTrue(out.transferred or "emergency" in out.reply.lower() or out.tools)
        self.assertEqual(CompliancePIIRule.redact("call +91 98765 43210 or a@b.com"), "call [PHONE_REDACTED] or [EMAIL_REDACTED]")

    def test_hindi_tags_and_written_laughs_never_reach_the_voice(self):
        """Transcript: the model wrote "[हँसते हुए] धन्यवाद!" and "हाहाहा, मैं तो..." and the voice spoke/showed them."""
        from backend.ai.engine.agent.emotion import EmotionState, parse_cues

        self.assertEqual(parse_cues("[हँसते हुए] धन्यवाद! फिर बताइए"), ("धन्यवाद! फिर बताइए", None, True))
        self.assertEqual(parse_cues("हाहाहा, मैं तो बस स्वागत कर रही हूँ"), ("मैं तो बस स्वागत कर रही हूँ", None, True))
        self.assertEqual(parse_cues("Hahaha, good one"), ("good one", None, True))
        state = EmotionState()
        state.hear("hahaha you are funny")
        state.direct(None, True, True)  # a laugh just played
        state.hear("तुम हंस के दिखाओ")  # but this caller asked for one
        self.assertTrue(state.direct(None, True, True)[1])

    def test_the_callers_mood_is_read_from_their_words(self):
        from backend.ai.engine.agent.emotion import caller_mood

        self.assertEqual(caller_mood("हा हा हा बहुत मज़ेदार"), "amused")
        self.assertEqual(caller_mood("mujhe bahut dard ho raha hai"), "worried")
        self.assertEqual(caller_mood("this is the worst service"), "upset")
        self.assertEqual(caller_mood("thanks a lot"), "thankful")
        self.assertIsNone(caller_mood("हे हे सुन मेरी बात"))  # calling for attention is not laughing
        self.assertEqual(caller_mood("hahaha but I am in pain"), "worried")  # a serious mood beats a joke

    def test_laughter_is_rare_and_never_for_a_worried_caller(self):
        from backend.ai.engine.agent.emotion import EmotionState

        state = EmotionState()
        state.hear("hahaha you are funny")
        self.assertEqual(state.direct("playful", True, True), ("joking/comedic", True))
        state.hear("haha again")
        self.assertEqual(state.direct("playful", True, True), ("joking/comedic", False))  # too soon after the last laugh
        worried = EmotionState()
        worried.hear("I am scared, it hurts")
        emotion, laugh = worried.direct("happy", True, True)
        self.assertFalse(laugh)
        self.assertEqual(emotion, "sympathetic")  # cheerful cue replaced
        plain = EmotionState()
        plain.hear("book me an appointment")
        self.assertEqual(plain.direct(None, False, True), (None, False))  # no mood, no cue: neutral voice
        thanks = EmotionState()
        thanks.hear("thank you so much")
        self.assertEqual(thanks.direct(None, False, True)[0], "content")  # mood picks a default when the model gave none

    def test_engine_sentence_events_carry_the_emotion_and_hide_the_tags(self):
        engine, _ = make_engine(ScriptedBackend(reply("[laugh] Haha, good one! [warm] How can I help you today?")))
        events = []

        async def collect():
            async for ev in engine.turn_events("hahaha you are funny", stream=True):
                events.append(ev)

        run(collect())
        sentences = [e for e in events if e["type"] == "sentence"]
        self.assertTrue(sentences)
        for e in sentences:
            self.assertNotIn("[", e["text"])
        self.assertTrue(any(e.get("tts_text", "").startswith("[laughter] ") for e in sentences))
        self.assertIn("MOOD: the caller is joking", " ".join(m.get("content") or "" for m in engine.backend.seen[0]["messages"]))

    def test_the_model_is_taught_the_cues(self):
        from backend.ai.engine.agent.prompt_builder import build_system_prompt

        engine, _ = make_engine(ScriptedBackend(reply("ok")))
        self.assertIn("[sympathetic]", engine._system)
        self.assertIn("Cues are never spoken", engine._system)

    def test_english_is_fine_when_the_caller_asked_for_english(self):
        backend = ScriptedBackend(reply("Which day works for you?"))
        engine, _ = make_engine(backend)
        out = run(engine.turn("please speak in english, नमस्ते"))
        self.assertEqual(len(backend.seen), 1)
        self.assertIn("Which day", out.reply)


class WhatsAppChannel(unittest.TestCase):
    """WhatsApp used to be a stub that only printed inbound messages; now the same agent answers in text."""

    PAYLOAD = {
        "entry": [{"changes": [{"value": {
            "metadata": {"phone_number_id": "111"},
            "contacts": [{"wa_id": "919876500001", "profile": {"name": "Asha"}}],
            "messages": [
                {"from": "919876500001", "id": "wamid.1", "type": "text", "text": {"body": "hi, do you do teeth whitening?"}},
                {"from": "919876500001", "id": "wamid.2", "type": "image"},
            ],
            "statuses": [{"id": "x", "status": "delivered"}],
        }}]}]
    }

    def test_signature_check(self):
        import hashlib
        import hmac

        from backend.server.services.whatsapp_agent import verify_signature

        body = b'{"a": 1}'
        good = "sha256=" + hmac.new(b"secret", body, hashlib.sha256).hexdigest()
        self.assertTrue(verify_signature(body, good, "secret"))
        self.assertFalse(verify_signature(body, good, "other"))
        self.assertFalse(verify_signature(body, None, "secret"))
        self.assertFalse(verify_signature(body + b" ", good, "secret"))
        self.assertTrue(verify_signature(body, None, None))  # no secret configured (local development)

    def test_payload_parsing_and_conversation_id(self):
        from datetime import datetime, timezone

        from backend.server.services.whatsapp_agent import conversation_id, extract_messages

        msgs = extract_messages(self.PAYLOAD)
        self.assertEqual([m.message_id for m in msgs], ["wamid.1", "wamid.2"])  # status updates are ignored
        self.assertEqual(msgs[0].text, "hi, do you do teeth whitening?")
        self.assertEqual(msgs[0].sender_name, "Asha")
        self.assertEqual(msgs[1].text, "")  # an image has no text
        self.assertEqual(msgs[0].phone_number_id, "111")
        self.assertEqual(conversation_id("abcdef1234567", "9198", datetime(2026, 9, 28, tzinfo=timezone.utc)), "wa_abcdef12_9198_20260928")

    def _agent(self, *replies):
        from unittest.mock import patch

        from backend.server.database.models.integration import Integration
        from backend.server.services import call_recorder, whatsapp_agent as wa

        factory, biz = make_db_factory()
        with factory() as db:
            db.add(Integration(business_id=biz, provider="whatsapp", status="connected", config={"phone_number_id": "111", "access_token": "x"}))
            db.commit()
        backend = ScriptedBackend(*replies)
        sent = []

        async def fake_send(config, to, body):
            sent.append((to, body))
            return True

        agent = wa.WhatsAppAgent()
        agent.send = fake_send
        patches = [
            patch.object(wa, "SessionLocal", factory),
            patch.object(call_recorder, "SessionLocal", factory),
            patch("backend.server.database.session.SessionLocal", factory),
            patch("backend.ai.engine.agent.runtime.build_chat_backend", lambda **kw: backend),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        return agent, sent, biz, backend

    def test_a_patient_message_gets_an_agent_reply_and_is_stored(self):
        from backend.server.services.call_recorder import load_call_turns
        from backend.server.services.whatsapp_agent import Inbound, conversation_id

        agent, sent, biz, backend = self._agent(reply("Yes, we do teeth whitening. Which day works for you?"))
        msg = Inbound("111", "919876500001", "wamid.1", "hi, do you do teeth whitening?", "Asha")
        out = run(agent.handle(msg))
        self.assertIn("teeth whitening", out)
        self.assertEqual(sent, [("919876500001", out)])
        self.assertEqual(run(agent.handle(msg)), None)  # Meta retries: the same message id is answered once
        self.assertEqual(len(sent), 1)
        system = backend.seen[0]["messages"][0]["content"]
        self.assertIn("WhatsApp text chat", system)  # the chat channel prompt, not "a live phone call"
        self.assertNotIn("live phone call", system)
        turns = load_call_turns(conversation_id(biz, "919876500001"))
        self.assertEqual(turns, [("hi, do you do teeth whitening?", out)])

    def test_chat_has_no_transfer_or_hangup_and_emergencies_only_reply(self):
        from backend.server.services.whatsapp_agent import Inbound, conversation_id

        agent, sent, biz, backend = self._agent(reply("ok"))
        run(agent.handle(Inbound("111", "919876500002", "wamid.9", "I have chest pain and cannot breathe", None)))
        self.assertEqual(len(sent), 1)
        self.assertIn("emergency", sent[0][1].lower())  # answered by the safety gate, no LLM call, no call to redirect
        rt = agent._runtimes[conversation_id(biz, "919876500002")]
        names = {t["function"]["name"] for t in rt.engine.tools}
        self.assertNotIn("transfer_to_human", names)
        self.assertNotIn("end_call", names)
        self.assertIn("book_appointment", names)

    def test_unknown_number_and_non_text_messages(self):
        from backend.server.services.whatsapp_agent import NOT_TEXT_REPLY, Inbound

        agent, sent, _, _ = self._agent(reply("unused"))
        self.assertIsNone(run(agent.handle(Inbound("999", "9198", "wamid.5", "hello", None))))  # no clinic owns that number
        self.assertEqual(sent, [])
        self.assertEqual(run(agent.handle(Inbound("111", "9198", "wamid.6", "", None))), NOT_TEXT_REPLY)

    def test_a_restarted_server_resumes_the_whatsapp_conversation(self):
        from backend.server.services.whatsapp_agent import Inbound

        agent, sent, biz, backend = self._agent(reply("Great, which day?"), reply("Thursday works. What time?"))
        run(agent.handle(Inbound("111", "9198", "wamid.7", "I want a whitening appointment", None)))
        agent._runtimes.clear()  # a code reload drops memory
        agent._seq.clear()
        run(agent.handle(Inbound("111", "9198", "wamid.8", "Thursday", None)))
        contents = [m.get("content") for m in backend.seen[-1]["messages"]]
        self.assertIn("I want a whitening appointment", contents)  # the earlier turn came back from the database


class OneQuestionRule(unittest.TestCase):
    def test_glued_sentences_are_split(self):
        s = SentenceSplitter()
        self.assertEqual(s.feed("Got it. What service would you like?Sure thing! Which one?") + s.flush(),
                         ["Got it.", "What service would you like?", "Sure thing!", "Which one?"])

    def test_only_the_last_of_two_questions_is_spoken(self):
        backend = ScriptedBackend(reply("Got it, that's your number. What service would you like to book?Sure thing! Which service are you after?"))
        engine, _ = make_engine(backend)
        out = run(engine.turn("nine eight seven six five four three two one zero"))
        self.assertEqual(out.reply.count("?"), 1)
        self.assertIn("Which service are you after?", out.reply)
        self.assertNotIn("What service would you like", out.reply)
        self.assertIn("Sure thing!", out.reply)

    def test_a_single_question_and_statements_pass_through(self):
        engine, _ = make_engine(ScriptedBackend(reply("Great! Ten AM tomorrow works. Shall I book it?")))
        out = run(engine.turn("tomorrow at 10 am please"))
        self.assertEqual(out.reply, "Great! Ten AM tomorrow works. Shall I book it?")

    def test_streamed_duplicate_question_is_dropped_before_speaking(self):
        engine, _ = make_engine(ScriptedBackend(reply("What service?Sure thing! Which service are you after?")))

        async def collect():
            return [e["text"] async for e in engine.turn_events("hi", stream=True) if e["type"] == "sentence"]

        spoken = run(collect())
        self.assertEqual(spoken, ["Sure thing!", "Which service are you after?"])


class TextHelpers(unittest.TestCase):
    def test_sentence_splitter_handles_abbreviations_and_danda(self):
        s = SentenceSplitter()
        got = s.feed("Dr. Sharma is free. Kya aap aayenge? Haan। Theek") + s.flush()
        self.assertEqual(got, ["Dr. Sharma is free.", "Kya aap aayenge?", "Haan।", "Theek"])

    def test_clean_for_speech(self):
        self.assertEqual(clean_for_speech("**Sure!**  <think>hmm</think> `ok`"), "Sure! ok")

    def test_parse_sse_line(self):
        self.assertEqual(parse_sse_line('data: {"choices":[{"delta":{"content":"hi"}}]}'), {"content": "hi"})
        self.assertIsNone(parse_sse_line("data: [DONE]"))
        self.assertIsNone(parse_sse_line(": keep-alive"))
        self.assertIsNone(parse_sse_line("data: {broken"))


if __name__ == "__main__":
    unittest.main()

"""Tests for the voice-latency changes (no network, no API key).
Run:  python -m unittest backend.ai.evals.test_voice_latency -v
Covers: early clause chunking (and that it never weakens the time/claim/question guards), concurrent availability
reads, the per-turn latency tracker and its context propagation, LLM stream timing marks, Deepgram speech-end timing,
and the pooled provider clients."""

import asyncio
import json
import time
import unittest

import httpx

from backend.ai.engine.agent.agent_loop import SentenceSplitter
from backend.ai.engine.agent.llm_backend import GroqChatBackend
from backend.ai.evals.test_agent_core import ScriptedBackend, call, make_engine, reply, run
from backend.ai.llm.client import pooled_http_client, reasoning_params
from backend.ai.realtime import latency
from backend.ai.speech.stt.deepgram import DeepgramLiveConnection


def feed_words(splitter, text):
    """Stream `text` word by word, like LLM deltas; returns every piece in emission order."""
    out = []
    words = text.split(" ")
    for i, w in enumerate(words):
        out += splitter.feed(w + (" " if i < len(words) - 1 else ""))
    return out + splitter.flush()


class EarlyChunking(unittest.TestCase):
    def test_off_by_default_keeps_sentence_behaviour(self):
        text = "Sure, I can help you with that appointment, what is your name?"
        self.assertEqual(feed_words(SentenceSplitter(), text), [text])

    def test_first_safe_clause_is_released_before_the_sentence_ends(self):
        s = SentenceSplitter(early=True)
        pieces = feed_words(s, "Sure, I can help you with that appointment, what is your name?")
        self.assertEqual(pieces, ["Sure, I can help you with that appointment,", "what is your name?"])

    def test_released_as_soon_as_the_clause_is_complete(self):
        s = SentenceSplitter(early=True)
        self.assertEqual(s.feed("Absolutely, I can move that appointment, "), ["Absolutely, I can move that appointment,"])
        self.assertEqual(s.feed("could you"), [])  # nothing else early: the rest waits for its full stop

    def test_no_choppy_short_pieces(self):
        s = SentenceSplitter(early=True)
        self.assertEqual(feed_words(s, "Sure, okay, got it."), ["Sure, okay, got it."])

    def test_only_one_early_cut_per_round(self):
        s = SentenceSplitter(early=True)
        pieces = feed_words(s, "Of course, I would be glad to help you, and I can also check other days, if you like.")
        self.assertEqual(pieces[0], "Of course, I would be glad to help you,")
        self.assertEqual(pieces[1:], ["and I can also check other days, if you like."])

    def test_times_and_numbers_wait_for_the_full_sentence(self):
        for text in ("We have openings at 10, 11 and 2 PM tomorrow.", "We are open till five, Monday to Saturday.",
                     "Kal das baje, doctor available hain."):
            self.assertEqual(feed_words(SentenceSplitter(early=True), text), [text], text)

    def test_questions_are_not_cut(self):
        text = "Would you like the morning, or the afternoon, or another day entirely?"
        self.assertEqual(feed_words(SentenceSplitter(early=True), text), [text])

    def test_dash_clause(self):
        s = SentenceSplitter(early=True)
        pieces = feed_words(s, "That is no problem at all - let me check that for you.")
        self.assertEqual(pieces, ["That is no problem at all", "let me check that for you."])


class EngineWithEarlyChunking(unittest.TestCase):
    def _sentences(self, engine, utterance):
        async def go():
            return [e async for e in engine.turn_events(utterance, stream=True)]
        events = run(go())
        return [e["text"] for e in events if e["type"] == "sentence"], events[-1]["turn"]

    def test_first_clause_is_its_own_event_and_reply_is_unchanged(self):
        text = "Of course, I would be happy to help you book that, which day suits you?"
        engine, _ = make_engine(ScriptedBackend(reply(text)))
        engine.early_chunking = True
        said, turn = self._sentences(engine, "I want to book an appointment")
        self.assertEqual(said[0], "Of course, I would be happy to help you book that,")
        self.assertEqual(turn.reply, text)

    def test_invented_time_is_still_blocked(self):
        engine, _ = make_engine(ScriptedBackend(
            reply("Sure, we can see you tomorrow at 3 PM, does that work?"),
            reply("Sure, which day would suit you?"),
        ))
        engine.early_chunking = True
        said, turn = self._sentences(engine, "I need an appointment")
        self.assertFalse(any("3 PM" in s for s in said), said)

    def test_unbacked_booking_claim_is_still_blocked(self):
        engine, _ = make_engine(ScriptedBackend(
            reply("Great news, your appointment is confirmed for you."),
            reply("Let me read the details back to you first."),
        ))
        engine.early_chunking = True
        said, _ = self._sentences(engine, "yes please book it")
        self.assertFalse(any("confirmed" in s for s in said), said)

    def test_draft_question_is_still_replaced(self):
        engine, _ = make_engine(ScriptedBackend(reply("What service do you need? Sure! Which service are you after?")))
        engine.early_chunking = True
        said, _ = self._sentences(engine, "I want to book")
        self.assertEqual(sum(s.endswith("?") for s in said), 1, said)


class ParallelReads(unittest.TestCase):
    def test_two_availability_checks_run_concurrently_and_keep_order(self):
        engine, _ = make_engine(ScriptedBackend(reply("ok")))
        order = []

        async def slow(name, args):
            order.append(("start", json.loads(args)["date"]))
            await asyncio.sleep(0.2)
            return {"ok": True, "date": json.loads(args)["date"]}

        engine.toolbox.execute = slow
        calls = [{"name": "check_availability", "arguments": json.dumps({"date": d})} for d in ("tomorrow", "friday")]
        t0 = time.perf_counter()
        results = run(engine._run_tools(calls))
        self.assertLess(time.perf_counter() - t0, 0.35)  # sequential would be >= 0.4 s
        self.assertEqual([r["date"] for r in results], ["tomorrow", "friday"])

    def test_writes_stay_sequential(self):
        engine, _ = make_engine(ScriptedBackend(reply("ok")))
        active = {"n": 0, "max": 0}

        async def tool(name, args):
            active["n"] += 1
            active["max"] = max(active["max"], active["n"])
            await asyncio.sleep(0.05)
            active["n"] -= 1
            return {"ok": True}

        engine.toolbox.execute = tool
        calls = [{"name": "check_availability", "arguments": "{}"}, {"name": "book_appointment", "arguments": "{}"}]
        run(engine._run_tools(calls))
        self.assertEqual(active["max"], 1)

    def test_tool_round_is_timed(self):
        engine, _ = make_engine(ScriptedBackend(call("check_availability", date="tomorrow"), reply("We have openings tomorrow.")))
        tracker = latency.TurnLatency("c", 1)
        token = latency.start_turn(tracker)
        try:
            run(engine.turn("I need to see a dentist tomorrow"))
        finally:
            latency.end_turn(token)
        names = [n for n, _, _ in tracker.timeline]
        self.assertIn("tool_start", names)
        self.assertIn("tool_end", names)


class Tracker(unittest.TestCase):
    def test_first_mark_wins_and_stages_are_derived(self):
        clock = iter([0.0, 0.3, 0.35, 0.6, 0.9, 1.0, 1.2]).__next__
        t = latency.TurnLatency("c", 1, origin=0.0, clock=clock)
        for name in ("deepgram_final", "llm_request_start", "llm_first_token", "llm_first_content", "tts_request_start",
                     "llm_request_start"):
            t.mark(name)
        s = t.summary()
        self.assertEqual(s["marks_ms"]["llm_request_start"], 300.0)  # the second request (1.0 s) does not overwrite
        self.assertEqual(s["stages_ms"]["llm_reasoning"], 250.0)
        self.assertEqual(s["llm_rounds"], 2)

    def test_report_freezes(self):
        t = latency.TurnLatency("c", 1)
        t.report()
        t.mark("tts_first_audio")
        self.assertNotIn("tts_first_audio", t.marks)

    def test_marks_follow_tasks_but_not_detached_ones(self):
        async def go():
            t = latency.TurnLatency("c", 1)
            token = latency.start_turn(t)
            try:
                await asyncio.create_task(asyncio.sleep(0, result=latency.mark("tts_first_audio")))

                async def background():
                    latency.mark("llm_request_start")

                await latency.create_detached_task(background())
            finally:
                latency.end_turn(token)
            return t

        t = run(go())
        self.assertIn("tts_first_audio", t.marks)
        self.assertNotIn("llm_request_start", t.marks)

    def test_mark_without_a_turn_is_a_no_op(self):
        latency.mark("tts_first_audio")  # must not raise


class StreamMarks(unittest.TestCase):
    def test_reasoning_then_content_is_measured(self):
        body = "".join(
            f"data: {json.dumps({'choices': [{'delta': d}]})}\n\n"
            for d in ({"role": "assistant"}, {"reasoning": "think"}, {"content": "Hello"}, {"content": " there."})
        ) + "data: [DONE]\n\n"
        client = httpx.AsyncClient(transport=httpx.MockTransport(lambda req: httpx.Response(200, content=body.encode())))

        class Backend(GroqChatBackend):
            def api_key(self):
                return "k"

            def client(self):
                return client

        async def go():
            t = latency.TurnLatency("c", 1)
            token = latency.start_turn(t)
            try:
                events = [e async for e in Backend(model="openai/gpt-oss-20b").chat_stream([{"role": "user", "content": "hi"}], [])]
            finally:
                latency.end_turn(token)
            return t, events

        t, events = run(go())
        self.assertEqual(events[-1]["content"], "Hello there.")
        self.assertLessEqual(t.marks["llm_request_start"], t.marks["llm_first_token"])
        self.assertLessEqual(t.marks["llm_first_token"], t.marks["llm_first_content"])
        first_token = [d for n, _, d in t.timeline if n == "llm_first_token"]
        self.assertEqual(len(first_token), 1)


class DeepgramTiming(unittest.TestCase):
    def test_speech_end_is_estimated_from_word_timings(self):
        conn = DeepgramLiveConnection()

        class FakeWS:
            def __aiter__(self):
                async def gen():
                    yield json.dumps({"type": "Results", "is_final": True, "speech_final": True, "channel": {"alternatives": [
                        {"transcript": "book an appointment", "words": [{"word": "book", "end": 1.2}, {"word": "appointment", "end": 2.5}]}
                    ]}})
                return gen()

        conn._ws = FakeWS()
        conn.audio_t0 = 100.0

        async def go():
            await conn._read_loop()
            return await conn._queue.get()

        ev = run(go())
        self.assertEqual(ev["speech_end_at"], 102.5)
        self.assertTrue(ev["speech_final"])
        self.assertIn("received_at", ev)


class GatewayTurn(unittest.TestCase):
    """The live phone path end to end, with fake STT / LLM / TTS / Twilio socket: every stage is marked in order, the
    first clause is on the wire before the LLM finishes, and a barge-in still cancels playback."""

    def _session(self, backend, tts_delay=0.05, tts_chunks=5):
        from backend.ai.engine.agent.facts import AgentProfile
        from backend.ai.engine.agent.runtime import AgentRuntime
        from backend.ai.realtime.twilio import gateway

        sent = []

        class WS:
            async def send_text(self, text):
                sent.append(json.loads(text))

        async def fake_tts(text, **kw):
            latency.mark("tts_request_start")
            await asyncio.sleep(tts_delay)
            for _ in range(tts_chunks):
                latency.mark("tts_first_audio")
                yield b"\xff" * 1600  # 200 ms of mulaw
                await asyncio.sleep(0.01)

        self._patches = [(gateway.cartesia_tts, "stream_speech", fake_tts), (gateway, "record_call_turn", lambda **kw: None)]
        self._saved = [(o, n, getattr(o, n)) for o, n, _ in self._patches]
        for o, n, v in self._patches:
            setattr(o, n, v)
        engine, _ = make_engine(backend)
        engine.early_chunking = True
        s = gateway.CallSession(WS(), "biz")
        s.stream_sid, s.call_id = "MS1", "CA1"
        s.state_machine = type("SM", (), {"sequence": 0, "collected_slots": {}, "current_state": None})()
        s.agent_rt = AgentRuntime(engine, "llm_agent", AgentProfile())
        return s, sent

    def tearDown(self):
        for o, n, v in getattr(self, "_saved", []):
            setattr(o, n, v)

    def _transcript_event(self, text):
        now = time.monotonic()
        return {"type": "transcript", "text": text, "is_final": True, "speech_final": True,
                "received_at": now, "speech_end_at": now - 0.25}

    def test_every_stage_is_marked_in_order(self):
        backend = ScriptedBackend(reply("Absolutely, I can help you move that appointment, what is the phone number?"))
        session, sent = self._session(backend)
        reports = []
        orig = latency.TurnLatency.report
        latency.TurnLatency.report = lambda self: reports.append(orig(self)) or reports[-1]
        try:
            async def go():
                class STT:
                    async def events(inner):
                        yield self._transcript_event("Can I reschedule my appointment?")
                session.stt = STT()
                await session._consume_stt_events()
            run(go())
        finally:
            latency.TurnLatency.report = orig
        m = reports[0]["marks_ms"]
        # (llm_request_start / llm_first_token come from the real HTTP backend: see StreamMarks)
        order = ["speech_end", "deepgram_final", "llm_first_chunk", "tts_request_start",
                 "tts_first_audio", "first_audio_sent_to_telephony", "turn_end"]
        self.assertEqual([k for k in order if k in m], order)
        self.assertEqual(m["speech_end"], 0.0)
        self.assertAlmostEqual(m["deepgram_final"], 250.0, delta=5)
        media = [e for e in sent if e["event"] == "media"]
        self.assertGreater(len(media), 0)
        self.assertEqual(reports[0]["engine"], "llm_agent")

    def _turns_from(self, events):
        session, _ = self._session(ScriptedBackend())
        heard = []

        async def handle(text):
            heard.append(text)

        session._handle_transcript = handle

        async def go():
            class STT:
                async def events(inner):
                    for e in events:
                        yield e
            session.stt = STT()
            await session._consume_stt_events()
        run(go())
        return heard

    def test_a_caller_speaking_during_a_turn_never_runs_two_turns_at_once(self):
        """The STT reader is not blocked by a running turn; the single worker answers what piled up as one utterance."""
        session, _ = self._session(ScriptedBackend())
        state = {"running": 0, "max": 0, "heard": []}

        async def handle(text):
            state["running"] += 1
            state["max"] = max(state["max"], state["running"])
            state["heard"].append(text)
            await asyncio.sleep(0.15)
            state["running"] -= 1

        session._handle_transcript = handle

        async def go():
            class STT:
                async def events(inner):
                    yield self._transcript_event("first")
                    await asyncio.sleep(0.03)
                    yield self._transcript_event("second")
                    await asyncio.sleep(0.02)
                    yield self._transcript_event("third")
            session.stt = STT()
            await session._consume_stt_events()
        run(go())
        self.assertEqual(state["max"], 1)
        self.assertEqual(state["heard"], ["first", "second third"])
        self.assertFalse(session._busy)

    def test_a_stopped_turn_stops_speaking_and_commits_only_what_was_said(self):
        engine, _ = make_engine(ScriptedBackend(reply("First sentence is here. Second sentence is here. Third sentence is here.")))
        engine.early_chunking = False

        async def go():
            events = []
            async for ev in engine.turn_events("hello"):
                events.append(ev)
                if ev["type"] == "sentence":
                    engine.request_stop()  # the caller spoke over the first sentence
            return events
        events = run(go())
        self.assertEqual([e["type"] for e in events], ["sentence", "done"])
        self.assertEqual(engine._turns[-1][-1]["content"], events[0]["text"])

    def test_stop_never_abandons_a_running_tool_or_starts_another_round(self):
        backend = ScriptedBackend(call("check_availability", date="2030-01-01"))  # a 2nd LLM call would raise
        engine, _ = make_engine(backend)
        original = engine._run_tools

        async def stopping(calls):
            engine.request_stop()  # the caller interrupts while the tool is running
            return await original(calls)
        engine._run_tools = stopping

        async def go():
            return [ev async for ev in engine.turn_events("is the doctor free sometime")]
        events = run(go())
        self.assertEqual(events[-1]["type"], "done")
        self.assertEqual([m["role"] for m in engine._turns[-1]], ["user", "assistant", "tool", "assistant"])  # the tool result is in history

    def test_the_watchdog_never_prompts_a_caller_who_is_talking(self):
        from backend.ai.realtime.twilio import gateway

        session, _ = self._session(ScriptedBackend())
        said = []

        async def speak(text, *a, **kw):
            said.append(text)
            return True
        session._speak_turn = speak
        old_min, gateway.MIN_SILENCE_TIMEOUT_S = gateway.MIN_SILENCE_TIMEOUT_S, 1
        session.agent_settings = {"silence_timeout_seconds": 1, "language": "en"}
        session.last_activity = time.monotonic() - 100

        async def go(caller_talks):
            task = asyncio.create_task(session._watchdog())
            end = time.monotonic() + 3.2
            while time.monotonic() < end:
                if caller_talks:
                    session._last_caller_voice = time.monotonic()  # STT words / voiced audio keep arriving
                await asyncio.sleep(0.2)
            session.should_close = True
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
        try:
            run(go(True))
            self.assertEqual(said, [])
            session.should_close = False
            session._silence_prompted = False
            session._last_caller_voice = 0.0
            run(go(False))
            self.assertGreaterEqual(len(said), 1)  # a genuinely silent line is still prompted
        finally:
            gateway.MIN_SILENCE_TIMEOUT_S = old_min

    def test_the_barge_in_grace_window_starts_with_the_response_not_each_sentence(self):
        session, _ = self._session(ScriptedBackend(), tts_chunks=10)

        async def go():
            await session._speak_turn("first sentence")
            first_onset = session._speak_started_at
            self.assertTrue(session.barge_in.is_speaking)  # the first sentence is still playing at the caller's end
            await asyncio.sleep(0.05)
            await session._speak_turn("second sentence")
            return first_onset, session._speak_started_at
        first, second = run(go())
        self.assertEqual(first, second)

    def test_a_long_utterance_is_one_turn_not_two(self):
        """Deepgram finalises long speech in pieces (is_final without speech_final); answering each piece would cut in."""
        part = dict(self._transcript_event("I want to book an appointment"), speech_final=False)
        end = self._transcript_event("for tomorrow morning with Dr Sharma")
        self.assertEqual(self._turns_from([part, end]), ["I want to book an appointment for tomorrow morning with Dr Sharma"])

    def test_utterance_end_closes_a_turn_the_pause_detection_missed(self):
        part = dict(self._transcript_event("haan ji appointment chahiye"), speech_final=False)
        self.assertEqual(self._turns_from([part, {"type": "utterance_end", "received_at": time.monotonic()}]), ["haan ji appointment chahiye"])
        self.assertEqual(self._turns_from([{"type": "utterance_end"}]), [])  # nothing pending: nothing to answer
        # interim (non-final) results never start a turn, and two utterances stay two turns
        interim = dict(self._transcript_event("I want"), is_final=False, speech_final=False)
        self.assertEqual(self._turns_from([interim, self._transcript_event("hello"), self._transcript_event("are you open")]), ["hello", "are you open"])

    def test_barge_in_still_cancels_playback_and_clears_twilio(self):
        backend = ScriptedBackend(reply("Of course, I can certainly help you with booking that appointment today."))
        session, sent = self._session(backend, tts_delay=0.05, tts_chunks=40)

        async def go():
            turn = asyncio.create_task(session._handle_transcript("I want to book"))
            for _ in range(200):  # wait until audio is playing
                await asyncio.sleep(0.01)
                if session.barge_in.is_speaking and any(e["event"] == "media" for e in sent):
                    break
            await session.barge_in.handle_caller_speech(session.websocket, session.stream_sid)
            await turn

        run(go())
        self.assertTrue(any(e["event"] == "clear" for e in sent))
        media = sum(e["event"] == "media" for e in sent)
        self.assertLess(media, 40 * 10)  # stopped long before the full 40 x 200 ms of audio was sent


class BargeInPlayback(unittest.TestCase):
    """The AI stays interruptible until its audio has actually played, not just until the frames were sent."""

    def _coordinator(self):
        from backend.ai.realtime.barge_in.coordinator import BargeInCoordinator

        now = {"t": 100.0}
        return BargeInCoordinator(clock=lambda: now["t"]), now

    def test_queued_audio_keeps_the_ai_interruptible_after_sending_ends(self):
        c, now = self._coordinator()
        for _ in range(150):  # 3 s of audio sent in a burst
            c.audio_sent(0.02)
        self.assertTrue(c.is_speaking)
        now["t"] += 2.9
        self.assertTrue(c.is_speaking)
        now["t"] += 0.2
        self.assertFalse(c.is_speaking)

    def test_latest_mark_echo_ends_playback_older_ones_do_not(self):
        c, _ = self._coordinator()
        c.audio_sent(2.0)
        first = c.next_mark()
        c.audio_sent(2.0)
        latest = c.next_mark()
        c.on_mark(first)
        self.assertTrue(c.is_speaking)
        c.on_mark(latest)
        self.assertFalse(c.is_speaking)

    def test_mark_echo_reports_lateness_against_zero_delay_playback(self):
        c, now = self._coordinator()
        c.audio_sent(2.0)  # due at 102.0
        first = c.next_mark()
        c.audio_sent(1.0)  # queued behind it: due at 103.0
        second = c.next_mark()
        now["t"] = 102.4
        self.assertAlmostEqual(c.on_mark(first), 0.4)
        now["t"] = 103.25
        self.assertAlmostEqual(c.on_mark(second), 0.25)
        self.assertIsNone(c.on_mark(second))  # an echo is measured once
        self.assertIsNone(c.on_mark("unknown"))

    def test_marks_echoed_by_a_clear_are_not_measured(self):
        c, _ = self._coordinator()
        c.audio_sent(3.0)
        mark = c.next_mark()

        class WS:
            async def send_text(self, text):
                pass

        run(c.handle_caller_speech(WS(), "MS1"))
        self.assertIsNone(c.on_mark(mark))

    def test_barge_in_during_playback_clears_twilio_and_bumps_generation(self):
        c, _ = self._coordinator()
        c.audio_sent(3.0)
        sent = []

        class WS:
            async def send_text(self, text):
                sent.append(json.loads(text))

        run(c.handle_caller_speech(WS(), "MS1"))
        self.assertEqual(sent[0]["event"], "clear")
        self.assertEqual(c.generation, 1)
        self.assertFalse(c.is_speaking)
        sent.clear()
        run(c.handle_caller_speech(WS(), "MS1"))  # nothing audible any more: no second clear
        self.assertEqual(sent, [])

    def test_barge_in_between_sentences_stops_the_rest_of_the_turn(self):
        gw = GatewayTurn()
        slow_backend = ScriptedBackend(reply("ignored"))

        async def chat_stream(messages, tools):
            yield {"type": "text", "delta": "Of course, I can certainly help you with that today. "}
            await asyncio.sleep(0.3)  # the model is still writing sentence two while sentence one plays
            yield {"type": "text", "delta": "Our next opening is on Monday morning."}
            yield {"type": "final", "content": None, "tool_calls": []}

        slow_backend.chat_stream = chat_stream
        session, sent = gw._session(slow_backend, tts_delay=0.0, tts_chunks=2)
        try:
            async def go():
                turn = asyncio.create_task(session._handle_transcript("I want to book"))
                for _ in range(100):  # sentence one fully sent; its audio is still "playing"
                    await asyncio.sleep(0.01)
                    if any(e["event"] == "mark" for e in sent):
                        break
                self.assertTrue(session.barge_in.is_speaking)
                await session.barge_in.handle_caller_speech(session.websocket, session.stream_sid)
                await turn

            run(go())
        finally:
            gw.tearDown()
        events = [e["event"] for e in sent]
        self.assertIn("clear", events)
        self.assertNotIn("media", events[events.index("clear"):])  # nothing spoken after the interruption

    def test_vad_needs_sustained_voiced_frames(self):
        import base64
        from backend.ai.realtime.barge_in import monitor

        gw = GatewayTurn()
        session, sent = gw._session(ScriptedBackend(reply("ok")))
        gw.tearDown()
        session.barge_in.audio_sent(5.0)
        loud = base64.b64encode(b"\x00" * 160).decode()  # mulaw 0x00 = full scale
        quiet = base64.b64encode(b"\xff" * 160).decode()  # mulaw 0xFF = silence

        async def frames(*payloads):
            for p in payloads:
                await session.handle_media(p)

        run(frames(loud, loud, quiet, loud))  # a spike, then a broken run: not speech
        self.assertEqual(sent, [])
        run(frames(*[loud] * monitor.NEED_FRAMES))
        self.assertEqual([e["event"] for e in sent], ["clear"])

    def test_deepgram_speech_started_calls_the_hook_directly(self):
        conn = DeepgramLiveConnection()
        calls = []

        async def hook():
            calls.append(1)

        conn.on_speech_started = hook

        class FakeWS:
            def __aiter__(self):
                async def gen():
                    yield json.dumps({"type": "SpeechStarted"})
                return gen()

        conn._ws = FakeWS()
        run(conn._read_loop())
        self.assertEqual(calls, [1])
        self.assertEqual(conn._queue.get_nowait()["type"], "closed")  # not queued behind a busy consumer


class ProviderClients(unittest.TestCase):
    def test_pooled_client_keeps_connections_longer_than_httpx_default(self):
        client = pooled_http_client(timeout=4.0)
        self.assertGreater(client._transport._pool._keepalive_expiry, 5.0)

    def test_reasoning_params_only_for_reasoning_models(self):
        self.assertEqual(reasoning_params("openai/gpt-oss-20b"), {"reasoning_effort": "low"})
        self.assertEqual(reasoning_params("llama-3.3-70b-versatile"), {})


if __name__ == "__main__":
    unittest.main()


class _SinkWS:
    async def send_text(self, text):
        pass


class SpeechAudioCache(unittest.TestCase):
    """LATENCY: finished utterances are kept (least recently used dropped first), and a call's fillers are synthesized while the
    greeting plays, so a calendar-checking turn starts speaking from memory."""

    def _tts(self):
        from backend.ai.speech.tts.cartesia import CartesiaTTS

        tts = CartesiaTTS()
        tts.api_key = "k"
        tts.requests = []

        async def ws(text, voice_id, encoding, sample_rate, language, speed, emotion):
            tts.requests.append(text)
            yield f"audio:{text}".encode()

        tts._stream_speech_ws = ws
        return tts

    def _say(self, tts, text, **params):
        async def go():
            return b"".join([c async for c in tts.stream_speech(text, **params)])
        return run(go())

    def test_repeats_come_from_memory_and_the_oldest_is_dropped_first(self):
        tts = self._tts()
        tts.AUDIO_CACHE_ENTRIES = 2
        self._say(tts, "Hello")
        self._say(tts, "One moment")
        self._say(tts, "Hello")  # from memory, and now the most recent
        self._say(tts, "Goodbye")  # evicts "One moment", the least recently used
        self.assertEqual(tts.requests, ["Hello", "One moment", "Goodbye"])
        self._say(tts, "Hello")
        self._say(tts, "One moment")
        self.assertEqual(tts.requests, ["Hello", "One moment", "Goodbye", "One moment"])
        self.assertLessEqual(len(tts._audio_cache), 2)

    def test_the_cache_also_has_a_size_limit(self):
        tts = self._tts()
        tts.AUDIO_CACHE_BYTES = 30
        for word in ("aaaaaaaaaa", "bbbbbbbbbb", "cccccccccc"):
            self._say(tts, word)
        self.assertLessEqual(tts._audio_cache_bytes, 30)
        self.assertEqual(tts._audio_cache_bytes, sum(len(v) for v in tts._audio_cache.values()))

    def test_a_call_prewarms_its_fillers_with_the_parameters_playback_will_use(self):
        from backend.ai.realtime.twilio import gateway

        tts = self._tts()
        saved = gateway.cartesia_tts
        gateway.cartesia_tts = tts
        try:
            session = gateway.CallSession(_SinkWS(), "biz")
            session.agent_settings = {"voice_id": "v1", "tts_speed": 1.1}
            session.agent_rt = type("RT", (), {"engine": type("E", (), {"fillers_on": True, "active_language": "hi"})()})()
            run(session._prewarm_fillers())
            prewarmed = list(tts.requests)
            self.assertEqual(sorted(prewarmed), sorted({gateway.wait_text(False), gateway.wait_text(True)}))

            async def play():
                await session._stream_tts(gateway.wait_text(True))
            session.stream_sid = "MS1"
            run(play())
            self.assertEqual(tts.requests, prewarmed)  # played from memory: no new synthesis
        finally:
            gateway.cartesia_tts = saved


class InterruptDuringFirstTokenWait(unittest.TestCase):
    def test_stop_ends_the_stream_without_waiting_for_the_next_event(self):
        from types import SimpleNamespace
        from backend.ai.engine.agent.agent_loop import AgentEngine

        async def slow_stream():
            await asyncio.sleep(5)  # the model's first token is slow to arrive
            yield {"type": "text", "delta": "late"}

        async def go():
            owner = SimpleNamespace(_stop_event=asyncio.Event())
            asyncio.get_running_loop().call_later(0.05, owner._stop_event.set)
            started = time.monotonic()
            events = [ev async for ev in AgentEngine._until_stop(owner, slow_stream())]
            return events, time.monotonic() - started

        events, took = run(go())
        self.assertEqual(events, [])
        self.assertLess(took, 1.0)

    def test_events_pass_through_when_not_stopped(self):
        from types import SimpleNamespace
        from backend.ai.engine.agent.agent_loop import AgentEngine

        async def stream():
            yield {"type": "text", "delta": "a"}
            yield {"type": "text", "delta": "b"}

        async def go():
            owner = SimpleNamespace(_stop_event=asyncio.Event())
            return [ev["delta"] async for ev in AgentEngine._until_stop(owner, stream())]

        self.assertEqual(run(go()), ["a", "b"])


class EndpointingConstant(unittest.TestCase):
    def test_constant_matches_the_deepgram_url(self):
        from backend.ai.speech.stt.deepgram import DEEPGRAM_LIVE_URL_TEMPLATE, ENDPOINTING_MS
        self.assertIn(f"endpointing={ENDPOINTING_MS}&", DEEPGRAM_LIVE_URL_TEMPLATE)


class TtsFirstAudioMark(unittest.TestCase):
    def test_websocket_path_marks_first_audio(self):
        """Live calls use the Cartesia websocket; only the REST and cache paths used to mark tts_first_audio (tts_ttfb was null)."""
        import base64
        from backend.ai.speech.tts.cartesia import CartesiaTTS

        tts = CartesiaTTS()
        tts.api_key = "k"

        class FakeWS:
            close_code = None

            async def send(self, raw):
                msg = json.loads(raw)
                q = tts._ws_pending.get(msg.get("context_id"))
                if q is not None and "transcript" in msg:
                    for part in (b"a", b"b"):
                        q.put_nowait({"type": "chunk", "data": base64.b64encode(part).decode()})
                    q.put_nowait({"type": "done", "done": True})

        async def ensure():
            return FakeWS()

        tts._ensure_ws = ensure

        async def go():
            tracker = latency.TurnLatency("c", 1)
            token = latency.start_turn(tracker)
            try:
                audio = b"".join([c async for c in tts.stream_speech("hello there")])
            finally:
                latency.end_turn(token)
            return audio, tracker

        audio, tracker = run(go())
        self.assertEqual(audio, b"ab")
        self.assertIsNotNone(tracker.summary()["stages_ms"]["tts_ttfb"])
        self.assertEqual([n for n, _, _ in tracker.timeline].count("tts_first_audio"), 1)


class OneAcknowledgementPerTurn(unittest.TestCase):
    def _dedupe(self, sentences):
        from types import SimpleNamespace
        from backend.ai.engine.agent.agent_loop import AgentEngine

        owner = SimpleNamespace(_ack_used=set(), _cues={})
        return [AgentEngine._dedupe_ack(owner, s) for s in sentences]

    def test_hindi_acks_after_a_retry_are_not_stacked(self):
        # live call turn 6: "जी, बिल्कुल।" then, after the guard retry, "जी, जरूर।"
        self.assertEqual(self._dedupe(["जी, बिल्कुल।", "जी, जरूर।", "कृपया अपना नाम बताएं।"]), ["जी, बिल्कुल।", "", "कृपया अपना नाम बताएं।"])

    def test_a_second_ack_word_is_stripped_but_the_rest_kept(self):
        self.assertEqual(self._dedupe(["Sure!", "Got it, which day works for you?"]), ["Sure!", "which day works for you?"])
        self.assertEqual(self._dedupe(["Haan ji, zaroor.", "Theek hai, kal 12 baje khali hai."]), ["Haan ji, zaroor.", "kal 12 baje khali hai."])

    def test_words_that_only_start_like_an_ack_are_left_alone(self):
        self.assertEqual(self._dedupe(["Sure.", "Surely the clinic is open.", "Okra is not a service."]),
                         ["Sure.", "Surely the clinic is open.", "Okra is not a service."])
        self.assertEqual(self._dedupe(["जी।", "जीभ में दर्द है तो डॉक्टर देखेंगे।"]), ["जी।", "जीभ में दर्द है तो डॉक्टर देखेंगे।"])

    def test_an_ack_word_inside_a_phrase_is_not_cut(self):
        self.assertEqual(self._dedupe(["Got it.", "Sure thing! Which service?"]), ["Got it.", "Sure thing! Which service?"])
        self.assertEqual(self._dedupe(["जी।", "अच्छा लगा कि आपने कॉल किया।"]), ["जी।", "अच्छा लगा कि आपने कॉल किया।"])


class BargeInMonitorCalibration(unittest.TestCase):
    """Live call CAbaf0cd8630: on that line the caller's speech measured median ~300 / p90 ~1100-1300 RMS; with the fixed
    threshold of 1400 and 15 frames in a row the energy barge-in could never fire (longest run above 1400: 11 frames)."""

    def _monitor(self):
        from backend.ai.realtime.barge_in.monitor import BargeInMonitor
        now = {"t": 0.0}
        return BargeInMonitor("CA1", clock=lambda: now["t"]), now

    @staticmethod
    def _caller_speech(n, level=600):
        # syllables with dips, like the measured line: loud, loud, quiet, loud...
        return [level if i % 3 != 2 else 120 for i in range(n)]

    def _feed(self, m, now, levels, audible, blocked=None):
        fired_at = None
        for i, rms in enumerate(levels):
            now["t"] += 0.02
            if m.frame(rms, audible=audible, blocked=blocked) and fired_at is None:
                fired_at = i
        return fired_at

    def _calibrate(self, m, now, caller=800, echo=40):
        self._feed(m, now, [caller] * 40, audible=False)  # the caller answering a question while we are silent
        self._feed(m, now, [echo] * 40, audible=True, blocked="greeting")  # our greeting leaking back
        self._feed(m, now, [0], audible=False)  # greeting over

    def test_uncalibrated_keeps_the_old_threshold(self):
        m, now = self._monitor()
        self.assertEqual(m.threshold(), 1400)
        self.assertIsNone(self._feed(m, now, self._caller_speech(100), audible=True))

    def test_a_quiet_caller_interrupts_once_the_call_is_calibrated(self):
        m, now = self._monitor()
        self._calibrate(m, now)
        self.assertLess(m.threshold(), 600)
        fired = self._feed(m, now, self._caller_speech(100), audible=True)
        self.assertIsNotNone(fired)
        self.assertLess(fired, 20)  # within 400 ms, despite the dips between syllables

    def test_echo_raises_the_threshold_and_never_triggers(self):
        m, now = self._monitor()
        self._calibrate(m, now, caller=800, echo=500)
        self.assertGreaterEqual(m.threshold(), 1250)  # 2.5x the echo: our own voice cannot interrupt us
        self.assertIsNone(self._feed(m, now, [500] * 200, audible=True))

    def test_a_short_spike_is_not_speech_and_silence_never_triggers(self):
        m, now = self._monitor()
        self._calibrate(m, now)
        self.assertIsNone(self._feed(m, now, [900, 900, 0, 0, 0, 0] * 10, audible=True))
        self.assertIsNone(self._feed(m, now, [5] * 300, audible=True))

    def test_blocked_frames_never_trigger_and_are_reported(self):
        m, now = self._monitor()
        self._calibrate(m, now)
        self.assertIsNone(self._feed(m, now, [3000] * 50, audible=True, blocked="grace"))
        summary = m.response_end("played_out")
        self.assertEqual(summary["blocked_ms"], {"grace": 1000})
        self.assertIsNone(summary["barge_in"])

    def test_the_summary_says_why_and_how_fast(self):
        m, now = self._monitor()
        self._calibrate(m, now)
        self._feed(m, now, self._caller_speech(30), audible=True)
        summary = m.fired("vad", {"tts_task_cancelled": True, "clear_sent": True}, turn=3, generation=2)
        self.assertEqual((summary["barge_in"], summary["turn"], summary["generation"]), ("vad", 3, 2))
        self.assertIsNotNone(summary["reaction_ms"])
        self.assertTrue(summary["cancel"]["clear_sent"])
        self.assertIsNotNone(summary["caller_p75"])
        self.assertIsNotNone(summary["echo_p90"])


class BargeInScenarios(unittest.TestCase):
    """Interruptions through the real gateway paths: nothing of the interrupted response is sent after Twilio's `clear`,
    and the rest of the turn cannot resume."""

    def setUp(self):
        from backend.ai.realtime.twilio import gateway
        self._grace = gateway.BARGE_IN_GRACE_PERIOD_S
        gateway.BARGE_IN_GRACE_PERIOD_S = 0.0  # the grace window has its own tests; here the caller speaks after it

    def tearDown(self):
        from backend.ai.realtime.twilio import gateway
        gateway.BARGE_IN_GRACE_PERIOD_S = self._grace

    @staticmethod
    def _words(session, text="wait wait"):
        """Deepgram delivering interim words while we speak, through the real STT consumer."""
        class FakeSTT:
            async def events(self):
                yield {"type": "transcript", "text": text, "is_final": False, "speech_final": False, "received_at": time.monotonic()}

        session.stt = FakeSTT()
        return session._consume_stt_events()

    def _run(self, chat_stream, interrupt, tts_delay=0.0, tts_chunks=8):
        gw = GatewayTurn()
        backend = ScriptedBackend(reply("ignored"))
        backend.chat_stream = chat_stream
        session, sent = gw._session(backend, tts_delay=tts_delay, tts_chunks=tts_chunks)
        try:
            async def go():
                turn = asyncio.create_task(session._handle_transcript("I want to book"))
                await interrupt(session, sent)
                await turn
            run(go())
        finally:
            gw.tearDown()
        events = [e["event"] for e in sent]
        self.assertIn("clear", events)
        self.assertNotIn("media", events[events.index("clear"):])
        return session, sent

    @staticmethod
    async def _wait_for(pred, timeout=3.0):
        for _ in range(int(timeout / 0.005)):
            if pred():
                return
            await asyncio.sleep(0.005)
        raise AssertionError("condition never became true")

    @staticmethod
    async def _two_sentences(messages, tools):
        yield {"type": "text", "delta": "Of course, I can certainly help you with that today. "}
        await asyncio.sleep(0.3)
        yield {"type": "text", "delta": "Our next opening is on Monday morning."}
        yield {"type": "final", "content": None, "tool_calls": []}

    def test_interrupt_during_the_first_audio_chunk(self):
        async def interrupt(session, sent):
            await self._wait_for(lambda: any(e["event"] == "media" for e in sent))
            await self._words(session)
        self._run(self._two_sentences, interrupt)

    def test_interrupt_mid_sentence(self):
        async def interrupt(session, sent):
            await self._wait_for(lambda: sum(e["event"] == "media" for e in sent) >= 20)
            await self._words(session)
        self._run(self._two_sentences, interrupt, tts_chunks=20)

    def test_interrupt_while_tts_audio_is_delayed_by_the_network(self):
        async def interrupt(session, sent):
            await self._wait_for(lambda: session.barge_in.is_speaking)  # TTS requested, no audio yet
            self.assertFalse(any(e["event"] == "media" for e in sent))
            await self._words(session)
        session, sent = self._run(self._two_sentences, interrupt, tts_delay=0.5)
        self.assertFalse(any(e["event"] == "media" for e in sent))  # the delayed audio never reached the caller

    def test_caller_overlap_detected_from_audio_energy(self):
        import audioop
        import base64

        def frame(level):
            pcm = audioop.mul(b"\x00\x10" * 160, 2, level / 4096)  # constant level: RMS ~= level
            return base64.b64encode(audioop.lin2ulaw(pcm, 2)).decode()

        async def interrupt(session, sent):
            for _ in range(40):  # calibration as on a real call: the caller's earlier answer, then our greeting's echo
                session.barge_monitor.frame(800, audible=False, blocked=None)
            for _ in range(40):
                session.barge_monitor.frame(40, audible=True, blocked="greeting")
            await self._wait_for(lambda: sum(e["event"] == "media" for e in sent) >= 5)
            for i in range(40):  # a quiet caller talking over us, with dips between syllables
                await session.handle_media(frame(600 if i % 3 != 2 else 100))
                if any(e["event"] == "clear" for e in sent):
                    break
        self._run(self._two_sentences, interrupt, tts_chunks=40)

    def test_an_interrupted_turn_cannot_speak_again(self):
        async def interrupt(session, sent):
            await self._wait_for(lambda: any(e["event"] == "media" for e in sent))
            await self._words(session)
            await asyncio.sleep(0.5)  # sentence two is generated after the interruption
        self._run(self._two_sentences, interrupt)


class LifecycleMarks(unittest.TestCase):
    """The call lifecycle in the [LATENCY] log: caller speech start / first interim / end of turn, per-sentence TTS timings,
    barge-in to clear and to the end of the interrupted turn, and the opening as turn 0. No transcript text in any report."""

    def setUp(self):
        self.reports = []
        real = latency.TurnLatency.report
        test = self

        def capture(tracker):
            s = real(tracker)
            test.reports.append(s)
            return s
        self._real = real
        latency.TurnLatency.report = capture

    def tearDown(self):
        latency.TurnLatency.report = self._real

    def test_sentences_and_derived_stages(self):
        clock = [10.0]
        t = latency.TurnLatency("CA1", 3, origin=10.0, clock=lambda: clock[0])
        for at, name, data in [(9.4, "caller_speech_start", {}), (9.6, "stt_first_interim", {}), (10.2, "deepgram_final", {}),
                               (10.3, "llm_request_start", {}), (10.6, "llm_first_token", {}), (10.7, "llm_first_chunk", {}),
                               (10.7, "tts_request_start", {"chars": 20}), (10.9, "tts_first_audio", {"cached": False}),
                               (10.91, "first_audio_sent_to_telephony", {"queued_ms": None}),
                               (11.0, "tts_request_start", {"chars": 30}), (11.05, "tts_first_audio", {"cached": True}),
                               (11.06, "first_audio_sent_to_telephony", {"queued_ms": 900}),
                               (11.5, "barge_in_detected", {}), (11.52, "playback_clear_sent", {}), (11.52, "llm_stop_requested", {})]:
            t.mark(name, at=at, **data)
        clock[0] = 11.8
        s = t.report()
        self.assertEqual(s["marks_ms"]["caller_speech_start"], -600.0)  # before the end of speech
        self.assertEqual(s["stages_ms"]["stt_interim_to_final"], 600.0)
        self.assertEqual(s["stages_ms"]["llm_first_token_to_first_sentence"], 100.0)
        self.assertEqual(s["stages_ms"]["end_of_turn_to_first_audio_sent"], 710.0)
        self.assertEqual(s["stages_ms"]["barge_in_to_clear_sent"], 20.0)
        self.assertEqual(s["stages_ms"]["barge_in_to_turn_end"], 300.0)
        self.assertEqual([x["chars"] for x in s["sentences"]], [20, 30])
        self.assertEqual(s["sentences"][1], {"tts_request_ms": 1000.0, "chars": 30, "tts_first_audio_ms": 1050.0, "cached": True,
                                             "first_sent_ms": 1060.0, "queued_ms": 900})

    def test_greeting_interval_skips_the_notice_audio(self):
        t = latency.TurnLatency("CA1", 0, origin=0.0)
        for at, name in [(0.0, "call_accepted"), (0.9, "tts_request_start"), (1.1, "first_audio_sent_to_telephony"),
                         (2.0, "greeting_start"), (2.0, "tts_request_start"), (2.25, "first_audio_sent_to_telephony")]:
            t.mark(name, at=at)
        s = t.summary()
        self.assertEqual(s["perceived_ms"], 1100.0)  # first audio of the call: the notice
        self.assertEqual(s["stages_ms"]["greeting_to_first_audio_sent"], 250.0)

    def test_stt_lifecycle_reaches_the_turn_report_without_text(self):
        gw = GatewayTurn()
        session, _ = gw._session(ScriptedBackend(reply("Sure, which day suits you?")))

        class FakeSTT:
            async def events(self):
                now = time.monotonic()
                yield {"type": "speech_started"}
                await asyncio.sleep(0.05)
                yield {"type": "transcript", "text": "I want to", "is_final": False, "speech_final": False, "received_at": time.monotonic()}
                await asyncio.sleep(0.05)
                yield {"type": "transcript", "text": "I want to book", "is_final": True, "speech_final": True,
                       "received_at": time.monotonic(), "speech_end_at": now + 0.08}
        session.stt = FakeSTT()
        try:
            run(session._consume_stt_events())
        finally:
            gw.tearDown()
        s = self.reports[-1]
        m = s["marks_ms"]
        self.assertLess(m["caller_speech_start"], m["stt_first_interim"])
        self.assertLess(m["stt_first_interim"], m["deepgram_final"])
        self.assertEqual(s["closed_by"], "speech_final")
        self.assertIn("first_audio_sent_to_telephony", m)
        self.assertNotIn("want to book", json.dumps(s, default=str))
        self.assertIsNone(session._speech_started_at)  # reset for the next utterance

    def test_barge_in_marks_land_on_the_interrupted_turn(self):
        from backend.ai.realtime.twilio import gateway
        grace, gateway.BARGE_IN_GRACE_PERIOD_S = gateway.BARGE_IN_GRACE_PERIOD_S, 0.0
        gw = GatewayTurn()
        session, sent = gw._session(ScriptedBackend(reply("ignored")))
        session.agent_rt.engine.backend.chat_stream = BargeInScenarios._two_sentences
        try:
            async def go():
                session._enqueue_turn({"text": "I want to book", "received_at": time.monotonic()})
                await BargeInScenarios._wait_for(lambda: any(e["event"] == "media" for e in sent))
                await BargeInScenarios._words(session)
                await session._turn_worker
            run(go())
        finally:
            gw.tearDown()
            gateway.BARGE_IN_GRACE_PERIOD_S = grace
        m = self.reports[-1]["marks_ms"]
        self.assertLessEqual(m["barge_in_detected"], m["playback_clear_sent"])
        self.assertIn("llm_stop_requested", m)
        self.assertIsNotNone(self.reports[-1]["stages_ms"]["barge_in_to_turn_end"])
        self.assertIsNone(session._active_tracker)

    def test_the_opening_is_reported_as_turn_zero(self):
        from backend.ai.realtime.twilio import gateway
        spoken = []

        async def speak(self_, text, emotion=None):
            spoken.append(text)
            return True
        g = GreetingBesideTheReceiveLoop()
        with g._patched(speak):
            s = gateway.CallSession(GreetingBesideTheReceiveLoop._socket([]), "biz")

            async def go():
                await s.start("MS1", "CA-open", "+15550100")
                await s._greeting_task
            run(go())
        opening = [r for r in self.reports if r["turn"] == 0][-1]
        self.assertEqual(opening["phase"], "opening")
        self.assertEqual(opening["call_id"], "CA-open")
        self.assertEqual(opening["marks_ms"]["call_accepted"], 0.0)
        self.assertIn("greeting_start", opening["marks_ms"])
        self.assertFalse(opening["interrupted"])
        self.assertNotIn("Demo clinic", json.dumps(opening, default=str))


class BargeInStopsTheModel(unittest.TestCase):
    """A barge-in between two sentences (the first fully sent and still playing, the model slow on the second) used to stop
    the model only when the second sentence reached speak(). Now the barge-in itself stops it, and the call log keeps only
    the sentence the caller heard."""

    def setUp(self):
        from backend.ai.realtime.twilio import gateway
        self._grace = gateway.BARGE_IN_GRACE_PERIOD_S
        gateway.BARGE_IN_GRACE_PERIOD_S = 0.0

    def tearDown(self):
        from backend.ai.realtime.twilio import gateway
        gateway.BARGE_IN_GRACE_PERIOD_S = self._grace

    def test_barge_in_between_sentences_ends_the_turn_without_waiting_for_the_model(self):
        from backend.ai.realtime.twilio import gateway
        closed = []

        async def slow_second(messages, tools):
            try:
                yield {"type": "text", "delta": "Of course, I can certainly help you with that today. "}
                await asyncio.sleep(2.0)  # the model is slow on sentence two
                yield {"type": "text", "delta": "Our next opening is on Monday morning."}
                yield {"type": "final", "content": None, "tool_calls": []}
            finally:
                closed.append(time.monotonic())

        gw = GatewayTurn()
        backend = ScriptedBackend(reply("ignored"))
        backend.chat_stream = slow_second
        session, sent = gw._session(backend, tts_chunks=5)
        logged = []
        gateway.record_call_turn = lambda **kw: logged.append(kw)
        try:
            async def go():
                started = time.monotonic()
                turn = asyncio.create_task(session._handle_transcript("I want to book"))
                await BargeInScenarios._wait_for(lambda: any(e["event"] == "mark" for e in sent))  # sentence one fully sent
                self.assertTrue(session.barge_in.is_speaking)  # ...and still playing at the caller's end
                await BargeInScenarios._words(session)
                await turn
                await asyncio.gather(*session._persist_tasks)
                return time.monotonic() - started
            took = run(go())
        finally:
            gw.tearDown()
        self.assertLess(took, 1.5)  # not the model's 2 s for a sentence nobody will hear
        self.assertTrue(closed)
        self.assertEqual([kw["bot_response"] for kw in logged], ["Of course, I can certainly help you with that today."])
        self.assertEqual(session.agent_rt.engine._turns[-1][-1]["content"], "Of course, I can certainly help you with that today.")

    def test_repeated_cancellation_is_harmless_and_never_silences_the_next_turn(self):
        gw = GatewayTurn()
        session, sent = gw._session(ScriptedBackend(reply("Hello there, how can I help?")))
        try:
            async def go():
                session.barge_in.playback_until = time.monotonic() + 5  # our audio is still playing, no turn is running
                before = session.barge_in.generation
                for path in ("words", "words", "vad"):
                    await session._barge_in(path)
                bumps = session.barge_in.generation - before
                turn = await session.agent_rt.engine.turn("hi")  # the caller's next turn
                return bumps, turn
            bumps, turn = run(go())
        finally:
            gw.tearDown()
        self.assertEqual(bumps, 1)
        self.assertEqual([e["event"] for e in sent].count("clear"), 1)
        self.assertEqual(turn.reply, "Hello there, how can I help?")  # the stale stop was cleared when the turn started


class _GatewayHarness:
    """GatewayTurn's fake call, plus the texts sent to TTS, with the barge-in grace window off."""

    def setUp(self):
        from backend.ai.realtime.twilio import gateway
        self._grace = gateway.BARGE_IN_GRACE_PERIOD_S
        gateway.BARGE_IN_GRACE_PERIOD_S = 0.0
        self.gw = None

    def tearDown(self):
        from backend.ai.realtime.twilio import gateway
        gateway.BARGE_IN_GRACE_PERIOD_S = self._grace
        if self.gw:
            self.gw.tearDown()

    def _session(self, *responses):
        from backend.ai.realtime.twilio import gateway
        self.gw = GatewayTurn()
        session, sent = self.gw._session(ScriptedBackend(*responses))
        self.tts_texts = []
        inner = gateway.cartesia_tts.stream_speech

        async def recording(text, **kw):
            self.tts_texts.append(text)
            async for chunk in inner(text, **kw):
                yield chunk
        gateway.cartesia_tts.stream_speech = recording
        return session, sent


class TailBargeIn(_GatewayHarness, unittest.TestCase):
    """Frames go out ~4x faster than real time, so most of a reply plays after its turn ended. A barge-in then used to keep
    the whole reply in the agent's history (and what a "yes" accepts). Now the provider's playback-mark echoes decide: the
    echoed sentences were heard, and so was (part of) the one playing; the rest is dropped."""

    LOGGER = "backend.ai.realtime.twilio.gateway"

    def _answer_then_barge_in(self, text, echo=0):
        session, sent = self._session(reply(text))

        async def go():
            await session._handle_transcript("I'd like Monday")  # the turn ends once its last frame is sent...
            self.assertTrue(session.barge_in.is_speaking)  # ...while the caller is still hearing it
            tail = session._tail
            for mark in (tail["marks"] if tail else [])[:echo]:
                session.note_mark_echo(mark)  # the provider: this sentence has played
            with self.assertLogs(self.LOGGER, "INFO") as logs:
                await BargeInScenarios._words(session)
            return logs.output
        logs = run(go())
        barge = [json.loads(line.split("[BARGE-IN] ", 1)[1]) for line in logs if "[BARGE-IN] {" in line]
        return session, sent, barge[0]

    def test_an_unheard_proposal_is_dropped_after_the_turn_ended(self):
        session, sent, log = self._answer_then_barge_in("Monday works well. Shall I book that for you?")
        engine = session.agent_rt.engine
        self.assertEqual(engine._turns[-1][-1]["content"], "Monday works well.")
        self.assertNotIn("book that", engine.toolbox.last_assistant)
        self.assertEqual((log["during"], log["heard_sentences"], log["of"]), ("playback_tail", 1, 2))
        self.assertIsNotNone(log["detect_to_clear_sent_ms"])
        self.assertIn("clear", [e["event"] for e in sent])

    def test_echoed_sentences_and_the_one_playing_count_as_heard(self):
        session, _, log = self._answer_then_barge_in("One is here. Two is here. Three is here.", echo=1)
        self.assertEqual(session.agent_rt.engine._turns[-1][-1]["content"], "One is here. Two is here.")
        self.assertEqual((log["heard_sentences"], log["of"]), (2, 3))

    def test_a_reply_that_fully_played_is_left_alone(self):
        session, _, log = self._answer_then_barge_in("One is here. Two is here.", echo=2)
        self.assertEqual(session.agent_rt.engine._turns[-1][-1]["content"], "One is here. Two is here.")
        self.assertIsNone(session._tail)
        self.assertNotEqual(log["during"], "playback_tail")

    def test_the_providers_acknowledgement_of_a_clear_is_logged_once(self):
        session, _, _ = self._answer_then_barge_in("One is here. Two is here.")
        with self.assertLogs(self.LOGGER, "INFO") as logs:
            session.note_mark_echo("turn_end:1")  # the provider echoes the pending marks right after a clear
            session.note_mark_echo("turn_end:2")
        acks = [line for line in logs.output if "clear_acknowledged_ms" in line]
        self.assertEqual(len(acks), 1)
        self.assertIsNone(session._clear_sent_at)


class GreetingScenarios(_GatewayHarness, unittest.TestCase):
    """With the greeting off the receive loop: a caller who speaks during the pickup window is answered and never greeted
    over; one who interrupts the greeting clears it and stays interruptible; a silent caller hears it all."""

    GREETING = "Hello, thanks for calling Demo clinic."

    def _start_opening(self, session, pickup_s=0.0):
        async def pickup():  # no recording notice configured
            await asyncio.sleep(pickup_s)
        session._is_greeting = True
        session._opening_task = asyncio.create_task(pickup())
        session._greeting_task = asyncio.create_task(session._play_greeting(session._opening_task, self.GREETING))

    def test_speech_during_the_pickup_window_is_answered_and_never_greeted_over(self):
        session, sent = self._session(reply("Hi there, how can I help you today?"))

        async def go():
            self._start_opening(session, pickup_s=0.2)
            await asyncio.sleep(0.05)  # the caller says "hello?" before anything played
            await session._handle_transcript("hello?")
            await session._greeting_task
        run(go())
        self.assertLessEqual(self.tts_texts.count(self.GREETING), 1)
        self.assertNotEqual(self.tts_texts[-1], self.GREETING)  # nothing of the greeting after the answer
        self.assertIn("Hi there, how can I help you today?", self.tts_texts)
        self.assertEqual(session._greeting_until, 0.0)  # the answer itself can be interrupted
        self.assertFalse(session._is_greeting)

    def test_interrupting_the_greeting_clears_it_and_the_answer_stays_interruptible(self):
        session, sent = self._session(reply("Sure, what can I do for you?"))

        async def go():
            self._start_opening(session)
            await BargeInScenarios._wait_for(lambda: any(e["event"] == "media" for e in sent))  # the greeting is playing
            await session._handle_transcript("hi, I need an appointment")
            await session._greeting_task
        run(go())
        events = [e["event"] for e in sent]
        self.assertIn("clear", events)
        self.assertIn("media", events[events.index("clear"):])  # the answer played after the clear
        self.assertEqual(self.tts_texts.count(self.GREETING), 1)
        self.assertEqual(session._greeting_until, 0.0)
        self.assertIsNone(session.barge_in_block_reason)

    def test_a_silent_caller_hears_the_whole_greeting(self):
        session, sent = self._session(reply("unused"))

        async def go():
            self._start_opening(session)
            await session._greeting_task
        run(go())
        self.assertNotIn("clear", [e["event"] for e in sent])
        self.assertEqual(self.tts_texts, [self.GREETING])
        self.assertFalse(session._is_greeting)
        self.assertGreater(session._greeting_until, time.monotonic())  # still playing: protected from echo barge-ins
        self.assertEqual(session.barge_in_block_reason, "greeting")


class FirstTokenDeadline(unittest.TestCase):
    """Live call CA7bb473994c turn 8: Gemini sent nothing for 5.7 s (the stream timeout is 8 s), the caller heard silence and
    said "Hello" over and over. A provider that is not last now gets FIRST_TOKEN_TIMEOUT_S, then the next one answers."""

    @staticmethod
    def _backend(provider, script, first_token_timeout=None):
        """An OpenAI-style streaming backend whose HTTP response is `script`: a list of (delay_s, sse_line)."""
        import httpx
        from backend.ai.engine.agent.llm_backend import GroqChatBackend

        class Body(httpx.AsyncByteStream):
            async def __aiter__(self):
                for delay, line in script:
                    await asyncio.sleep(delay)
                    yield (line + "\n\n").encode()

        async def handler(request):
            return httpx.Response(200, stream=Body())

        b = GroqChatBackend(model=provider, first_token_timeout=first_token_timeout)
        b.provider = provider
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        b.client = lambda: client
        b.api_key = lambda: "k"
        return b

    @staticmethod
    def _sse(text):
        return "data: " + json.dumps({"choices": [{"delta": {"content": text}}]})

    def _collect(self, backend):
        async def go():
            started = time.monotonic()
            out = [ev async for ev in backend.chat_stream([{"role": "user", "content": "hi"}], [])]
            return out, time.monotonic() - started
        return run(go())

    def test_a_stalled_provider_hands_over_to_the_next_one(self):
        from backend.ai.engine.agent import llm_backend
        llm_backend._COOLDOWN_UNTIL.clear()
        stalled = self._backend("stalled", [(5.0, self._sse("late"))], first_token_timeout=0.3)
        healthy = self._backend("healthy", [(0.05, self._sse("Hello there.")), (0, "data: [DONE]")])
        chain = llm_backend.FallbackChatBackend([stalled, healthy])
        out, took = self._collect(chain)
        llm_backend._COOLDOWN_UNTIL.clear()
        self.assertEqual([e["delta"] for e in out if e["type"] == "text"], ["Hello there."])
        self.assertLess(took, 1.5)
        self.assertEqual(chain.last_provider, "healthy")

    def test_a_slow_answer_is_not_cut_once_the_first_token_arrived(self):
        slow = self._backend("slow", [(0.1, self._sse("One, ")), (0.6, self._sse("two.")), (0, "data: [DONE]")], first_token_timeout=0.3)
        out, _ = self._collect(slow)
        self.assertEqual("".join(e["delta"] for e in out if e["type"] == "text"), "One, two.")

    def test_the_last_provider_in_the_chain_has_no_first_token_deadline(self):
        from backend.ai.engine.agent import llm_backend
        from types import SimpleNamespace
        from unittest import mock
        settings = SimpleNamespace(LLM_PROVIDERS="gemini,groq", GEMINI_API_KEY="k", GROQ_API_KEY="k", GEMINI_MODEL="gemini-x")
        with mock.patch("backend.server.common.config.get_settings", return_value=settings), \
                mock.patch.object(llm_backend.GroqChatBackend, "api_key", return_value="k"), \
                mock.patch.object(llm_backend.GeminiChatBackend, "api_key", return_value="k"):
            chain = llm_backend.build_chat_backend()
        self.assertEqual([b.first_token_timeout for b in chain.backends], [llm_backend.FIRST_TOKEN_TIMEOUT_S, None])

    def test_through_the_engine_the_caller_hears_the_next_provider_quickly(self):
        from backend.ai.engine.agent import llm_backend
        llm_backend._COOLDOWN_UNTIL.clear()
        stalled = self._backend("stalled", [(5.0, self._sse("late"))], first_token_timeout=0.3)
        healthy = self._backend("healthy", [(0.05, self._sse("Hello there, how can I help?")), (0, "data: [DONE]")])
        engine, _ = make_engine(llm_backend.FallbackChatBackend([stalled, healthy]))

        async def go():
            started = time.monotonic()
            said = [e["text"] async for e in engine.turn_events("hi", stream=True) if e["type"] == "sentence"]
            return said, time.monotonic() - started
        said, took = run(go())
        llm_backend._COOLDOWN_UNTIL.clear()
        self.assertEqual(said, ["Hello there, how can I help?"])
        self.assertLess(took, 1.5)


class TextEndBackend(ScriptedBackend):
    """ScriptedBackend that, like a real provider, says when the words are complete (text_end) and then takes `tail_s`
    (tool-call arguments, usage chunk, connection close) before the final event."""

    def __init__(self, *responses, tail_s=0.4, log=None):
        super().__init__(*responses)
        self.tail_s = tail_s
        self.log = log if log is not None else []

    async def chat_stream(self, messages, tools):
        r = self._next(messages, tools)
        text = r["content"] or ""
        for i in range(0, len(text), 7):
            yield {"type": "text", "delta": text[i : i + 7]}
        yield {"type": "text_end"}
        await asyncio.sleep(self.tail_s)
        self.log.append("final")
        yield {"type": "final", "content": text or None, "tool_calls": r["tool_calls"]}


class TrailingQuestionRelease(unittest.TestCase):
    """A reply usually ends with its question, which OneQuestion holds until nothing newer can replace it. That used to be
    the end of the HTTP stream; now it is the moment the provider says the words are complete (finish_reason, or the first
    tool-call delta), so the stream's tail no longer delays the question."""

    _backend = staticmethod(FirstTokenDeadline._backend)
    _sse = staticmethod(FirstTokenDeadline._sse)

    @staticmethod
    def _timed(backend):
        async def go():
            started = time.monotonic()
            return [(round(time.monotonic() - started, 3), ev) async for ev in backend.chat_stream([{"role": "user", "content": "hi"}], [])]
        return run(go())

    def test_finish_reason_is_parsed_only_when_present(self):
        from backend.ai.engine.agent.llm_backend import parse_sse_line
        self.assertEqual(parse_sse_line('data: {"choices":[{"delta":{"content":"hi"}}]}'), {"content": "hi"})
        self.assertEqual(parse_sse_line('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}'), {"finish_reason": "stop"})
        self.assertIsNone(parse_sse_line('data: {"choices":[],"usage":{"total_tokens":9}}'))

    def test_a_real_stream_says_the_text_ended_before_its_tail(self):
        b = self._backend("p", [
            (0.02, self._sse("Thanks for calling. How can I help you today?")),
            (0, 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}'),
            (0.4, 'data: {"choices":[],"usage":{"total_tokens":9}}'),
            (0, "data: [DONE]"),
        ])
        out = self._timed(b)
        types = [ev["type"] for _, ev in out]
        self.assertEqual(types, ["text", "text_end", "final"])
        ended = next(t for t, ev in out if ev["type"] == "text_end")
        final = next(t for t, ev in out if ev["type"] == "final")
        self.assertLess(ended, 0.3)
        self.assertGreaterEqual(final, 0.4)

    def test_the_first_tool_call_delta_ends_the_text_once(self):
        def tc(args):
            return "data: " + json.dumps({"choices": [{"delta": {"tool_calls": [{"index": 0, "id": "c1", "function": {"name": "check_availability", "arguments": args}}]}}]})
        b = self._backend("p", [
            (0.02, self._sse("Which day suits you?")),
            (0, tc('{"date": ')),
            (0.3, tc('"2030-01-01"}')),
            (0, 'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}'),
            (0, "data: [DONE]"),
        ])
        out = self._timed(b)
        self.assertEqual([ev["type"] for _, ev in out].count("text_end"), 1)
        ended = next(t for t, ev in out if ev["type"] == "text_end")
        self.assertLess(ended, 0.2)  # before the arguments finished streaming
        self.assertEqual(out[-1][1]["tool_calls"][0]["arguments"], '{"date": "2030-01-01"}')

    def _turn(self, backend, utterance="hello"):
        engine, _ = make_engine(backend)

        async def go():
            return [e async for e in engine.turn_events(utterance, stream=True)]
        events = run(go())
        return [e["text"] for e in events if e["type"] == "sentence"], events[-1]["turn"]

    def test_the_trailing_question_is_spoken_before_the_stream_closes(self):
        log = []
        backend = TextEndBackend(reply("Thanks for calling. How can I help you today?"), log=log)
        engine, _ = make_engine(backend)

        async def go():
            async for e in engine.turn_events("hello", stream=True):
                if e["type"] == "sentence":
                    log.append(e["text"])
        run(go())
        self.assertEqual(log, ["Thanks for calling.", "How can I help you today?", "final"])

    def test_every_sentence_is_spoken_exactly_once(self):
        text = "Of course. Our clinic is open on weekdays. Which day suits you?"
        said, turn = self._turn(TextEndBackend(reply(text), tail_s=0.05))
        self.assertEqual(said, ["Of course.", "Our clinic is open on weekdays.", "Which day suits you?"])
        self.assertEqual(turn.reply, text)

    def test_a_draft_question_is_still_replaced(self):
        said, _ = self._turn(TextEndBackend(reply("What service do you need? Sure! Which service are you after?"), tail_s=0.05), "I want to book")
        self.assertEqual(said, ["Sure!", "Which service are you after?"])

    def test_an_invented_time_in_the_last_sentence_is_still_blocked(self):
        said, _ = self._turn(TextEndBackend(
            reply("Thanks for calling. Shall I book you tomorrow at 3 PM?"),
            reply("Sure, which day would suit you?"),
            tail_s=0.05,
        ), "I need an appointment")
        self.assertFalse(any("3 PM" in s for s in said), said)


class HeardOnlyHistory(unittest.TestCase):
    """The engine generates ahead of playback, so when the caller interrupts, sentences that were queued but never played
    used to be committed as if said: the model's memory and the call log held words the caller never heard, and a "yes"
    could accept a proposal (toolbox.last_assistant) they never heard. Only what reached the caller is kept now."""

    def _runtime(self, text):
        from backend.ai.engine.agent.facts import AgentProfile
        from backend.ai.engine.agent.runtime import AgentRuntime
        engine, _ = make_engine(ScriptedBackend(reply(text)))
        return AgentRuntime(engine, "llm_agent", AgentProfile())

    @staticmethod
    def _speaker(results):
        said = []

        async def speak(text, **kw):
            said.append(text)
            await asyncio.sleep(0.05)  # playback takes time: the engine runs ahead meanwhile
            return results[len(said) - 1]
        return speak, said

    def test_queued_sentences_the_caller_never_heard_are_not_committed(self):
        rt = self._runtime("One is here. Two is here. Three is here.")
        speak, said = self._speaker([False])  # interrupted while sentence one played
        run_ = run(rt.run_turn("hello", speak))
        self.assertEqual(said, ["One is here."])
        self.assertEqual(rt.engine._turns[-1][-1]["content"], "One is here.")
        self.assertEqual(run_.turn.reply, "One is here.")  # what the call log records

    def test_a_sentence_dropped_before_any_audio_is_not_heard(self):
        from backend.ai.engine.agent.runtime import NOT_PLAYED
        rt = self._runtime("One is here. Two is here.")
        speak, _ = self._speaker([NOT_PLAYED])
        run_ = run(rt.run_turn("hello", speak))
        self.assertTrue(run_.interrupted)
        self.assertEqual(rt.engine._turns[-1][-1]["content"], "…")
        self.assertNotIn("One", rt.engine.toolbox.last_assistant)

    def test_an_unheard_proposal_cannot_be_accepted_with_yes(self):
        from backend.ai.engine.agent.runtime import NOT_PLAYED
        rt = self._runtime("Monday works well. Shall I book you for ten on Monday?")
        speak, said = self._speaker([True, NOT_PLAYED])
        run_ = run(rt.run_turn("I'd like Monday", speak))
        self.assertEqual(said, ["Monday works well.", "Shall I book you for ten on Monday?"])
        self.assertEqual(run_.turn.reply, "Monday works well.")
        self.assertNotIn("book you", rt.engine.toolbox.last_assistant)
        self.assertNotIn("book you", rt.engine.ctrl.last_ai_turn)

    def test_an_uninterrupted_turn_is_committed_unchanged(self):
        text = "One is here. Two is here."
        rt = self._runtime(text)
        speak, _ = self._speaker([True, True])
        run_ = run(rt.run_turn("hello", speak))
        self.assertEqual(rt.engine._turns[-1][-1]["content"], text)
        self.assertEqual(run_.turn.reply, text)


class HumanTransfer(unittest.TestCase):
    """A transfer goes out through the provider carrying the call; when it cannot, the caller is told and the call stays up."""

    def _session(self, provider):
        from backend.ai.realtime.twilio import gateway

        gw = GatewayTurn()
        s, _ = gw._session(ScriptedBackend(reply("Ok.")))
        self.addCleanup(gw.tearDown)
        s.provider = provider
        spoken = []

        async def speak(text, emotion=None):
            spoken.append(text)
            return True

        s._speak_turn = speak
        return s, spoken, gateway

    def test_plivo_call_is_moved_to_our_dial_xml(self):
        from unittest.mock import patch

        s, spoken, gateway = self._session("plivo")
        s.call_id = "uuid-1"
        seen = {}

        async def transfer(call_uuid, url):
            seen.update(uuid=call_uuid, url=url)
            return True

        async def no_twilio(*a):
            raise AssertionError("a Plivo call must not go through Twilio")

        with patch.object(gateway.plivo_client, "transfer_call", transfer), patch.object(gateway, "redirect_call", no_twilio):
            ok = run(s._hand_off("<Response/>", {"phone_number": "+919812345678", "staff_name": "Front desk", "department": "front_desk"}))
        self.assertTrue(ok)
        self.assertEqual(seen["uuid"], "uuid-1")
        self.assertIn("/api/voice/plivo/transfer?", seen["url"])
        self.assertIn("staff_phone=%2B919812345678", seen["url"])
        self.assertEqual(spoken, [])

    def test_twilio_call_keeps_the_twiml_redirect(self):
        from unittest.mock import patch

        s, _, gateway = self._session("twilio")
        seen = []

        async def redirect(call_sid, twiml):
            seen.append((call_sid, twiml))
            return True

        with patch.object(gateway, "redirect_call", redirect):
            self.assertTrue(run(s._hand_off("<Response><Dial>+1</Dial></Response>", {"phone_number": "+1"})))
        self.assertEqual(seen, [("CA1", "<Response><Dial>+1</Dial></Response>")])

    def test_a_failed_transfer_is_said_and_the_call_stays_up(self):
        from unittest.mock import patch

        s, spoken, gateway = self._session("plivo")

        async def refused(call_uuid, url):
            return False

        with patch.object(gateway.plivo_client, "transfer_call", refused):
            self.assertFalse(run(s._hand_off(None, {"phone_number": "+919812345678"})))
            self.assertFalse(run(s._hand_off(None, None)))  # no staff number at all
        self.assertEqual(len(spoken), 2)
        self.assertTrue(all("connect" in line for line in spoken))  # the language pack's "can't connect you" line
        self.assertFalse(s.should_close)

    def test_dashboard_takeover_on_plivo_silences_the_ai_announces_and_transfers(self):
        from unittest.mock import patch

        s, spoken, gateway = self._session("plivo")
        cleared = []

        async def clear(ws, sid, pcm=False, provider="twilio"):
            cleared.append(provider)

        s.barge_in.handle_caller_speech = clear
        seen = {}

        async def transfer(call_uuid, url):
            seen["url"] = url
            return True

        generation = s.barge_in.generation
        with patch.object(gateway.plivo_client, "transfer_call", transfer):
            self.assertTrue(run(s.take_over("+919812345678", "<Response/>")))
        self.assertGreater(s.barge_in.generation, generation)  # the running AI turn is stopped
        self.assertEqual(cleared, ["plivo"])  # queued AI audio is cleared at the caller's end
        self.assertEqual(len(spoken), 1)  # "please stay on the line, connecting you to our staff"
        self.assertIn("staff_phone=%2B919812345678", seen["url"])
        self.assertTrue(s.should_close)
        s._enqueue_turn({"text": "hello?"})  # the caller speaks during the hand-off: the AI must not answer
        self.assertEqual(s._turn_inbox, [])

    def test_refused_takeover_leaves_the_ai_on_the_call(self):
        from unittest.mock import patch

        s, spoken, gateway = self._session("plivo")

        async def clear(*a, **k):
            return None

        s.barge_in.handle_caller_speech = clear

        async def refused(call_uuid, url):
            return False

        with patch.object(gateway.plivo_client, "transfer_call", refused):
            self.assertFalse(run(s.take_over("+919812345678", None)))
        self.assertFalse(s.should_close)
        self.assertFalse(s._handing_off)  # the AI answers the caller again
        self.assertEqual(len(spoken), 1)  # only the "connecting you" line; no "can't connect you" for a staff-side failure


class OpeningNotice(unittest.TestCase):
    """The recording notice is the call's first audio and plays while the call is still being set up; the greeting follows."""

    def test_notice_plays_during_setup_then_the_greeting(self):
        from unittest.mock import patch

        from backend.ai.realtime.twilio import gateway

        events = []

        class WS:
            async def send_text(self, text):
                pass

        async def slow_agent(*a, **k):
            await asyncio.sleep(0.3)  # the LLM agent takes a while to build (prompt, facts, tools)
            events.append("agent_ready")
            return None

        class STT:
            def __init__(self, *a, **k):
                pass

        async def nothing(*a, **k):
            return None

        s = gateway.CallSession(WS(), "biz")

        async def speak(text, emotion=None):
            events.append(text)
            return True

        s._speak_turn = speak
        s._connect_stt = nothing
        s._watchdog = nothing
        s._prewarm_fillers = nothing
        s._warm_providers = lambda force=False: None
        with patch.object(gateway, "load_vertical_name", lambda b: "clinic"), \
             patch.object(gateway, "load_business_context", lambda b: ("Demo clinic", [])), \
             patch.object(gateway, "load_agent_settings", lambda b: {"language": "en", "greeting": "Hello from Demo clinic."}), \
             patch.object(gateway.policy_service, "notice_for", lambda b, lang: "This call may be recorded."), \
             patch.object(gateway, "caller_memory", lambda b, p: ("", "")), \
             patch.object(gateway.AgentRuntime, "create", slow_agent), \
             patch.object(gateway, "record_call_start", lambda **k: None), \
             patch.object(gateway, "DeepgramLiveConnection", STT), \
             patch.object(gateway, "PICKUP_WINDOW_S", 0.0):
            async def go():
                await s.start("MS1", "CA-notice", "+919876543210")  # returns once set up: the greeting plays beside the receive loop
                await s._greeting_task
            run(go())
        self.assertEqual(events, ["This call may be recorded.", "agent_ready", "Hello from Demo clinic."])
        self.assertFalse(s._is_greeting)


class GreetingBesideTheReceiveLoop(unittest.TestCase):
    """The greeting used to be awaited inside the media receive loop, so the caller's audio reached neither STT nor barge-in
    detection until the whole greeting had been synthesised and sent. It now plays as its own task; the recording notice
    still always plays in full; a hang-up during the opening cleans up."""

    GREETING = "Hello from Demo clinic."
    NOTICE = "This call may be recorded."

    def _patched(self, speak, handle_media=None):
        from contextlib import ExitStack
        from unittest.mock import patch

        from backend.ai.realtime.twilio import gateway

        async def nothing(*a, **k):
            return None

        class STT:
            def __init__(self, *a, **k):
                pass

            async def close(self):
                pass

        stack = ExitStack()
        for target, name, value in [
            (gateway, "load_vertical_name", lambda b: "clinic"),
            (gateway, "load_business_context", lambda b: ("Demo clinic", [])),
            (gateway, "load_agent_settings", lambda b: {"language": "en", "greeting": self.GREETING}),
            (gateway.policy_service, "notice_for", lambda b, lang: self.NOTICE),
            (gateway, "caller_memory", lambda b, p: ("", "")),
            (gateway.AgentRuntime, "create", nothing),
            (gateway, "record_call_start", lambda **k: None),
            (gateway, "record_call_end", lambda **k: None),
            (gateway, "DeepgramLiveConnection", STT),
            (gateway, "PICKUP_WINDOW_S", 0.0),
            (gateway, "stream_token_ok", lambda b, t: True),
            (gateway.CallSession, "_speak_turn", speak),
            (gateway.CallSession, "_connect_stt", nothing),
            (gateway.CallSession, "_watchdog", nothing),
            (gateway.CallSession, "_prewarm_fillers", nothing),
            (gateway.CallSession, "_warm_providers", lambda self, force=False: None),
        ] + ([(gateway.CallSession, "handle_media", handle_media)] if handle_media else []):
            stack.enter_context(patch.object(target, name, value))
        return stack

    @staticmethod
    def _socket(script):
        """A Twilio media-stream socket that delivers `script`: (delay_s, message dict) pairs."""
        class WS:
            query_params: dict = {}

            async def accept(self):
                pass

            async def receive_text(self):
                if not script:
                    await asyncio.sleep(10)
                delay, msg = script.pop(0)
                await asyncio.sleep(delay)
                return json.dumps(msg)

            async def send_text(self, text):
                pass

            async def close(self):
                pass
        return WS()

    START = {"event": "start", "start": {"streamSid": "MS1", "callSid": "CA-greet", "customParameters": {"token": "t"}}}
    MEDIA = {"event": "media", "media": {"payload": "/w=="}}

    def test_caller_audio_is_processed_while_the_greeting_is_spoken(self):
        from backend.ai.realtime.twilio import gateway
        timeline = []

        async def speak(self_, text, emotion=None):
            if text == GreetingBesideTheReceiveLoop.GREETING:
                await asyncio.sleep(0.5)  # the greeting takes a while to synthesise and send
            timeline.append(("spoken", text))
            return True

        async def handle_media(self_, payload):
            timeline.append(("media", None))

        script = [(0, self.START)] + [(0.02, self.MEDIA)] * 5 + [(0.8, {"event": "stop"})]
        with self._patched(speak, handle_media):
            run(gateway.twilio_media_stream(self._socket(script), "biz"))
        first_media = next(i for i, (kind, _) in enumerate(timeline) if kind == "media")
        greeting_at = timeline.index(("spoken", self.GREETING))
        self.assertLess(first_media, greeting_at, timeline)

    def test_a_hang_up_during_the_greeting_cancels_it(self):
        from backend.ai.realtime.twilio import gateway
        sessions, finished = [], []
        real_init = gateway.CallSession.__init__

        def init(self_, *a, **k):
            real_init(self_, *a, **k)
            sessions.append(self_)

        async def speak(self_, text, emotion=None):
            if text == GreetingBesideTheReceiveLoop.GREETING:
                await asyncio.sleep(5)  # still being spoken when the caller hangs up
            finished.append(text)
            return True

        script = [(0, self.START), (0.1, {"event": "stop"})]
        from unittest.mock import patch
        with self._patched(speak), patch.object(gateway.CallSession, "__init__", init):
            async def go():
                await gateway.twilio_media_stream(self._socket(script), "biz")
                await asyncio.sleep(0)  # let the cancellation land
            run(go())
        s = sessions[0]
        self.assertTrue(s._greeting_task.done())
        self.assertNotIn(self.GREETING, finished)
        self.assertFalse(s._is_greeting)

    def test_the_recording_notice_is_never_cut_by_a_caller_who_talks_over_it(self):
        gw = GatewayTurn()
        session, sent = gw._session(ScriptedBackend(reply("Hello, how can I help?")))
        try:
            async def go():
                started = time.monotonic()

                async def notice():  # still being sent; by the send estimate it ends 0.2 s later, but the provider
                    await asyncio.sleep(0.2)  # echoes its mark (it has played) only 0.4 s later: playout runs behind
                    session._notice_mark = "m-notice"
                    session.barge_in.playback_until = time.monotonic() + 0.2
                    asyncio.get_running_loop().call_later(0.4, session.note_mark_echo, "m-notice")
                session._opening_task = asyncio.create_task(notice())
                session._is_greeting = True
                session.barge_in.playback_until = time.monotonic() + 5
                cleared_at = []
                real = session.barge_in.handle_caller_speech

                async def clear(*a, **k):
                    cleared_at.append(time.monotonic() - started)
                    return await real(*a, **k)
                session.barge_in.handle_caller_speech = clear
                await session._handle_transcript("hello?")
                return cleared_at
            cleared_at = run(go())
        finally:
            gw.tearDown()
        self.assertGreaterEqual(cleared_at[0], 0.58)  # only after the provider said the notice had played
        self.assertTrue(any(e["event"] == "media" for e in sent))  # and the caller was answered


class DeepgramPreconnectAudio(unittest.TestCase):
    """Audio that arrives while the STT connection is opening is held (newest few seconds) and sent first, in order."""

    def _connect(self, conn, sends, during_flush=None):
        from unittest.mock import patch

        from backend.ai.speech.stt import deepgram

        class WS:
            async def send(self, b):
                sends.append(bytes(b))
                if during_flush and len(sends) == 1:
                    await during_flush()  # live audio arriving while the held audio is being sent

            def __aiter__(self):
                async def gen():
                    if False:
                        yield
                return gen()

        async def connect(*a, **k):
            return WS()

        conn.api_key = "k"
        with patch.object(deepgram.websockets, "connect", connect):
            return run(conn.connect())

    def test_audio_before_the_connection_is_sent_first_and_in_order(self):
        conn = DeepgramLiveConnection(encoding="mulaw")
        sends = []
        started = time.monotonic()
        run(conn.send_audio(b"\x01" * 160))
        run(conn.send_audio(b"\x02" * 160))

        async def live_during_flush():
            await conn.send_audio(b"\x03" * 160)  # the connection is not published yet: held, not sent out of order
        self.assertTrue(self._connect(conn, sends, live_during_flush))
        run(conn.send_audio(b"\x04" * 160))
        self.assertEqual(b"".join(sends), b"\x01" * 160 + b"\x02" * 160 + b"\x03" * 160 + b"\x04" * 160)
        self.assertLess(abs(conn.audio_t0 - started), 0.1)  # word offsets count from the first held byte
        self.assertEqual(conn.audio_between(0.0, 0.02), b"\x01" * 160)

    def test_only_the_newest_audio_is_held(self):
        from backend.ai.speech.stt import deepgram
        conn = DeepgramLiveConnection(encoding="mulaw")
        for i in range(5):  # 5 s while the connection is still opening
            run(conn.send_audio(bytes([i]) * 8000))
        held = bytes(conn._preconnect)
        self.assertEqual(len(held), int(deepgram.PRECONNECT_AUDIO_S * 8000))
        self.assertEqual(held[-1], 4)
        self.assertEqual(held[0], 2)


class SoundCues(unittest.TestCase):
    """A laugh the transcript drops is still heard: scored from the caller's own audio and turned into the turn's mood."""

    def test_mulaw_decoder_matches_the_standard(self):
        from backend.ai.realtime.audio.paralinguistic import _MULAW

        try:
            import audioop  # removed in Python 3.13: compare where it still exists
        except ImportError:
            self.skipTest("no audioop to compare with")
        import numpy as np

        self.assertTrue((np.frombuffer(audioop.ulaw2lin(bytes(range(256)), 2), dtype="<i2") == _MULAW).all())

    def test_missing_model_means_no_cues_not_a_broken_call(self):
        from pathlib import Path

        from backend.ai.realtime.audio.paralinguistic import CueDetector

        d = CueDetector(Path("/nonexistent/yamnet.tflite"))
        self.assertFalse(d.available())
        self.assertIsNone(d.score(b"\xff" * 8000))

    def test_silence_scores_no_laughter(self):
        from backend.ai.realtime.audio.paralinguistic import LAUGHTER_MIN, cue_detector

        if not cue_detector.available():
            self.skipTest("YAMNet model/runtime not installed here")
        cues = cue_detector.score(b"\xff" * 16000)  # 2 s of mulaw silence
        self.assertLess(cues["laughter"], LAUGHTER_MIN)
        self.assertLess(cues["ms"], 500)

    def test_deepgram_keeps_the_audio_it_heard_by_word_offset(self):
        conn = DeepgramLiveConnection(encoding="mulaw")

        class WS:
            async def send(self, b):
                pass

        conn._ws = WS()
        for i in range(4):  # 4 s of audio, one byte value per second
            run(conn.send_audio(bytes([i]) * 8000))
        self.assertEqual(conn.audio_between(1.0, 2.0), bytes([1]) * 8000)
        self.assertEqual(conn.audio_between(3.5), bytes([3]) * 4000)  # to the end
        from backend.ai.speech.stt import deepgram

        conn._recent = bytearray(conn._recent[-8000:])  # as if only the last second were kept
        conn._recent_start = 3 * 8000
        self.assertEqual(conn.audio_between(0.0, 1.0), b"")  # older audio is gone, never mis-aligned
        self.assertGreater(deepgram.RECENT_AUDIO_S, 10)

    def test_a_heard_laugh_makes_the_turn_amused_unless_the_words_are_serious(self):
        from backend.ai.engine.agent.emotion import EmotionState

        e = EmotionState()
        self.assertIsNone(e.hear("kya baat hai yaar"))
        self.assertIsNotNone(e.hear("kya baat hai yaar", laughed=True))
        self.assertEqual(e.mood, "amused")
        e.hear("mere daant mein bahut dard ho raha hai", laughed=True)  # nervous laugh about pain: still serious
        self.assertNotEqual(e.mood, "amused")

    def test_cues_reach_the_agent_for_one_turn_only(self):
        backend = ScriptedBackend(reply("Haha, thank you!"), reply("Sure."))
        engine, _ = make_engine(backend)
        engine.audio_cues = {"laughter": 0.3, "sigh": 0.0, "ms": 9.0}
        run(engine.turn("kya baat hai yaar"))
        notes = [m["content"] for m in backend.seen[0]["messages"] if m.get("role") == "system"]
        self.assertTrue(any("laughing" in n for n in notes))  # the amused mood note
        self.assertIsNone(engine.audio_cues)
        run(engine.turn("ok"))
        notes = [m["content"] for m in backend.seen[-1]["messages"] if m.get("role") == "system"]
        self.assertFalse(any("laughing" in n for n in notes))

    def test_gateway_scores_the_turn_audio_for_the_agent(self):
        from unittest.mock import patch

        gw = GatewayTurn()
        s, _ = gw._session(ScriptedBackend(reply("Ok.")))
        self.addCleanup(gw.tearDown)
        conn = DeepgramLiveConnection(encoding="mulaw")
        conn._recent = bytearray(b"\x01" * 8000 + b"\x02" * 8000)
        s.stt = conn
        seen = {}

        def fake_score(audio, encoding="mulaw", rate=8000):
            seen["audio"] = audio
            return {"laughter": 0.4, "sigh": 0.0, "ms": 5.0}

        from backend.ai.realtime.twilio import gateway

        with patch.object(gateway.cue_detector, "score", fake_score):
            run(s._hear_cues(1.5, "kya baat hai yaar"))
        self.assertEqual(seen["audio"], b"\x02" * 8000)  # from 0.5 s before the first word to now
        self.assertEqual(s.agent_rt.engine.audio_cues["laughter"], 0.4)

    def test_caller_audio_capture_is_flagged_for_production(self):
        from backend.server.common.config import Settings, production_problems

        self.assertTrue(any("CAPTURE_CALLER_AUDIO" in p for p in production_problems(Settings(CAPTURE_CALLER_AUDIO=True))))


class LogsCarryNoPatientData(_GatewayHarness, unittest.TestCase):
    """Call logs keep ids, counts and timings; never what the caller said or was told, their number, audio or the stream token."""

    def test_a_turn_logs_neither_the_transcript_nor_the_reply(self):
        import contextlib
        import io

        session, _ = self._session(reply("Monday works well. Shall I book that for you?"))
        out = io.StringIO()
        with contextlib.redirect_stdout(out), self.assertLogs("backend.ai", "INFO") as logs:
            run(session._handle_transcript("This is Priya Sharma, I'd like Monday"))
        text = out.getvalue() + "\n".join(logs.output)
        self.assertIn("[TTS OUT]", text)  # the turn did log...
        for private in ("Priya", "Sharma", "Monday", "book that"):
            self.assertNotIn(private, text)  # ...but none of the words

    def test_provider_frames_are_logged_by_shape_only(self):
        from backend.ai.realtime.twilio.gateway import ws_frame_shape

        start = {"event": "start", "start": {"streamSid": "MZ1", "callSid": "CA1", "mediaFormat": {"encoding": "audio/x-mulaw"},
                                             "customParameters": {"caller_number": "+447700900123", "token": "sig.abc"}}}
        media = {"event": "media", "streamSid": "MZ1", "media": {"track": "inbound", "payload": "//////79fX19"}}
        plivo = {"event": "start", "streamId": "S1", "start": {"callId": "C1"}, "extra_headers": "token=sig.abc;caller=+447700900123"}
        logged = " ".join(json.dumps(ws_frame_shape(f)) for f in (start, media, plivo))
        for private in ("447700900123", "sig.abc", "//////79fX19"):
            self.assertNotIn(private, logged)
        self.assertEqual(ws_frame_shape(start)["start.customParameters"], ["caller_number", "token"])
        self.assertEqual((ws_frame_shape(start)["start.callSid"], ws_frame_shape(media)["media.payload_len"]), ("CA1", 12))
        self.assertEqual(ws_frame_shape({"event": "mark", "mark": {"name": "m7"}})["mark.name"], "m7")

    def test_an_emergency_is_logged_without_the_callers_words(self):
        from backend.ai.capabilities.rules.safety_emergency import EmergencyRule

        with self.assertLogs("backend.ai.capabilities.rules.safety_emergency", "WARNING") as logs:
            hit, _ = EmergencyRule.evaluate("Mein Vater hatte gerade einen Herzinfarkt")
        self.assertTrue(hit)  # the rule itself is unchanged
        self.assertNotIn("Herzinfarkt", "\n".join(logs.output))


class HangUpMidTurn(_GatewayHarness, unittest.TestCase):
    def test_a_turn_cut_off_by_the_call_ending_still_reports_and_says_so(self):
        session, _ = self._session(reply("Ok."))

        async def slow(transcript):
            await asyncio.sleep(5)  # still answering when the caller hangs up

        session._handle_transcript = slow

        async def go():
            with self.assertLogs("backend.latency", "INFO") as logs:
                session._enqueue_turn({"text": "hello there", "received_at": time.monotonic()})
                await asyncio.sleep(0.05)
                session._turn_worker.cancel()  # what stop() does
                await asyncio.gather(session._turn_worker, return_exceptions=True)
            return logs.output
        lines = [json.loads(l.split("[LATENCY] ", 1)[1]) for l in run(go()) if "[LATENCY] {" in l]
        self.assertEqual([l.get("ended_by") for l in lines], ["call_stopped"])

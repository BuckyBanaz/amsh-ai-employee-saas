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


class ProviderClients(unittest.TestCase):
    def test_pooled_client_keeps_connections_longer_than_httpx_default(self):
        client = pooled_http_client(timeout=4.0)
        self.assertGreater(client._transport._pool._keepalive_expiry, 5.0)

    def test_reasoning_params_only_for_reasoning_models(self):
        self.assertEqual(reasoning_params("openai/gpt-oss-20b"), {"reasoning_effort": "low"})
        self.assertEqual(reasoning_params("llama-3.3-70b-versatile"), {})


if __name__ == "__main__":
    unittest.main()

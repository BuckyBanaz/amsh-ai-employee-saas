# Amsh - Latency Optimization Strategy
**Target Goal:** Achieving < 800ms natural conversational latency (Aiming for the industry-leading ~300ms benchmark).

In voice AI, latency is the difference between an AI feeling like a slow robot versus a natural human. Human conversational turn-taking happens in about **200ms to 400ms**. If an AI takes more than 1000ms (1 second) to reply, callers will constantly interrupt it or think the call dropped.

Here is the strategy to optimize the Amsh Conversation Engine for ultra-low latency.

---

## 1. The "Zero-Latency" Illusion: Filler Words & Backchanneling
The fastest way to achieve 300ms latency is to cheat the physics of LLM generation. 
When the user stops speaking, it takes time for the LLM to process context and generate a response. Instead of waiting in silence:
- **Strategy:** The exact millisecond the user stops speaking (detected via VAD), the engine immediately streams a pre-recorded, 0ms latency audio byte of a filler word (e.g., *"Hmm..."*, *"Sure,"*, *"Let me check..."*). 
- **Benefit:** This buys the LLM and TTS engine an extra 400-600ms of "thinking time" in the background while the user hears an instant, human-like reaction. By the time the filler word finishes playing, the actual AI response is ready to stream.

## 2. Aggressive VAD (Voice Activity Detection)
Standard telephony systems wait for 500ms to 800ms of silence before concluding the user has stopped speaking. This adds an immediate 800ms penalty to the latency.
- **Strategy:** Use an aggressive, highly tuned VAD (like WebRTC VAD or Silero VAD) calibrated to detect the end of speech in **200ms to 300ms**.
- **Risk:** If tuned too aggressively, it might cut the user off while they are just taking a breath. We will mitigate this using Endpoint Prediction (see below).

## 3. Endpoint Prediction (Turn-Taking Prediction)
Instead of relying purely on acoustic silence (VAD), we use the context of the words to predict when the user is done.
- **Strategy:** The streaming STT (Deepgram) continuously sends partial transcripts. A lightweight model analyzes the grammar and intonation. If the user says *"Can I book an appointment for tomorrow?"*, the grammar indicates a natural stopping point. The engine can prepare to respond immediately, rather than waiting for 300ms of silence.

## 4. Fully Streaming Pipeline (No Buffering)
The core rule of the Amsh Engine: **Data must never rest.**
- **STT (Deepgram):** Use `interim_results=true` to process text as it is being spoken.
- **LLM (Groq):** Groq is the fastest LPU available. We use streaming mode. Do not wait for the entire paragraph to be generated. 
- **Sentence-level Chunking:** As soon as the LLM generates a complete thought (indicated by a comma `,`, period `.`, or question mark `?`), send that chunk immediately to the TTS engine. 
- **TTS (Fish Voice / Cartesia):** The TTS engine synthesizes the first chunk and streams it back to Twilio via WebSocket while the LLM is still generating the second chunk. 

## 5. Infrastructure Colocation
Network hops (ping) can easily add 150ms-200ms of latency if servers are spread across the globe.
- **Strategy:** Host the FastAPI Conversation Engine in the same AWS/GCP availability zone as the primary Twilio SIP trunk edge (e.g., `us-east-1` N. Virginia) and as close to Groq's data centers as possible. Eliminating network hops reduces round-trip time by up to 100ms.

---

### Expected Latency Breakdown (Optimized)
With these strategies in place, the true processing time looks like this:

| Component | Time Taken | Notes |
| :--- | :--- | :--- |
| **VAD / Endpoint Detection** | ~250ms | How fast we detect the user stopped talking |
| **STT Finalize** | ~50ms | Deepgram final transcript resolution |
| **LLM TTFT (Groq)** | ~70ms | Time To First Token (processing context) |
| **TTS First Audio Byte** | ~150ms | Cartesia / Fish Voice generating first chunk |
| **Network Overhead** | ~80ms | Colocated Twilio WebSocket ping |
| **Total True Latency** | **~600ms** | End-to-end response time |

*(Note: With the Filler Word strategy, the perceived latency drops to ~250ms).*

---

## 6. Implementation Status (v1.1, 2026-10-01)

The table above is a **target**, not a measurement. Live calls were reported at 3-4 s from the caller's last word to the first AI audio. A code trace of the live path (Twilio/Exotel -> Deepgram -> `AgentRuntime.run_turn` -> `AgentEngine.turn_events` -> Groq stream -> splitter -> Cartesia -> Twilio) found the causes below. **No real provider timings have been collected yet**: the per-turn `[LATENCY]` log (6.3) exists to do that.

### 6.1 Bottlenecks found (ranked by likely impact, from code, not measured)

| # | Cause | Evidence | Status |
| :--- | :--- | :--- | :--- |
| 1 | New TCP+TLS handshake to Groq **and** Cartesia on most turns | The pooled `httpx.AsyncClient`s used httpx's default 5 s idle keep-alive, shorter than a caller utterance plus our reply. `server/common/warmup.py` warmed throwaway clients, so it never helped | **Fixed** (6.2) |
| 2 | Extra sequential LLM requests in one turn | A tool call needs a 2nd round; a grounding/claim guard hit regenerates the round; a Groq 429 falls back to the next provider (Gemini ~1.25 s/turn). Each costs a full time-to-first-token | Now visible as `llm_attempts` in the log |
| 3 | gpt-oss-20b reasons before its first spoken word, on every round | Reasoning model, `reasoning_effort: low` | Measured as `llm_reasoning`; model not changed (6.4) |
| 4 | TTS waited for `.` `?` `!` `।` | `SentenceSplitter` | **Fixed**: early first clause (6.2). Small gain at Groq speed, larger on slower fallbacks |
| 5 | Tenant not on the agent | Global default `CONVERSATION_ENGINE=state_machine` = NLU LLM call that doesn't stream + state machine. `shadow` runs both engines and shares Groq rate limits | Check the `engine` field in the log |

Checked and **not** a problem: the `llm_agent` path does not run NLU (only on fallback); RAG runs only via the `search_knowledge` tool and is a local TF/fuzzy index (no embedding or network calls), so no intent router was added; telephony frames are sent as TTS bytes arrive (no whole-sentence buffering).

### 6.2 Changes made

| File | Change |
| :--- | :--- |
| `ai/llm/client.py`, `speech/tts/cartesia.py`, `engine/agent/llm_backend.py` | Shared `pooled_http_client()` with `PROVIDER_KEEPALIVE_SECONDS` (default 120 s); `warm()` on Groq and Cartesia clients |
| `realtime/twilio/gateway.py` | Warm Groq + Cartesia at call start and on caller `speech_started` (max every 20 s); per-turn latency tracker; shadow turns run in a detached context |
| `server/common/warmup.py` | Startup warm-up uses the real pooled clients |
| `engine/agent/agent_loop.py` | `SentenceSplitter(early=True)`: once per LLM round, release the first clause (`, ; : -`) to TTS if it has >= 4 words, no digits/time words, and does not open like a question (keeps the time-grounding guard and `OneQuestion` intact). Concurrent `check_availability` calls in one round run in parallel; all other tools stay sequential |
| `engine/agent/runtime.py` | Early chunking on for voice (`VOICE_EARLY_CHUNKING`, default true; off for WhatsApp) |
| `speech/stt/deepgram.py` | Records audio start time and last-word end, so `speech_end` can be estimated |
| `server/common/config.py` | `GROQ_MODEL`, `VOICE_EARLY_CHUNKING`, `PROVIDER_KEEPALIVE_SECONDS` |
| `engine/conversation/nlu.py` | `reasoning_effort` only sent to gpt-oss models (so `GROQ_MODEL` can change safely) |

### 6.3 Per-turn latency log

`backend/ai/realtime/latency.py`. Every live turn logs one JSON line `[LATENCY] {...}` and a readable table. All values are ms from the caller's estimated end of speech:

`speech_end`, `deepgram_final`, `llm_request_start`, `llm_first_token` (any token, incl. hidden reasoning), `llm_first_content`, `llm_first_chunk`, `tool_start` / `tool_end`, `tts_request_start`, `tts_first_audio`, `first_audio_sent_to_telephony`, `turn_end`, plus derived `stages_ms` (`stt_endpointing`, `llm_ttft_any`, `llm_reasoning`, `tts_ttfb`, `tts_to_telephony`), `llm_attempts`, `perceived_ms`, `engine`.

### 6.4 Model choice (not changed)

`GROQ_MODEL=llama-3.3-70b-versatile` (or the per-tenant AI Studio model picker) removes the reasoning step. Before switching production, booking tool-call reliability must be re-checked with the eval runner (`--engine agent --live`).

### 6.5 Tests and benchmark

- `python -m unittest backend.ai.evals.test_voice_latency` (25 tests): splitter rules, guards still blocking invented times / unbacked booking claims / duplicate questions, parallel reads, timing marks, a full gateway turn, barge-in still sends Twilio `clear`.
- `python -m backend.ai.evals.latency_bench`: simulated (assumed timings, **not production numbers**); `--live` uses real Groq + Cartesia. Compare connection reuse with `--live --keepalive 5 --idle 8` vs `--live --keepalive 120 --idle 8`.

### 6.6 Known issue (not fixed)

Audio is sent to Twilio ~4x faster than real time, so the "AI is speaking" flag clears while Twilio still has seconds of audio queued: the caller cannot barge in on the end of a sentence. Deepgram `speech_started` events are also not handled while a turn is running. Fix needs Twilio `mark` echo tracking; pending approval.

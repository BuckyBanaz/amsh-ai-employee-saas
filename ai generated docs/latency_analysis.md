# Amsh AI Receptionist — Conversation Latency Analysis

> **Target:** < 800ms true latency | ~250ms perceived latency (with filler word trick)

---

## 1. Normal Conversation Turn (Booking / Rescheduling)

These are the most common call interactions. RAG is **not triggered** — goes straight to Tool Calling.

| Stage | Time | Component |
|---|---|---|
| VAD — end of speech detected | ~250ms | WebRTC VAD / Silero VAD |
| STT — Deepgram final transcript | ~50ms | Deepgram nova-2 (streaming) |
| Intent Classification | ~70ms | Groq Llama-3 8B |
| LLM Generation (TTFT) | ~70ms | Groq Llama-3 70B / Mixtral |
| TTS — First audio byte | ~150ms | Cartesia |
| Network overhead | ~80ms | Colocated Twilio + FastAPI |
| **Total True Latency** | **~670ms** | |
| **Perceived Latency** | **~250ms** | With filler word trick |

---

## 2. FAQ / Policy Question Turn (RAG Triggered)

Triggered only when `intent == ask_question`. Adds ~70ms on top of normal flow.

| Stage | Time | Component |
|---|---|---|
| VAD + STT + Intent Classification | ~370ms | Same as above |
| Generate Query Embedding | ~30ms | text-embedding-3-small |
| Qdrant Hybrid Search (filtered) | ~40ms | business_id filter applied |
| LLM Generation with context | ~100ms | Slightly more due to context tokens |
| TTS + Network | ~230ms | Cartesia |
| **Total True Latency** | **~770ms** | |
| **Perceived Latency** | **~250ms** | Filler word covers the wait |

---

## 3. The Filler Word Trick — Perceived Latency Hack

> The single most impactful optimization in the entire pipeline.

**How it works:**
- The instant VAD detects the user has stopped speaking, the engine immediately streams a pre-recorded ~0ms audio filler:
  - *"Let me check..."*
  - *"Sure, one moment..."*
  - *"Hmm..."*
- This buys **400–600ms** of background processing time.
- By the time the filler word finishes playing, the real LLM response is already streaming to TTS.
- **Result:** User perceives ~250ms response time even though the pipeline took ~650–770ms.

---

## 4. Competitive Latency Comparison

| System | True Latency | Perceived | Feel |
|---|---|---|---|
| ChatGPT Voice | ~1500–2000ms | ~1500ms | Slow robot |
| ElevenLabs Conversational AI | ~800–1200ms | ~800ms | OK |
| Twilio AI Assistants | ~900–1500ms | ~900ms | Decent |
| **Amsh (this project target)** | **~670–770ms** | **~250ms** | **Human-like** |
| Human conversation | ~200–400ms | ~200ms | Natural |

---

## 5. Worst-Case Latency Scenarios

| Scenario | Extra Latency | Fix |
|---|---|---|
| Server cold start (first request) | +400–500ms | Keep-alive pings, container warmup |
| Cross-region servers (Twilio ≠ FastAPI region) | +150–200ms | Colocate all in `us-east-1` |
| Large RAG chunk retrieved | +50ms | Cap chunk size at 500 tokens |
| ElevenLabs TTS (vs Cartesia) | +100ms | Use Cartesia for production |
| Long conversation history in Redis | +20ms | Trim history to last 10 turns |
| Groq rate-limit fallback to OpenAI | +200–400ms | Pre-configure backup with same prompts |

---

## 6. Infrastructure Colocation Rule

All services **must** be deployed in the same cloud availability zone:

```
AWS us-east-1 (N. Virginia)
├── FastAPI Conversation Engine  ← Same AZ
├── Redis (ElastiCache)          ← Same AZ
├── PostgreSQL (RDS)             ← Same AZ
└── Qdrant (EC2 or managed)     ← Same AZ

Twilio SIP Edge: us1.sip.twilio.com  ← Closest edge to us-east-1
Groq API: colocated in us-east-1     ← Lowest RTT
```

Network round-trip between colocated services: ~5–10ms
Network round-trip if cross-region: ~150–200ms extra penalty

---

## 7. Streaming Pipeline Rule

> **Data must NEVER rest.** Every component streams output to the next as soon as the first token/byte is ready.

```
Deepgram STT:  interim_results=True   → partial transcripts mid-sentence
Groq LLM:      stream=True            → first token in ~70ms, not full response
TTS Cartesia:  stream=True            → first audio chunk at first sentence boundary
Twilio WS:     stream binary audio    → plays audio before full sentence is done
```

Sentence-level chunking rule:
- As soon as LLM outputs a `,` `.` or `?` → that chunk goes to TTS immediately
- Do NOT wait for the full paragraph to be generated

---

## 8. Summary

| Metric | Value |
|---|---|
| Target true latency | < 800ms |
| Target perceived latency | ~250ms |
| Worst case (with all mitigations) | < 1000ms |
| Industry benchmark (human-like) | < 400ms perceived |
| Strategy to hit benchmark | Filler words + colocated infra + streaming pipeline |

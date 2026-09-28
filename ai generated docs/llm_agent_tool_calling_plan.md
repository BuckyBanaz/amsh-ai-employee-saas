# LLM Agent + Tool Calling: Claude's Planning Doc

> Written 2026-09-28 by Claude, for Parikshit to read and approve.
> Canonical spec: `DOCS/16_AMSh_LLM_Agent_Tool_Calling_Architecture_Plan.md`
> Live change log: `DOCS/17_AMSh_Claude_Change_Tracker.md`
> **Status: PLAN ONLY. No engine code has been changed by Claude yet.** Gemini is still working on the NLU/state-machine files, so Claude only touches docs until told otherwise.

---

## 1. Problem in one paragraph (Hinglish)

Abhi system mein LLM sirf *label* lagata hai (persona / action / knowledge / out_of_scope / unclear) aur uske baad jawab `en.json` / `hi.json` ki fixed lines se aata hai. Isliye har naye sawaal ke liye naya regex + naya template likhna padta hai, aur AI "static" lagta hai. Ye kabhi khatam nahi hoga. Market ke top voice AI (Retell, Vapi, Bland) LLM ko **khud jawab banane** dete hain, aur sirf *actions* (booking, cancel) tools ke through hote hain jinhe backend validate karta hai.

## 2. Target architecture

```
Caller speech
   |  STT (Deepgram)
   v
[A] Pre-LLM safety gate      emergency keywords -> instant transfer (static, on purpose)
   |
   v
[B] LLM Agent (Groq)         system prompt = persona + business facts + rules
   |   thinks + writes the reply itself
   |   may call tools (function calling)
   |        check_availability | book_appointment | cancel_appointment
   |        reschedule_appointment | lookup_appointment | answer_faq
   |        transfer_call | send_sms | hangup
   v
[C] Tool Validator (Python)  the LLM only *asks*; this code *decides*
   |   required fields present? slot really free? caller confirmed? tenant-scoped?
   |   -> DB write, or a structured error the LLM can explain naturally
   v
LLM reads tool result -> final natural reply -> TTS (streamed sentence by sentence)
```

### What stays deterministic (never LLM-decided)
| Area | Why |
|---|---|
| Emergency / safety escalation | Healthcare liability |
| Booking writes (slot free, required fields, confirmation) | No fake or double bookings |
| Tenant isolation (`business_id` injected by code, never by LLM) | Multi-tenancy security |
| PII masking in logs | Compliance |
| Facts (hours, doctors, services, prices) | Come from DB/RAG into the prompt, never from model memory |

### What moves to the LLM
Persona questions ("naam kya hai", "robot ho?"), small talk, out-of-scope handling, corrections ("actually Thursday"), vague references ("woh wala"), Hinglish phrasing, tone. **No new regex or template is needed for any of these.**

## 3. What already exists (reuse, don't rebuild)

| Piece | Location | Note |
|---|---|---|
| Tool base + registry | `backend/ai/tools/framework/base.py`, `registry.py` | `BaseTool.to_openai_schema()` already emits the Groq/OpenAI function format |
| 6 tools registered | `backend/ai/tools/__init__.py` | transfer_call, hangup, send_sms, check_availability, book_appointment, answer_faq |
| Groq client | `backend/ai/llm/client.py` | model `openai/gpt-oss-20b`, persistent `httpx` client |
| Booking writes | `backend/ai/capabilities/operations/clinic/write_operations.py` | tool delegates here already |
| Safety guardrails | `backend/ai/engine/guardrails/safety.py` | keep as gate [A] |
| Agent name plumbing | `load_agent_settings` -> `business_info["agent_name"]` | Gemini added this; reuse for the prompt |

Missing tools to add: `cancel_appointment`, `reschedule_appointment`, `lookup_appointment`.

## 4. Phases

| # | Phase | Output | Risk |
|---|---|---|---|
| 0 | Stabilise current NLU (Gemini's work) | 6 known bugs fixed (see section 6) | low |
| 1 | **Eval suite first** | `backend/ai/evals/` with 100+ scenarios, pytest, mocked LLM + optional live mode | low |
| 2 | Agent core | `backend/ai/engine/agent/` : `prompt_builder.py`, `agent_loop.py` (max 3 tool rounds per turn) | medium |
| 3 | Tool validator + new tools | required-field checks, confirmation gate, idempotency key on booking | medium |
| 4 | Streaming + latency | stream tokens, cut at sentence end, send to TTS early, filler only when a tool is slow | medium |
| 5 | Rollout | flag `CONVERSATION_ENGINE = state_machine \| llm_agent`, shadow mode, then per-tenant switch | low |
| 6 | Retire old path | delete template-only branches once evals match or beat old engine | low |

**Why evals come before the refactor:** without them "working" just means "the script printed Working." The eval suite is what proves the new engine is better than the old one and stops regressions.

## 5. Design decisions (with trade-offs)

1. **Hybrid, not pure LLM.** Rule 3 in `.agents/rules` ("do not make the conversation manager purely LLM-based") stays true. The LLM converses; code guards actions.
2. **Booking confirmation is enforced in code.** `book_appointment` takes `caller_confirmed: bool`. The validator rejects it unless the previous assistant turn was a read-back of name, date, time, service and the caller then agreed. The LLM cannot skip this by itself.
3. **Business facts in the prompt, not in model memory.** Hours, doctors, services, address are injected per call from Postgres. Prompt rule: *"If a fact is not in the context, do not guess. Offer to connect staff."*
4. **Small prompt, cached prefix.** Static persona + rules first, per-call facts next, turn history last, so Groq prompt caching can help. Keep history to the last ~6 turns.
5. **Tool-round budget.** Max 3 LLM to tool round-trips per turn, then a graceful "let me connect you to the staff". Prevents loops and latency blowups.
6. **`business_id`, `call_id`, `caller_number` are injected by the runtime**, never taken from LLM arguments.
7. **Latency target:** first audio in < 800 ms for no-tool turns, < 1.5 s for tool turns.

### Trade-offs, stated plainly
- LLM replies can occasionally be worded oddly or wrong. Mitigation: facts-only-from-context rule, validator on writes, eval suite, shadow mode before switching.
- Tool turns cost one extra LLM round-trip. Mitigation: parallel tool calls where independent, filler phrase, streaming.
- `openai/gpt-oss-20b` tool-calling reliability on Groq must be **verified with the eval suite** before committing. If weak, fall back to a larger Groq model for tool turns only.

## 6. Known bugs in the current NLU (found in review, to hand to Gemini)

1. `nlu.py:332` knowledge check runs before booking check, so "Sunday ko doctor se appointment book karo" becomes FAQ, and the state machine returns before saving that turn's slots.
2. `nlu.py:56` out-of-scope regex has `helicopter`, `song`, `dance`, `movie`, `mars`, added to make the "Potato helicopter" test pass. It runs before the LLM and will reject real sentences.
3. `nlu.py:253` and `:315` use `"kal" in lower`, so a name like "Kalpana" sets the date to tomorrow. Needs `\bkal\b`.
4. `safety.py` identity-query bypass skips human-transfer rules, so "Are you human? I want a human" never transfers.
5. `state_machine.py` `confidence < 0.40` returns "repeat please" and drops any slots in that turn (e.g. a phone number).
6. `recent_turns` sent to NLU contains only caller lines, not bot lines, so references like "change that one" lack context.

Phase 2 makes items 1, 2, 5, 6 obsolete, since the LLM sees the full dialogue. They are still worth fixing if the old path stays live during rollout.

## 7. Open questions for Parikshit

1. Approve hybrid direction and pause template work on the old NLU path?
2. Keep `openai/gpt-oss-20b` as default and only upgrade on eval failure?
3. Should the agent speak as female or male? (Persona lines are gendered in Hindi, e.g. "sakti hoon"; should come from agent config.)
4. Which 3 languages matter first: English, Hindi, Hinglish?

## 8. What Claude will do, and when

Every action is logged in `DOCS/17_AMSh_Claude_Change_Tracker.md`.

---

## 9. Implementation report (2026-09-28): plan ka kya hua

**Ho gaya (default OFF, purane engine mein koi change nahi):** Phases 1-5. Code `backend/ai/engine/agent/` mein hai, evals `backend/ai/evals/` mein. Full details: `DOCS/16`.

**Kaise on karein:** env `CONVERSATION_ENGINE=shadow` (purana engine bolta hai, agent chupke se chalta hai aur log hota hai) ya `llm_agent`. Ek tenant ke liye: `Agent.config["engine"]`. LLM down ho toh us turn ke liye purana engine bol deta hai.

**Numbers (honest):**
- Purana engine (offline): **34/49 = 69%**
- Naya agent (live Groq), last fixes se *pehle*: **47/54 = 87%**
- Last fixes (agent ne bina bole poori booking bana di thi, dry-run transfer bug) unit tests se verify hue, **live dobara verify nahi hue** kyunki Groq ka daily quota khatam ho gaya.

**Sabse important seekh:** model `gpt-oss-20b` khud se cheezein bana leta hai (bina date/time bole booking read-back, bina tool ke slots offer karna, identity question pe transfer). Isliye prompt pe bharosa nahi kiya: code check karta hai ki naam/phone/date/time caller ne khud bole hain, aur reply mein koi time sirf tab bola jaye jab wo caller ya tool se aaya ho.

**UPDATE (naya Groq key ke baad, live results):** agent **58/59 (98%)**: persona 16/16, knowledge 7/7, smalltalk 5/5, safety 5/5, unclear 4/4, booking 7/7, correction 3/3, regression 5/5, out_of_scope 6/7. Purana engine 34/49 (69%). Dhyaan: ye ek clean run nahi hai, kai runs + fixes ke baad targeted re-runs se bana number hai; ek clean full re-run baaki hai. Ek fail: "India ka PM kaun hai?" (Hinglish) pe English mein "not sure, connect karun?" bolta hai. Tone: ab small talk (how are you, thanks) live 5/5 pass. Bina rate-limit ke latency: p50 ~0.9s, p90 ~3.1s (tool wale turns aur streaming live measure nahi hue).

**Blockers (tera decision):**
1. **Groq tier:** 8,000 tokens/minute aur 200,000 tokens/din. Ek agent call ~1.3k tokens => minute mein ~6 calls, din mein ~150. Asli calls ke liye paid tier ya dusra provider chahiye.
2. **Mere evals ne aaj ka pura daily quota use kar liya.** Jab tak reset nahi hota, is key pe har Groq call 429 dega (purana engine offline regex pe chalega).
3. **SMS bug (purana code):** booking ke baad confirmation SMS kabhi nahi jaata (`send_sms_sync` exist hi nahi karta). Fix karne se asli SMS jaane lagenge, isliye tere OK ke baad.

**Phase 6** (templates hatana) tab tak nahi jab tak live eval dobara green na ho aur shadow mode kuch din chal na le.

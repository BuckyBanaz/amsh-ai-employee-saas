# 16. AMSh LLM Agent + Tool Calling Architecture

**Status (2026-09-28):** Phases 1-5 implemented **behind a flag, default OFF**, and evaluated live on a fresh Groq key (section 6). Phase 6 (retire templates) not started. Not ready for live traffic: needs a paid LLM tier (section 7) and one clean full re-run (section 6 caveat).
**Supersedes (in part):** Doc 15 (5-way NLU categorisation). Doc 15 stays the live design for every tenant until this engine is switched on for them.
**Extended reading:** `ai generated docs/llm_agent_tool_calling_plan.md` · **Tracking:** `DOCS/17_AMSh_Claude_Change_Tracker.md`

---

## 1. Motivation

The legacy engine uses the LLM only to classify a turn, then answers from fixed locale templates (`backend/ai/locales/*.json`). Every new caller question needs a new regex or template. The agent engine lets the LLM write replies and call tools, while Python decides what actually happens.

## 2. Pipeline

```
STT -> [A] safety gate (no LLM) -> [B] LLM agent (prompt + tools) -> [C] toolbox/validator -> DB
                                          ^                              |
                                          +------- tool result ----------+
                       -> sentences streamed to TTS as they complete (barge-in aware)
```

## 3. What is implemented

| Phase | Status | Where |
|---|---|---|
| 1 Eval suite | Done, 54 scenarios | `backend/ai/evals/` (`runner.py`, `scenarios.py`, `engines.py`, `fixtures.py`) |
| 2 Agent core | Done | `backend/ai/engine/agent/` (`agent_loop.py`, `prompt_builder.py`, `llm_backend.py`, `facts.py`) |
| 3 Validator + tools | Done | `validator.py`, `availability.py`, `datetime_utils.py`, `grounding.py`, `toolbox.py` (8 tools) |
| 4 Streaming | Done, **not measured live** | `llm_backend.chat_stream`, `agent_loop.turn_events`, `runtime.run_turn` |
| 5 Rollout | Done | `runtime.py`, gateway hooks, `CONVERSATION_ENGINE` setting |
| 6 Retire templates | Not started | needs a green live eval first |

Tools: `check_availability`, `book_appointment`, `lookup_appointment`, `cancel_appointment`, `reschedule_appointment`, `search_knowledge`, `transfer_to_human`, `end_call`. Runtime injects `business_id`, `call_id`, caller number; the LLM never supplies them.

## 4. How to switch it on

| Mode | Behaviour |
|---|---|
| `state_machine` (default) | Legacy engine only. Nothing changes. |
| `shadow` | Legacy answers the caller. The agent runs silently on the same transcript in dry-run (no writes, no transfers) and logs `[SHADOW] {legacy, agent, tools, latency}`. **Doubles LLM token use.** |
| `llm_agent` | Agent answers. If the LLM is unavailable for a turn, that turn falls back to the legacy engine. |

Global: env `CONVERSATION_ENGINE`. Per tenant (wins over global): `Agent.config["engine"]`. Agent gender for Hindi grammar: `Agent.config["gender"]` (`female` / `male`, optional). The dashboard playground (`/api/voice/simulate`) previews `llm_agent`.

## 5. Guarantees enforced in code (not in the prompt)

1. Emergency and "I want a human" go through the deterministic safety gate before any LLM call.
2. **Booking read-back protocol:** `book_appointment(confirmed_by_caller=false)` stores a proposal; commit needs identical details, `confirmed_by_caller=true`, and a *later* caller turn. Same for cancel and reschedule.
3. **Caller-said grounding:** patient name, phone, date and time in a booking must trace back to something the caller said (or their calling number). A model that fills blanks with a guessed slot is refused with `not_from_caller`.
4. **Time grounding:** a reply may only mention a clock time that came from the caller, a tool result, or the clinic hours. An invented time is blocked *before it is spoken*; the model is corrected once, then a safe line is used.
5. **Transfer guard:** non-emergency transfer needs an explicit request ("connect me to a person") or a caller yes. Identity questions ("are you a robot?") never end the call.
6. **Real availability:** working hours minus existing confirmed appointments (per doctor). If hours were never configured the agent may not invent any.
7. Dates and times are parsed to exact values (`2026-09-29`, `10:00 AM`), never stored as "tomorrow"; past dates/times, closed days, out-of-hours, unknown doctors/services are rejected.
8. Idempotent booking (no duplicate on a repeated confirm); cancel/reschedule only for appointments returned by a lookup on that phone; lookup returns no extra PII.
9. Max 3 tool rounds per turn, then a forced tool-free answer. LLM outage never crashes a call.

## 6. Measured results

Live runs on `openai/gpt-oss-20b` (Groq). The suite has 59 scenarios (49 shared + 5 agent-only + 5 small-talk).

| Engine | Mode | Score |
|---|---|---|
| Legacy | offline regex fallback (49 shared scenarios) | **34/49 (69%)** |
| LLM agent | live, before the guard fixes (first full run, 54 scenarios) | 47/54 (87%) |
| LLM agent | live, latest code, assembled from three runs + targeted re-runs (59 scenarios) | **58/59 (98%)** with the strict out-of-scope check |

**Caveat, read this:** the 58/59 is *not* one clean run. It is: run A (29 scenarios), run B (30 scenarios), then re-runs of the scenarios that failed, after code/prompt fixes. Scenarios that passed in A/B were not re-run after later fixes (day grounding, one-question rule, out-of-scope prompt). A clean full re-run is still needed. Legacy and agent are also not like-for-like (offline vs live). The eval is small and I edited eval expectations along the way where they were clearly wrong (each change is intent-based and noted in `scenarios.py`); one prompt example I added leaked an eval phrase and was replaced.

Agent by category (latest): persona 16/16, knowledge 7/7, smalltalk 5/5, safety 5/5, unclear 4/4, booking 7/7, correction 3/3, regression 5/5, out_of_scope 6/7. The one open failure is `oos_hi_pm_kaun` ("India ka PM kaun hai?"): the model answers in English "I'm not sure... I can connect you to the front desk" instead of redirecting to the clinic in Hinglish.

**Bugs found by the live runs and fixed in code (all unit-tested):**
1. Model invented a whole booking (date, time, service) after only a name -> caller-said grounding for name/phone/date/time.
2. Model picked a day itself and announced "closed on Sunday" -> same grounding for `check_availability` and reschedule; a caller "yes" accepts the day/time we proposed.
3. Invented slots offered on a bare "hmm" -> time grounding guard.
4. Doubled replies ("What service?Sure thing! Which service?") -> glued sentences split, only the last question is spoken.
5. Offered transfer counted as a transfer in dry-run -> fixed.
6. My warm-tone prompt made it tell jokes / offer transfers for trivia (conflicting rules) -> prompt fixed.

**Measured on the new key (5-8 unthrottled calls):** turn latency p50 about 0.9 s, p90 about 3.1 s, no tool calls in those turns. Streaming latency and tool-turn latency are not measured live.

## 7. Risks and known limits

| Item | Detail |
|---|---|
| **Groq tier limits** | On-demand tier for `gpt-oss-20b`: **8,000 tokens/minute** (confirmed again on the new key; the old key also had a 200,000 tokens/day cap). One agent call is now **~1.6k prompt tokens** (system prompt ~920 + tools ~840 + history), so about **5 calls/minute** for the whole organisation. This is not viable for real call traffic; a paid tier (or another provider) is required before `llm_agent` or `shadow` is used on live calls. |
| Latency | Single unthrottled calls measured 0.6-0.95 s. Eval p50 (~10 s) is dominated by rate-limit waits and is meaningless. Streaming path is unit-tested but has no live latency figure. |
| Model behaviour | `gpt-oss-20b` at low reasoning invents details and over-transfers; code guards catch the known cases, but the eval is small (54 scenarios) and a passing score is not proof. |
| Barge-in | Remaining sentences are dropped, but the model turn still finishes and is stored in history as fully said. |
| Confirmation SMS | Bug fixed 2026-09-28 (`send_sms_sync` added, background worker, `AMSH_DISABLE_SMS=1` kill-switch). **Real SMS now go out after voice bookings.** The agent is still told not to promise an SMS. |
| Tools shared with legacy | Legacy `check_availability` tool returns hard-coded slots; the agent uses its own real availability instead. |

## 8. Defects found in existing code (not fixed, need a decision)

1. ~~Booking confirmation SMS never sends~~ **Fixed** (see section 7). `send_sms_sync` now exists; `SendSmsTool`'s invalid `ToolResult(error=...)` fixed. Remaining: `SendSmsTool` still reports "sent" when no provider is configured (pre-existing).
2. **Pre-existing import cycle** `llm.client -> conversation -> state_machine -> tools -> answer_faq -> llm.client`. Worked around in `agent/__init__.py`.
3. **Groq daily quota was exhausted on 2026-09-28** by the live eval runs (see tracker). It rolls over within 24 h.

## 9. Go / no-go for enabling on a tenant

1. Paid Groq tier or another provider with enough TPM/TPD.
2. Live eval re-run after the grounding fix: at least the legacy score in every category, zero failures in `safety` and `regression`.
3. `shadow` for a few days, review `[SHADOW]` logs.
4. Then `llm_agent` for one tenant via `Agent.config["engine"]`.

## 10. Open questions

1. Provider/tier decision (section 7).
2. Should `Agent.config["gender"]` be exposed in the dashboard?
3. Fix the SMS bug now (real SMS will be sent)?

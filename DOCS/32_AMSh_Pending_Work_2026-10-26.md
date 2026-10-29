# 32. Pending work: status on 2026-10-26 (branch `version-0.5`)

What is still open after the voice-latency pass (branch `version-0.4`, commit `0b89a05`), the F5 billing fix (phase 1, uncommitted
on `version-0.5`), the live-call review of 2026-10-26 and the capacity audit. Earlier list: `28_AMSh_Pending_Status_2026-10-05.md`.
What was done: tracker entries 125 to 127 in `17_AMSh_Claude_Change_Tracker.md`.

Evidence today: offline suite **757 tests, 5 failures** (the same 5 as before this work, listed in section F), API smoke **54/54**.
Nothing below has been tried on a live phone call unless it says so.

## A. Billing (F5: trials and paid plans never expired)

Phase 1 is done (entry 126): stored end dates, a 3-day grace period, calls refused after it. Still open:

| # | Item | Notes |
|---|---|---|
| A1 | **Razorpay auto-recurring subscriptions** (phase 2, the owner's choice) | Create a subscription per plan and cycle, Checkout with `subscription_id`, a webhook (raw-body signature with its own secret) that moves `current_period_end` on every charge and handles halted / cancelled. Needs from the owner: Subscriptions enabled on the Razorpay account, whether it accepts USD, a webhook secret, a public webhook URL, and a go-ahead before plans are created in the merchant account. Read Razorpay's current docs first. The new webhook route must be added to the reviewed list in `test_security` |
| A2 | **Payment currency bug (money)** | When Razorpay refuses a USD order, `create_order` silently makes an INR order at a fixed ×85; `verify` then refuses the payment for a currency mismatch: **the customer is charged and the plan is not activated**. Fix before A1 |
| A3 | Expiry and grace **email** to the owner | Not built. Needs a sent-marker so a notice is never sent twice |
| A4 | Billing page **banner** for grace / expired | The API returns `access`, `days_left`, `grace_ends_at`, `expires_at`; the page does not show them yet |
| A5 | Run migration `0016` on the real Postgres | Runs by itself at the next API start. Read-only preview on 2026-10-26: Demo clinic -> `manual` (no end), Mayo Clinic - Rochester -> `monthly` (a month from that day, then 3 days grace) |
| A6 | Decisions made in phase 1 that the owner may change | Paying during a trial starts the paid period at once (remaining trial days are lost); staff turning on a clinic with no payment makes it `manual` (never ends); WhatsApp is not gated on expiry; `pending` clinics still answer calls |
| A7 | Plan limits not enforced | Trial limits (50 minutes, 100 messages) are never applied; `ENFORCE_VOICE_QUOTA` is off by default; the `concurrent_calls` quota is shown in pricing but enforced nowhere |
| A8 | Billing page sample numbers | Usage falls back to made-up values (14.5 minutes, 8 calls) when data is missing |

## B. Live call of 2026-10-26 12:22 IST (call `0c3bd206`, Demo clinic, Hindi): not fixed

Server logs of this call were lost when the containers were recreated at 12:31; findings come from the database and the code.

| # | Issue | What is known |
|---|---|---|
| B1 | **"Maaf kijiye, mujhe abhi thodi dikkat aa rahi hai…" said 4 times** (after the caller gave their name, and on "are you still there?", "hello", "use my number") | Not an LLM outage: this is the line for a model reply that had no speakable text (`agent_loop.py` fallback). One turn had a confirmed empty model output. Every turn hopped between Groq models (`gpt-oss-20b` -> `gpt-oss-120b` -> `qwen`), which happens when a model fails or is rate limited. **Cause not confirmed.** Next: log why a reply came out empty (provider, empty output, or which filter dropped it); then replay the call in the sandbox or make a new call and save `docker compose logs api` before recreating the container |
| B2 | Read the phone number back wrong: "+91 918901414107" | The stored number is right. The model gets the raw number in the prompt and added "+91" again. A confirmation must not rely on the model formatting a number: give it a spoken form from code |
| B3 | Forgot the agreed time and answered in English at the end ("What time on 26 October…") | After the degraded SMS turn |
| B4 | No booking was made | No appointment row for the call |
| B5 | Asked for the full name though it greeted the caller by name | |
| B6 | STT mishearing: a line came out as Spanish, the name as "अरबित" | English+Hindi mixed model (`multi`) |
| B7 | "आप कैसी हैं" to a male caller | Gender assumed |
| B8 | A degraded turn saves the fallback line to history while the caller heard the hold line | Small history mismatch |
| B9 | Demo clinic data | Services priced in INR, the business currency is USD (the AI said "50 रुपये", which matches the data) |

## C. Voice latency and interruption (branch `version-0.4`, commit `0b89a05`): still open

| # | Item | Notes |
|---|---|---|
| C1 | **Live benchmark: 5 to 10 controlled Twilio calls** (owner places them) | Scenarios: normal booking x3, talking over the recording notice, interrupting the greeting, barge-in while the reply is generated, barge-in during playback then "yes", hang-up during playback. Plan and pass criteria: `07_AMSh_Latency_Optimization_Strategy.md` section 7. No latency improvement is claimed until this is measured |
| C2 | Call-log transcript after a playback interruption | The agent's history keeps only what was heard; the stored call log (`messages` rows) still has the full reply |
| C3 | "Heard" is an estimate | The sentence playing when the caller interrupted counts as heard, even if only part of it played |
| C4 | Deepgram Flux | Evaluated, not adopted: different endpoint and events, 80 ms chunks vs Twilio's 20 ms, Hindi not confirmed |
| C5 | English clinics use Deepgram's English+Hindi mixed model | May hurt accuracy for UK / US callers; not changed |
| C6 | Laughter-scorer cost on the reply path | Not measured (its runtime is only in Docker) |

## D. Privacy in logs: still open

Done (entry 125): transcripts, replies, the greeting text, slot values, caller numbers, audio and stream tokens no longer reach the
call logs; the emergency log and the shadow log carry no words; SMS and booking logs carry no body or patient name.

| # | Item |
|---|---|
| D1 | `clinic/write_operations.py` logs the raw database error, which can include the patient fields being saved (fix: hide SQL parameters) |
| D2 | `email_service.py` dev-mode log prints the whole email body |
| D3 | Provider error bodies are logged as-is (`plivo/client.py`, `send_sms.py`) and can echo phone numbers |
| D4 | The phone mask still shows the country code plus 6 digits |
| D5 | The SMS tool tells the caller "I have sent a confirmation text" even when SMS is off or failed |
| D6 | `crypto.py` has a hard-coded fallback encryption key |
| D7 | `backup_before_0015.sql` (untracked, repo root) is a database dump that likely holds patient data: **never commit it** |

## E. Capacity (audit 2026-10-26): nothing measured

| # | Item | Notes |
|---|---|---|
| E1 | No load test exists | `27_...` says one 2-core container handles 50 to 100 calls; this was never measured. The landing page claims "50+ parallel" |
| E2 | Information needed to estimate | Host vCPU / RAM / region, replicas, proxy WebSocket limits, Postgres `max_connections`; provider plan limits (Twilio, Deepgram concurrent streams, Cartesia concurrency, Groq and Gemini per-model limits); real average call length and tokens per call (`calls.duration_seconds`, `usage_events`) |
| E3 | Staged load test | 0: synthetic calls with stubbed providers (no cost; needs a harness that does not exist yet). 1: recorded audio with real providers at 1 / 2 / 5 / 10. 2: real Twilio calls 1 / 2 / 3 / 5. 3: 30-60 minute soak at 70% of the lowest limit |
| E4 | First likely limits (estimates) | Shared LLM rate limits (one platform key; a rate-limited model is paused for every clinic); one Python process for all audio; a small shared thread pool and a single locked laughter scorer before every reply; one shared Cartesia connection; Deepgram concurrent streams; a 15-connection database pool |
| E5 | Cannot scale out as is | Live calls, the rate limiter, LLM cooldowns and the TTS cache live in one process's memory; the reminder loop would run once per worker |

## F. Tests and code health

| # | Item |
|---|---|
| F1 | 5 failing offline tests (failing before this work too): `test_resolve_mode_prefers_tenant_and_defaults_to_legacy` and `test_llm_outage_hands_the_turn_back_to_the_state_machine` (out of date), `test_assignments_are_audited_and_removable`, `test_call_me_validates_the_number_uses_own_business_and_is_limited`, `test_only_reviewed_routes_are_open` |
| F2 | `GET /api/telephony/available-numbers` has no login (this is what `test_only_reviewed_routes_are_open` reports) |
| F3 | On Windows outside Docker, emoji `print`s crash the tests unless `PYTHONUTF8=1` is set |

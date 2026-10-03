# Amsh: System audit, 2026-10-03

> Method: auth scan of every route, git branch comparison, config and `.env` checks, database and log reads, tests, reading the
> code paths involved. Items marked "suspect" were not proven. Nothing here was measured on a real phone call.

## 1. What works (checked)
- Backend and Docker boot; `GET /api/languages` answers.
- WhatsApp end to end on the Meta test number: booking and reschedule (the DB row changed to the new time).
- Billing: secure payment verification, auth, upgrades not free, trial once, invoices from real payments (16 tests).
- Booking channel shown per appointment (Phone / WhatsApp / Dashboard) and real counts in the sources chart.
- Offline tests: 328 run (`test_agent_core` + `test_voice_latency`), 1 old failure (prompt length 7.7k vs 6500).
- Branch `v1.1` (voice latency + barge-in) is now merged into `v1.5`.

Never tested for real: a phone call (latency, barge-in, Hindi), any non-English language live, Arabic audio, the admin app.

## 2. Problems, by priority

### P0 security
| # | Problem | Where |
|---|---|---|
| 1 | No Twilio / Exotel signature check on the telephony webhooks | `routes/voice.py` (`/incoming`, `/status`, `/recording-status`, `/transfer-status`), Exotel routes |
| 2 | `POST /api/voice/call-me` (real outbound call) and `/preview`, `/transcribe`, `/voices`, `/llm-models` need no login: credit abuse | `routes/voice.py` |
| 3 | Dev defaults: `DEBUG=True`, `ALLOW_DEV_FALLBACKS=True`, `.env` has `DEBUG=true`, compose mounts code and reloads, DB password `amsh/amsh`, ngrok in the same compose | `common/config.py`, `docker-compose.yml` |
| 4 | Meta App Secret was pasted in a chat (rotate); GitHub reported 14 dependency vulnerabilities (6 critical), not reviewed | Meta app, dependencies |
| 5 | PII redaction only in shadow logs; transcripts and recordings stored plain; no retention or consent controls | `agent/runtime.py`, call recorder |

### P1 correctness and product
| # | Problem |
|---|---|
| 6 | Latency work lived only on `v1.1`: now merged, still **unmeasured** on a real call |
| 7 | Two engines. Code default is `state_machine` (legacy, 1,182 lines); only `.env CONVERSATION_ENGINE=llm_agent` turns the agent on. A deploy without it runs the old engine and none of the recent agent work applies to voice (WhatsApp always uses the agent) |
| 8 | Dashboard showed stale data (loaded once). **Fixed 2026-10-03**: `useAutoRefresh` on the appointments page, the dashboard table and stats |
| 9 | Dashboard still invents numbers when data is thin (100 calls, "% from yesterday", hourly volume, performance ring), mixes demo rows (Emily Carter...) into "Today's Appointments", falls back to "Dr. Sarah Wilson" |
| 10 | Appointments live in the generic `transactions` JSON: `get_appointments` loads all of a business's rows and filters in Python; no patient entity (derived from the phone); doctor is the placeholder "Duty Doctor" (no `doctor_id`) |
| 11 | Frontend: 18 hardcoded `http://localhost:8010` in 8 files; 20 TypeScript errors in the user app (admin: 0); India timezone / currency / country defaults and different timezone and country lists in onboarding and settings; accent choice overwrites the primary language; accent lists duplicated in three components |
| 12 | Providers: Groq 429 on the on-demand tier, Gemini transport errors, Exotel out of balance, Twilio account inactive (all confirmation SMS fail), Qdrant down, Cartesia credits |
| 13 | Base prompt about 7.7k characters, grows with every feature, carries clinic and Hinglish text for every tenant |
| 14 | Tests: one 4.5k-line file, no `backend/tests`, no CI, live LLM evals never run |

## 3. Not needed or not used
| Item | Note |
|---|---|
| `backend/ai/rag/` (5 lines), `backend/ai/knowledge/` (empty) | nothing imports them; knowledge search is the local index |
| `services/whatsapp-gateway`, `scratch/`, `fix/`, `login.md`, `issue.md`, `amsh-page-images/`, `ai generated docs/`, `verifications_docs/` | repo-root clutter; move to `DOCS` or archive |
| `ai/engine/conversation/*` (legacy engine) | retire after the agent is the default and a real call passes |
| `ai/tools/vertical/*`, `capabilities/skills/*` | used by the legacy path or by two files only; verify then remove |
| ngrok, `--reload`, DB credentials in compose | development only |

## 4. Recommended order
1. Real phone call test of the merged latency and barge-in work (also confirms the language and guard work on voice).
2. Lock down voice and telephony endpoints (signatures; auth or rate limits on `call-me`, `preview`, `transcribe`).
3. Production config: DEBUG off, dev fallbacks off, no reload, an API base URL variable for the frontends, rotate secrets.
4. Make `llm_agent` the default engine; retire the legacy one.
5. A real `appointments` table (date, time, doctor_id, patient_id) and a patient entity; slot queries in SQL.
6. Remove invented numbers and demo rows from the dashboard.
7. Tests and CI: split the test file, API tests, a pipeline running unittest and `tsc`.
8. Frontend cleanup: one shared list of languages, accents, timezones and countries from the backend; drop India defaults; fix the 20 TypeScript errors.
9. Provider health: Groq paid tier, Exotel and Twilio, Qdrant or remove it, a health page.
10. Prompt diet: move clinic and Hinglish text into the vertical YAML and the language packs.

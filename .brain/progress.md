# Amsh: Progress (2026-10-02)

Old day-by-day history: `archive_progress_history.md`. Plan: `DOCS/18_AMSh_Completion_Plan_User_and_Admin.md`. Change log: `DOCS/17_...`.
Architecture and status: `DOCS/README.md`. Latency work: `DOCS/07_AMSh_Latency_Optimization_Strategy.md` section 6 (branch `v1.1`).

## Overall: about 56% (estimate)

| Part | Done | Pending |
|---|---|---|
| User frontend | **~80%** | ~20% |
| Admin frontend | **~23%** | ~77% |
| AI / voice | **~55%** | ~45% |
| Server | **~66%** | ~34% |
| **Overall (equal weight)** | **~56%** | ~44% |

Method: each part is a checklist of items (pages or capabilities), equal weight; done = 1, partial = 0.4 to 0.9, pending = 0.
These are estimates, not measurements. Almost nothing has been checked by a person in a real browser or on a real phone call:
the evidence is unit tests (`backend/ai/evals/test_agent_core.py` 250/256, same 6 known failures: 5 BillingSecurity + 1 prompt length;
`test_voice_latency.py` 31/31) plus some live API and database checks.

## Changes since the 2026-09-28 version

- **2026-09-30:** user billing page is real (current plan, usage, plans catalog, invoices, Razorpay upgrade with proration, 14-day
  free trial, admin trial promotion manager); admin vs tenant integrations split (admin `/integrations` page is real, user
  `IntegrationsGrid` has connect / disconnect modals); call inspection panel redesigned and calls page layout bug fixed; shimmer
  skeleton loaders everywhere; multi-region compliance resolver (`ai/verticals/compliance.py`).
- **2026-10-01 (branch `v1.1`):** voice latency pass (provider keep-alive 120 s, warm-ups at call start, early first-clause TTS,
  parallel availability checks, per-turn `[LATENCY]` log, `GROQ_MODEL` setting, simulated benchmark) and barge-in fixed for the whole
  playback. Done in code and tests, **not measured on a live call**.
- **2026-10-03:** slot rules fixed (pending bookings and "Duty Doctor" bookings now block slots; rules in one file under
  `operations/clinic`); Hindi/Hinglish conversation layer with a regional policy (India only, English untouched), per `issue.md`
  (`DOCS/21`); one `BusinessContext` (vertical + region + language + timezone + emergency numbers) now drives the engine and three
  hardcoded India values are gone; a booking guard makes "change my appointment" reschedule instead of creating a duplicate. Offline tests only, not tried on a real chat.
- **2026-10-02:** WhatsApp connected end to end (Meta subscription, real App Secret); returning-patient memory + privacy rule + chat
  lookup guard (`DOCS/20`); every booking now has a channel (phone / WhatsApp / website chat / email / social / front desk /
  dashboard) and the dashboard shows it (`DOCS/20` 3b); WhatsApp chat wording fixed; WhatsApp bookings skip the SMS; zero-width-space reply glitch cleaned; logo upload bug fixed (files were saved outside the `/static` mount, so the sidebar and settings logo gave 404);
  Cartesia TTS and warm-up changes pushed to `v1.0`; summit pitch doc `DOCS/19_AMSh_Summit_Pitch.md`.

## User frontend (~80%, Antigravity works here)
Done: login / register / forgot / reset / verify-email, dashboard, AI Studio and playground, calls (with new inspection panel),
appointments, doctors, knowledge, patients, services, onboarding (business, hours, services, staff, knowledge, AI, checkout,
success), Automations settings tab, **billing page (plan and usage real, invoices and card are fake placeholders, see Security),
integrations page, shimmer loaders**.
Pending: dashboard still shows invented numbers when data is thin (100 calls, % from yesterday, hourly call volume, performance ring),
onboarding plans / review / Twilio step, accept-invite page not wired, patients edit / delete,
conversations / analytics / notifications / team / settings polish (in progress), landing-page false claims,
`tsc` errors (Conversations types, AI defaults settings, duplicate `getBusinessInfo`). Re-check the logo fix in a browser.

## Admin frontend (~23%, Claude)
Done (real data): login + guard, dashboard, businesses list, business detail (9 tabs), billing / plan catalog and trial config,
**integrations**. 6 of 26 pages.
Pending: 20 mock pages (business-users, admin-users, appointments, calls, conversations, customers, services, receptionists, usage,
analytics, health, security, audit, tickets, announcements, verticals and their details); `/notifications` and
`/settings` have no page. Design itself is finished.

## AI / voice (~55%, Claude)
Done: tool-calling agent with guards, booking / cancel / reschedule, Groq + Gemini chain, Hindi / Hinglish and gender fixes,
emotion and laughter, natural fillers, Cartesia voice, Deepgram STT relay, barge-in in the browser, call recording, post-call
analysis, WhatsApp chat agent, reminders / missed-call / staff alerts, safety rules, **latency instrumentation and keep-alive
fixes, early-clause TTS, barge-in during playback, compliance resolver by region, WhatsApp live on the Meta test number, returning-patient
memory (name and latest bookings from the clinic's own records) and a privacy rule so the agent never sees other patients' or business data**.
Pending: **real phone-call test (also the only way to confirm the latency and barge-in changes; live calls were 3-4 s before)**,
Deepgram in the playgrounds, outbound calls, regional languages beyond Hindi/Hinglish, live human take-over (UI
exists, backend not confirmed), agent versions, RAG (Qdrant is down), cost metrics, retiring the old engine, listening tests.
Open question: whether to switch `GROQ_MODEL` to `llama-3.3-70b-versatile` (removes reasoning delay; tool calling must be re-checked first).
Known small issue: after a barge-in the full reply, including unspoken sentences, is still saved to history.

## Server (~66%, Claude, except analytics / notifications / billing by Antigravity)
Done: auth and hardening, businesses / onboarding CRUD, calls + recordings + analysis, Alembic migrations, audit log, admin auth /
tenants / tenant data / plans / overview, secure Razorpay order and verify, **billing status with real usage, invoices,
change-plan, start-trial, trial config, admin integrations API, tenant integrations API**.
Pending: **auth on the new billing endpoints (see Security)**, payment records stored in the database, plan quota enforcement,
remaining admin APIs (users, cross-tenant lists, usage, tickets, announcements, audit / security read, verticals), customer edit /
delete, team management beyond create / list, Twilio and Exotel signature checks, CI and `backend/tests`, blocking a suspended
clinic's dashboard login.

## Security (fix before any real pilot)
In `backend/server/api/routes/billing.py` these have **no authentication**: `GET /businesses/{id}`, `GET /businesses/{id}/invoices`,
`POST /businesses/{id}/change-plan`, `POST /businesses/{id}/start-trial`, and `POST` / `PUT /trial-config` (anyone could change the
global trial settings). `change_business_plan` is also defined twice in the file (lines ~386 and ~490).
**Invoices and the card are fake:** `get_business_invoices` returns three hardcoded invoices (Jul / Aug / Sep 2026, "Visa ending in
4242") for every business, and the billing status card also shows a fixed Visa 4242. Only the usage numbers and plan come from the
database. Do not show the invoice list or card to a real clinic until payments are stored and read from the database.

## Owner actions
Rotate the Meta App Secret (it was pasted in a chat on 2026-10-02) and re-create the api container; add a real clinic (not "Demo clinic") on WhatsApp.
Groq paid tier, Cartesia credits, keys in `.env` (`META_APP_SECRET`, `RESEND_API_KEY`), rotate keys once printed, delete 8 empty
"Demo clinic" businesses, restart the backend and re-test logo upload, click through everything in a browser and on a real call.

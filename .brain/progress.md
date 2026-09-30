# Amsh: Progress (2026-09-28)

Old day-by-day history: `archive_progress_history.md`. Plan: `DOCS/18_AMSh_Completion_Plan_User_and_Admin.md`. Change log: `DOCS/17_...`.
Architecture and status: `DOCS/README.md`.

## Overall: about 51% (estimate)

| Part | Done | Pending |
|---|---|---|
| User frontend | **~73%** | ~27% |
| Admin frontend | **~19%** | ~81% |
| AI / voice | **~50%** | ~50% |
| Server | **~61%** | ~39% |
| **Overall (equal weight)** | **~51%** | ~49% |

Method: each part is a checklist of items (pages or capabilities), equal weight; done = 1, partial = 0.4 to 0.9, pending = 0.
These are estimates, not measurements. Almost nothing has been checked by a person in a real browser or on a real phone call:
the evidence is unit tests (256 in `backend/ai/evals/test_agent_core.py`) plus some live API and database checks.

## User frontend (~73%, Antigravity works here)
Done: login / register / forgot / reset / verify-email, dashboard, AI Studio and playground, calls, appointments, doctors, knowledge,
patients, services, onboarding (business, hours, services, staff, knowledge, AI, checkout, success), Automations settings tab.
Pending: billing page (static), integrations page (static), onboarding plans / review / Twilio step, accept-invite page not wired,
patients edit / delete, conversations / analytics / notifications / team / settings polish (in progress), landing-page false claims,
`tsc` errors (Conversations types, AI defaults settings, duplicate `getBusinessInfo`).

## Admin frontend (~19%, Claude)
Done (real data): login + guard, dashboard, businesses list, business detail (9 tabs), billing / plan catalog. 5 of 26 pages.
Pending: 21 mock pages (business-users, admin-users, appointments, calls, conversations, customers, services, receptionists, usage,
analytics, health, integrations, security, audit, tickets, announcements, verticals and their details); `/notifications` and
`/settings` have no page. Design itself is finished.

## AI / voice (~50%, Claude)
Done: tool-calling agent with guards, booking / cancel / reschedule, Groq + Gemini chain, Hindi / Hinglish and gender fixes,
emotion and laughter, natural fillers, Cartesia voice, Deepgram STT relay, barge-in in the browser, call recording, post-call
analysis, WhatsApp chat agent, reminders / missed-call / staff alerts, safety rules.
Pending: real phone-call test, Deepgram in the playgrounds, interrupt tuning, outbound calls, returning-patient recognition,
regional languages, live human take-over, compliance basics, agent versions, RAG (Qdrant is down), latency / cost metrics,
retiring the old engine, listening tests.

## Server (~61%, Claude, except analytics / notifications by Antigravity)
Done: auth and hardening, businesses / onboarding CRUD, calls + recordings + analysis, Alembic migrations, audit log, admin auth /
tenants / tenant data / plans / overview, secure Razorpay order and verify.
Pending: payment and invoice records, plan quota enforcement, remaining admin APIs (users, cross-tenant lists, usage, tickets,
announcements, audit / security read, verticals), customer edit / delete, team management beyond create / list, Twilio and
Exotel signature checks, CI and `backend/tests`, blocking a suspended clinic's dashboard login, `GET /api/billing/businesses/{id}`
is unauthenticated.

## Owner actions
Groq paid tier, Cartesia credits, keys in `.env` (`META_APP_SECRET`, `RESEND_API_KEY`), rotate keys once printed, delete 8 empty
"Demo clinic" businesses, click through everything in a browser and on a real call.

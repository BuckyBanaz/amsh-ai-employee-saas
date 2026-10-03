# Amsh: Progress (2026-10-03, branch `complete`)

Old day-by-day history: `archive_progress_history.md`. Plan: `DOCS/18_AMSh_Completion_Plan_User_and_Admin.md`. Change log: `DOCS/17_...`.
Architecture and status: `DOCS/README.md`. Latency work: `DOCS/07_AMSh_Latency_Optimization_Strategy.md` section 6 (branch `v1.1`).

## Overall: about 84% (estimate, branch `complete`)

| Part | Done | Pending |
|---|---|---|
| User frontend | **~90%** | ~10% |
| Admin frontend | **~95%** | ~5% |
| AI / voice | **~62%** | ~38% |
| Server | **~88%** | ~12% |
| **Overall (equal weight)** | **~84%** | ~16% |

Method: each part is a checklist of items (pages or capabilities), equal weight; done = 1, partial = 0.4 to 0.9, pending = 0.
These are estimates, not measurements. Almost nothing has been checked by a person in a real browser or on a real phone call:
the evidence is 451 offline tests (all green: `backend/ai/evals/*`), both apps type-check, lint (0 errors) and build, a 35-check API smoke on the real app and an 18-check browser
test of both apps (`testing/`, report in `testing/REPORT.md`). The earlier "~72%" did not match this table's own average (about 82%); the figures above are the average of the four parts. Owner-only items: `DOCS/26_AMSh_Owner_Actions.md`.

## Branch `complete` (2026-10-03): see `DOCS/17_...` rows 64 to 76

Security hardening, message templates with real sending, admin SEO / audit / security / staff / tickets / announcements / verticals, real dashboard numbers, quotas,
suspended-clinic block, frontend cleanup (zero TypeScript errors), CI, competitor analysis (`DOCS/25`).
Latest: **playground test mode** (the AI works on a throwaway ledger; nothing is saved, sent or transferred) in the clinic's playgrounds and a new admin **Playground** for any clinic; admin **Alerts**
(signups, sign-ins, trials, trial-to-plan, plan changes, suspensions, tickets, security; unread badge, muting); admin **Usage & Limits** rebuilt on real data (spend per tool, clinic and day,
revenue, profit, margin, trial and testing burn, plans near limits, editable rate card; LLM tokens metered per clinic); `testing/` folder with smoke, browser test and report.

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
- **2026-10-03 (merge):** branch `v1.1` (voice latency + barge-in) merged into `v1.5`; 328 offline tests (1 old failure). A real phone call is still the
  only way to confirm the latency and barge-in changes.
- **2026-10-03 (later):** five independent dimensions (vertical, language, accent, region from country, timezone) with a RUNTIME CONTEXT
  in the prompt; language packs for en / hi / es / fr / de / nl / ar (native fillers, fixed lines, TTS/STT, RTL flag) and a generic path for any
  other language; `GET /api/languages` for the dashboard; billing hardened (secure verify restored, auth, no free upgrades, real invoices).
  `DOCS/22`. Offline tests only.
- **2026-10-03 (evening, admin portal):** 11 of 25 admin pages now read real data (was 6): Integrations (credentials saved encrypted in the portal,
  fast list, real brand icons), platform email (SMTP) setup, Health, Settings, Notifications, Analytics (database-driven, design-image layout, animated
  charts, "Sample data" toggle), Receptionists, Appointments, Conversations (original designs kept, only the data source swapped). `GET /api/admin/calls`
  no longer seeds fake calls, needs a platform admin, and no longer invents fallback numbers. Checked in the container and with `tsc`; **not clicked
  through in a browser by a person**. Tracker entries 29 to 34 in `DOCS/17`.
- **2026-10-02:** WhatsApp connected end to end (Meta subscription, real App Secret); returning-patient memory + privacy rule + chat
  lookup guard (`DOCS/20`); every booking now has a channel (phone / WhatsApp / website chat / email / social / front desk /
  dashboard) and the dashboard shows it (`DOCS/20` 3b); WhatsApp chat wording fixed; WhatsApp bookings skip the SMS; zero-width-space reply glitch cleaned; logo upload bug fixed (files were saved outside the `/static` mount, so the sidebar and settings logo gave 404);
  Cartesia TTS and warm-up changes pushed to `v1.0`; summit pitch doc `DOCS/19_AMSh_Summit_Pitch.md`.

## User frontend (~90%, Antigravity works here)
Done: login / register / forgot / reset / verify-email, dashboard, AI Studio and playground, calls (with new inspection panel),
appointments, doctors, knowledge, patients, services, onboarding (business, hours, services, staff, knowledge, AI, checkout,
success), Automations settings tab, **billing page (plan and usage real, invoices and card are fake placeholders, see Security),
integrations page, shimmer loaders**.
Pending: onboarding plans / review / Twilio step, accept-invite page not wired, patients edit / delete,
conversations / analytics / notifications / team / settings polish (in progress), landing-page false claims, a plan-usage card in the clinic dashboard,
the playground's "Live engine verification" panel still shows fixed claims (PostgreSQL, Groq NLU, <200ms). Re-check the logo fix in a browser.

## Admin frontend (~95%, Claude)
Done (real data): login + guard, dashboard, businesses list and detail, billing / plan catalog and trial config, integrations (credential editing, SMTP), health, settings,
analytics, receptionists, appointments, conversations, **audit, security, admin users, tickets (+ detail), announcements, verticals, SEO, message templates, playground,
alerts (notifications page), usage & limits (spend and profit)**.
Pending: business-users (+ detail) and customers are still sample or per-clinic only (no cross-clinic customers API), services, and the detail pages of appointments / conversations.
Not checked: mobile layouts of the new pages (desktop screenshots only), a person's click-through. Analytics revenue now follows recorded payments.

## AI / voice (~62%, Claude)
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

## Server (~88%, Claude, except analytics / notifications / billing by Antigravity)
Done: auth and hardening, businesses / onboarding CRUD, calls + recordings + analysis, Alembic migrations (0001 to 0010), audit log, admin auth / tenants / tenant data / plans / overview,
secure Razorpay order and verify, billing status with real usage, invoices, change-plan, start-trial, trial config, admin integrations API, tenant integrations API, admin health / settings,
Twilio and Exotel signature checks, stream tokens, rate limits, production startup guard, message templates and messenger, quotas and suspended-clinic block, support tickets and announcements,
admin users / audit / security / verticals / SEO APIs, **admin alerts feed (per-admin unread, muting), spend and profit report with rate card, LLM token metering, playground sandbox**.
Pending: alerts by email or push, an alert when a trial expires, exact LLM token counts for streamed replies, tracking of post-call analysis / previews / WhatsApp fees / number rental in spend,
overage billing, a cross-clinic customers API, delivery webhooks for messages, portal-saved provider keys used by live calls (checks only today), Postgres run of the new migrations.

## Security - full list in `DOCS/23`
Fixed on branch `complete`: billing routes have auth, upgrades cannot be switched on for free, the free trial is once per business, payment verification checks the order with Razorpay,
`GET /api/admin/calls` needs a platform admin, Twilio / Exotel webhooks are verified, `call-me` / `preview` / `transcribe` / `voices` / `llm-models` need a login (previews use short-lived media tokens),
safe production defaults with a startup guard, a suspended clinic cannot sign in, the invite default password is gone.
Open: the Meta App Secret pasted in a chat must still be rotated (owner action); dependency alerts are fixed except `braces` (lint tool) and `ecdsa`, which have no fix;
PII is not redacted outside shadow logs; the rate limiter is in-process (one worker).

## Planned next: message templates and channels (`DOCS/24`)
Editable templates for Email, SMS, WhatsApp and In-app in the admin portal (platform messages, channel setup, delivery log) and the user portal (each clinic's own
patient messages, channel order, WhatsApp approval). Plan only; 5 open questions for Parikshit are at the end of the doc.

## Owner actions
Rotate the Meta App Secret (it was pasted in a chat on 2026-10-02) and re-create the api container; add a real clinic (not "Demo clinic") on WhatsApp.
Groq paid tier, Cartesia credits, keys in `.env` (`META_APP_SECRET`, `RESEND_API_KEY`), rotate keys once printed, delete 8 empty
"Demo clinic" businesses (9 duplicates exist), restart the backend and re-test logo upload, click through everything in a browser and on a real call.

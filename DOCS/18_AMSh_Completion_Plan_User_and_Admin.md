# Completion Plan: User app (login to end) and Admin portal

Written 2026-09-28 from an audit of the code (pages, components, backend routes). Goal: every page in `frontend/user` and
`frontend/admin` is backed by a real endpoint, nothing is a static mock, and every flow works from login to the last screen.
Progress is tracked in [`17_AMSh_Claude_Change_Tracker.md`](17_AMSh_Claude_Change_Tracker.md); the overview is in
[`README.md`](README.md).

How "audit" was done: for each page and the components it renders, count real data calls (`Controller.`, `ApiService`,
`fetch`) versus static data. A page with zero calls was treated as static unless its parent passes data in. This is a
heuristic, so each phase starts by opening the page to confirm before changing it.


### Who is working on what (2026-09-28): READ THIS BEFORE STARTING ANY PENDING ITEM
- **User side (`frontend/user`, and the user-facing analytics backend such as `backend/server/api/routes/dashboard_stats.py`) is being
  worked on by Antigravity right now.** Its uncommitted work already includes: many dashboard headers, analytics KPIs and charts
  (`AIPerformanceCard`, `CallVolumeChart`, `CallVolumeTrendChart`, `CallOutcomesChart`, `AppointmentSourcesChart`,
  `BusiestCallingHoursHeatmap`, `TopCallReasonsList`, `RecentAIConversations`), `ServiceModal`, `analytics.controller.ts`, and edits to the
  dashboard, analytics, appointments, billing, conversations, integrations, notifications, services, settings and team pages.
  **Do not start the user-app items in section 9 (U) from this list without checking `git status` and asking who has them.**
  Some of those items (analytics, services, conversations, notifications, billing, team, settings) may already be in progress or done there.
- **Admin portal (`frontend/admin`, `backend/server/api/routes/admin.py`) is being worked on by Claude.**
- **Overlap to reconcile:** on the user side Claude also changed these files today (uncommitted, may conflict with Antigravity's edits):
  `(auth)/forgot-password`, `(auth)/reset-password` (new), `(auth)/verify-email`, `settings/SecuritySettings.tsx`,
  `settings/NotificationSettings.tsx` (rewritten into a real "Automations and alerts" tab), `middleware.ts` (public auth paths),
  `controllers/auth.controller.ts`, `controllers/dashboard.controller.ts` (calendar feed, config types, call fields),
  `utils/api_endpoints.ts`, `CallDetailPanel.tsx`, `CallLogsTable.tsx`, `calls/page.tsx`. If a merge conflict appears, keep both sets of changes.
- Claude's backend-only work (auth, migrations, post-call analysis, reminders, alerts, calendar feed, WhatsApp chat, admin) does not overlap with the user side.

---

## 1. What the audit found

### 1a. Backend endpoints that exist (by area)

| Area | Exists | Missing for a complete product |
|---|---|---|
| Auth (`/api/auth`) | register, login, me, accept-invite | forgot / reset password, email verification, change password, logout, token refresh, login rate limit, resend invite |
| Team (`/businesses/{id}/users`) | create, list | change role, deactivate, remove, resend invite, revoke invite |
| Business | create, list, get, patch | delete / close account, logo upload, plan/limits read |
| Agents, services, staff, knowledge, appointments, calls, dashboard stats | CRUD exists | (calls: recordings done) |
| Customers / patients | list, create | update, delete, notes, history of appointments and calls |
| Billing (`/api/billing`, `/api/payments`) | config, Razorpay create-order + verify, per-business read | invoices list, plan change, cancel, payment-method view, webhooks, usage-based limits |
| Integrations | list, connect, disconnect, WhatsApp signup + test | Google/Outlook calendar OAuth (folders are empty stubs), Twilio connect endpoint used by `/onboarding/integrations/twilio` |
| Analytics | none | calls per day, outcomes, booking rate, minutes, top intents, busiest hours |
| Conversations | none | list and thread for calls and WhatsApp chats, human takeover |
| Notifications | none | list, mark read, preferences, delivery (email/SMS/WhatsApp/in-app) |
| Settings | business patch only | profile, notification preferences, AI defaults, security (sessions) |
| **Admin (`/api/admin`)** | **nothing (empty router)** | everything, see 1c |

### 1b. User app pages (`frontend/user`)

| Page | State | Notes |
|---|---|---|
| login, register | wired | |
| accept-invite | UI only | backend endpoint exists, page makes no call |
| forgot-password, verify-email | **UI only, no backend** | |
| dashboard (home) | wired (stats) | |
| ai (AI Studio) | wired | most recent work |
| calls | wired | recordings, test-call label, WhatsApp badge done |
| appointments, doctors, knowledge, patients | wired | patients has no edit/delete |
| services | partly wired | cards load; header actions not verified |
| team | **static** | needs users endpoints + invite email |
| settings | partly | Business tab wired; profile, security, notifications, AI defaults are static |
| billing | **static** | plan card, tiers, payment method, invoices |
| integrations | **static** | grid is static; Developer settings static |
| conversations | **static** | no backend |
| notifications | **static** | no backend |
| analytics | **static** | KPIs and charts hard-coded |
| onboarding: business, hours, services, staff, knowledge, ai-receptionist, checkout, success | wired | |
| onboarding: integrations (+ twilio), plans, review | **UI only** or partly | plans/review make no calls; twilio page has none |
| landing | static marketing page | fine, but check links and pricing text match the real plans |

### 1c. Admin portal (`frontend/admin`)

25 pages (about 12,000 lines) and **zero** data calls. There is no API client, no auth guard, and the backend `/api/admin`
router only holds a docstring. So the whole portal is a design mock: dashboard, businesses (+detail), business-users,
admin-users, appointments, calls, conversations, customers, services, receptionists, billing, usage, analytics, health,
integrations, security, audit, tickets (+detail), announcements, verticals, login.

Also: `User.scope` already distinguishes `platform` from `business`, and `usage.py` exists as a model; there are **no
models** for support tickets, announcements, audit log, notifications, invoices or conversations.

### 1d. Cross-cutting gaps

1. **No email delivery.** No SMTP/Resend settings exist; the dispatcher's email branch only returns "queued". Password
   reset, verification and invites all need real email.
2. **No database migrations.** Tables are created from the models; there is no Alembic. Adding a column (for example
   `email_verified`) to a live database needs a migration path.
3. **No first platform admin.** Nothing creates the first `scope=platform` user.
4. **No API tests for the server side.** `backend/tests` is empty (all tests are in `ai/evals`).
5. **No audit log**, which admin pages and security both need.

---

## 2. Decisions I need from you (defaults I will use if you do not answer)

1. **Email provider.** Default: Resend (already named in the dispatcher). Without a key I will log the link in the API
   console, so flows work in development.
2. **First super-admin.** Default: a script `python -m backend.scripts.create_platform_admin <email>` that prompts for a
   password. No hidden default account.
3. **Migrations.** Default: add Alembic, generate a baseline from the current models, and make every new column a
   migration.
4. **Admin scope for v1.** Default: read + the actions that matter (suspend tenant, change plan, reply to tickets,
   announcements, audit view). Impersonation ("log in as tenant") is left out of v1 because it is security-sensitive.
5. **Plans and prices** are needed to build the billing screens honestly. Default: read them from the existing
   `/api/billing/config`.

---

## 3. Phases (in order; each item = endpoint + test + page wired + tracker entry)

Size: S = under half a day, M = about a day, L = several days.

### Phase 0: foundations (M)
1. Alembic baseline + migration workflow. (M)
2. `email_service` (Resend, log fallback), templates: reset, verify, invite, ticket reply. (S)
3. `audit_log` model and a helper `audit(actor, action, target)`; call it from auth, team, billing, admin actions. (S)
4. Server API test harness in `backend/tests` (FastAPI TestClient + sqlite) with shared fixtures. (S)
5. Login rate limit and lockout counters. (S)

### Phase 1: auth complete, both apps (M)
1. Forgot / reset password (hashed one-time tokens with expiry), wire `/forgot-password` and a new `/reset-password` page.
2. Email verification (token, resend), wire `/verify-email`; decide whether unverified users are blocked (default: soft
   banner, block only billing changes).
3. Change password and session list / revoke (Settings, Security tab).
4. Logout and token refresh; `accept-invite` page wired to its endpoint.
5. Admin login: `/api/admin/auth/login` (scope `platform` only), route guard and API client in `frontend/admin`,
   `create_platform_admin` script.

### Phase 2: user app, page by page (L)
Order by value to a clinic owner:
1. **Team**: list, invite (email), change role, deactivate, resend/revoke invite.
2. **Settings**: profile, business (already), notification preferences, AI defaults, security.
3. **Conversations**: calls and WhatsApp threads in one inbox, transcript, filters; human takeover toggle for WhatsApp.
4. **Analytics**: KPIs and charts from calls and appointments (real queries, date range).
5. **Notifications**: model, in-app list, mark read; booking, missed-call and escalation events create them.
6. **Billing**: current plan, usage vs limits, invoices, cancel/change plan, payment method (Razorpay data).
7. **Integrations**: real status per provider, connect / disconnect; Google/Outlook calendar OAuth when the owner wants it;
   Twilio connect endpoint for `/onboarding/integrations/twilio`.
8. **Patients**: edit, delete, appointment and call history.
9. **Services** header actions, onboarding **plans**, **review** (submit), landing links.

### Phase 3: admin backend (L)
Endpoints under `/api/admin`, all guarded by `scope=platform`:
1. Tenants: list with filters, detail, suspend / reactivate, change plan, limits.
2. Users: business-users and admin-users (create, deactivate, reset password link, roles).
3. Cross-tenant read APIs: appointments, calls (+ recordings), conversations, customers, services, receptionists (agents).
4. Billing: revenue, subscriptions, invoices, failed payments; usage from the `usage` table.
5. Analytics: platform KPIs and time series.
6. Health: API, database, Redis, Qdrant, Deepgram, Cartesia, Groq / Gemini status and credits where the vendor exposes them.
7. Integrations overview, verticals (clinic now; others "coming soon").
8. Security and audit: audit log query, login events, locked accounts.
9. Tickets and announcements: new models, endpoints, email notification on reply.

### Phase 4: admin frontend (L)
1. API client, auth guard, error and loading states shared by all pages.
2. Replace static data page by page in the order of Phase 3; keep the existing design.
3. Remove all mock arrays; add an empty state for each list.

### Phase 5: voice and channel items already queued (M)
1. Deepgram in the playgrounds: backend relay is done (`routes/stt.py`, verified live with `nova-3` + `multi`); the browser
   adapter that replaces Chrome speech recognition is next.
2. WhatsApp: template messages for reminders and after-24-hour messages, media handling, human takeover, per-business switch.
3. Appointment reminders worker (`workers/jobs` is empty).

### Phase 6: quality gate (M)
1. Server tests for every new endpoint (auth, permission, tenant isolation: a user of business A must never read business B).
2. End-to-end pass by hand: register, onboarding, first call, first booking, invite a teammate, reset password, admin login,
   suspend the tenant, see the audit entry.
3. Update README status table and this plan.

---

## 4. Definition of done for any item

- The endpoint exists, is guarded (tenant or platform scope), and has tests including a cross-tenant denial test.
- The page reads and writes only through that endpoint; no static arrays remain; loading, empty and error states exist.
- `tsc` passes in the app, the server suite passes.
- The change is logged in the tracker with what was **not** verified live.

## 5. Risks

- Scope is large: Phases 2 to 4 are weeks of work, not a session. The order above keeps every stopping point usable.
- Admin has about 12,000 lines of UI written against imagined data; some screens may need small redesigns when the real
  data shape is known.
- Without email delivery credentials, reset/verify/invite cannot be proven end to end (they will be proven with the log
  fallback and unit tests only).
- Tenant isolation is the highest-impact bug class in a multi-tenant product: it gets its own tests in every phase.

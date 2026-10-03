# Completion Plan: User app, Admin portal and what they need from the server

Status as of 2026-09-28 (evening). Goal: every page in `frontend/user` and `frontend/admin` reads real data through a tested
endpoint, nothing is a static mock, and every flow works from login to the last screen.
Overall progress and the percentage per part: [`.brain/progress.md`](../.brain/progress.md). Architecture and per-module status:
[`README.md`](README.md). Every change with what was and was not verified: [`17_AMSh_Claude_Change_Tracker.md`](17_AMSh_Claude_Change_Tracker.md).

## Who works on what (read before starting an item)
- **User side** (`frontend/user` and the user-facing analytics / notifications backend: `dashboard_stats.py`, `analytics.py`,
  `notifications.py`) is being worked on by **Antigravity**. Check `git status` and ask before touching it.
- **Admin portal** (`frontend/admin`, `admin*.py` routes, plans, billing security) and the **AI / voice engine** are worked on by **Claude**.
- Claude changed a few user-side files at the owner's request (auth pages, security and notification settings tabs, `middleware.ts`,
  the controllers, call panel, three parse-error fixes). If they conflict with Antigravity's edits, keep both sets of changes.

## Decisions taken (defaults, change them if you disagree)
Email through Resend (without a key the link is only logged); first platform admin created by
`python -m backend.scripts.create_platform_admin`; Alembic migrations run at start-up; impersonation ("log in as clinic") is
deliberately not built; plans and prices live in the admin-managed plan catalog and the tenant app reads `GET /api/plans`.

## Phases

### Phase 0: foundations: DONE (two gaps)
Alembic (revisions 0001 to 0004), email service, audit log, login lockout: done. Gaps: `backend/tests` is empty (all 256+ tests live in
`backend/ai/evals/test_agent_core.py`), no CI.

### Phase 1: authentication: mostly done
Done: forgot / reset / change password, email verification (backend and page), admin login, lockout, audit trail, single-purpose tokens.
Pending: logout everywhere and session list, token refresh, accept-invite page (it makes no call yet), admin password reset, two-factor sign-in.

### Phase 2: user app (Antigravity)
Wired: login and register, dashboard, AI Studio, calls, appointments, doctors, knowledge, patients (no edit / delete), services, onboarding
steps business / hours / services / staff / knowledge / AI receptionist / checkout / success, and the Automations tab in Settings.
In progress on the user side: analytics, conversations, notifications, team, the remaining Settings tabs.
Pending: **billing page** (still static: show the plan from `GET /api/plans`, the business's plan, invoices once payments are recorded),
**integrations page**, onboarding **plans** (should read `GET /api/plans`), **review**, **Twilio** step and the integrations grid,
patients edit / delete and history, landing-page claims that are not true yet (see `features_list.md`), and the `tsc` errors currently
left by unfinished edits (Conversations, AI defaults settings, a duplicate `getBusinessInfo` in `dashboard.controller.ts`).

### Phase 3: admin backend (updated 2026-10-03: nearly all done, see the end of this phase)
Done (`/api/admin/...`): auth, tenants (list, detail, suspend / reactivate / plan), per-business data (users, agents, appointments,
calls, services, knowledge, integrations, activity), plan catalog (create / edit / archive / delete), overview for the dashboard.
Pending: business-users and admin-users management, cross-tenant lists (appointments, calls, conversations, customers, services,
receptionists), usage and quotas, analytics, health detail page, integrations overview, security and audit read APIs, support tickets,
announcements, verticals. Also: enforce a plan's quotas per business, record payments and invoices, block a suspended clinic's
dashboard login.

### Phase 4: admin frontend (updated 2026-10-03: 24 of 25 pages are real; only a cross-tenant Customers list is missing)
Real: login and guard, **Dashboard**, **Businesses** (list and detail), **Billing** (plan catalog, distribution, business subscriptions).
20 pages are still design mocks and show an amber "Sample data" banner: business-users, admin-users, appointments, calls, conversations,
customers, services, receptionists, usage, analytics, health, integrations, security, audit, tickets, announcements, verticals (plus their
detail pages). Sidebar links `/notifications` and `/settings` point to pages that do not exist.

### Phase 5: voice and channels
Done: WhatsApp AI chat (live on the Meta test number since 2026-10-02, with returning-patient memory, privacy rule and booking channels, see doc 20), Hindi/Hinglish conversation layer (offline tests, doc 21), reminders, missed-call text-back, staff alerts, calendar feed, natural fillers.
Pending: Deepgram in the playgrounds (relay done, browser adapter missing), WhatsApp on a real clinic number, WhatsApp template messages / media / human takeover,
a real phone-call test, listening tests (laughter, fillers, interrupt thresholds), live take-over from the tenant dashboard.

### Phase 6: quality gate: started (CI and 416 offline tests exist; the manual passes below are still owner tests, see `26_...` C)
Tenant-isolation tests for every endpoint, an end-to-end manual pass in a real browser and on a real call (register, onboarding, first call,
booking, invite a teammate, reset password, admin login, suspend a tenant), README and status refresh.

## Definition of done for any item
The endpoint exists, is guarded (tenant or platform scope) and has tests including a cross-tenant denial; the page reads and writes only
through it with loading, empty and error states; `tsc` and the server suite pass; the change is logged in the tracker with what was
**not** verified live.

## Risks
Most work so far is unit-tested but has not been clicked through in a browser or tried on a real phone call. Tenant isolation is the
highest-impact bug class in a multi-tenant product. Antigravity and Claude edit the same repository at the same time: pull, check
`git status` and keep commits small.

## Update 2026-10-03 (branch `complete`)

Done since this plan was written: admin APIs and pages for audit, security, staff accounts, support tickets, announcements, verticals, SEO and
message templates; quotas (seats, knowledge documents; minutes and messages reported); a block on suspended clinics; clinic Help and Support and the
announcement banner; message sending through templates; real dashboard numbers; CI. Still pending: cross-tenant Customers list, payment records and
invoices, overage billing, per-role permissions beyond staff management, Meta template submission, delivery webhooks, patient entity and a real
appointments table, outbound campaigns, live take-over, and everything in `26_AMSh_Owner_Actions.md`.

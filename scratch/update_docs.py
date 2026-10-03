import pathlib, re

ROOT = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas")

# ------------------------------------------------------------------ DOCS/17 tracker
p = ROOT / "DOCS" / "17_AMSh_Claude_Change_Tracker.md"
s = p.read_text(encoding="utf-8")
anchor = "| 24 | **Merged `v1.1`"
assert s.count(anchor) == 1
rows = """| 29 | **Admin Integrations: credentials CRUD, no more slow load, real brand icons.** Each provider has Configure: values typed in the portal are saved ENCRYPTED with `CryptoManager` (Fernet) in `platform_integrations.config["secrets"]`, override `.env` for the connection checks, and Reset returns to `.env`; `.env` is never copied into the DB. List now answers from the stored check at once and refreshes old checks in a background thread (was 1 to 3 s because it pinged every provider). Page redesigned (KPI strip, category tabs, search, status pill with icon + text, details dialog) with vendored brand SVGs (Gemini, Groq, ElevenLabs, Deepgram, WhatsApp, Resend, Razorpay, Stripe official; Twilio hand-drawn; Exotel / Cartesia monogram). Limit: a key saved in the portal is used by the connection check only; live calls still read `.env`. Checked in the container (bogus key to 401 to reset), UI not clicked in a browser | DONE | `backend/server/api/routes/admin_integrations.py`, `frontend/admin/src/app/(admin)/integrations/page.tsx`, `components/admin/{ProviderLogo,providerIcons,CredentialsDialog}.tsx` |
| 30 | **Platform email (SMTP) set up in the portal.** Display name, from / reply-to, username, password (encrypted), host, port, security, logo upload, provider presets; "Test" logs in without sending. `email_service.send_email` uses it first, falls back to Resend, then to the dev log. Round trip checked (encrypted at rest, decrypts, validation); no real mail sent | DONE | `backend/server/services/platform_smtp.py`, `email_service.py`, `components/admin/SmtpConfigDialog.tsx` |
| 31 | **Admin Health, Settings, Notifications made real.** Health times the database and Redis now and shows each provider's last real check; invented requests/min, uptime and error rates removed (unmeasured = dash). Settings shows read-only deployment facts (no fake maintenance / signup switches: the backend has none). Notifications = providers needing attention + recent audit events | DONE | `backend/server/api/routes/admin.py`, `frontend/admin/src/app/(admin)/{health,settings,notifications}/page.tsx` |
| 32 | **Admin Analytics from the database** in the layout of the design image: KPI cards with sparklines, business growth, plan mix, funnel, revenue trend, retention and churn, trial vs paid, call volume with AI answer and transfer rates, calls by vertical, top businesses, signups, trials expiring, conversions, CSV export. Custom pixel-width SVG charts (smooth curves, 5-tick axes, hover tooltip, grow / draw animation, reduced-motion safe), responsive grid, and a "Sample data" toggle (frontend-only invented numbers, off by default). Limits: no payment records yet so revenue is 0; no status history so churn is plotted by sign-up date and today's status | DONE | `GET /api/admin/analytics`, `frontend/admin/src/app/(admin)/analytics/page.tsx`, `components/admin/AnalyticsCharts.tsx`, `lib/analytics{Types,Sample}.ts` |
| 33 | **Admin Receptionists, Appointments, Conversations on real data, original designs kept.** New cross-business endpoints; the three pages swap only the mock array for state filled from the API (my first rewrite replaced the designs and was reverted at the owner's request). `business-users` reverted to git; the real-data version someone made is saved at `scratch/backup_pages/` | DONE | `backend/server/api/routes/admin_platform_data.py`, the three `page.tsx` files |
| 34 | **Demo data and anonymous access removed from admin calls.** `GET /api/admin/calls` used to create a fake "Smile Dental Clinic" and fake calls when the DB had none, allowed anonymous access, and invented 145 s / 88.5 % fallbacks. Seeding and fallbacks removed, platform-admin auth required (401 without a token) | DONE | `backend/server/api/routes/admin_calls.py` |
"""
s = s.replace(anchor, rows + anchor, 1)
p.write_text(s, encoding="utf-8")

# ------------------------------------------------------------------ .brain/progress.md
p = ROOT / ".brain" / "progress.md"
s = p.read_text(encoding="utf-8")
s = s.replace("# Amsh: Progress (2026-10-02)", "# Amsh: Progress (2026-10-03, evening)", 1)
s = s.replace("## Overall: about 56% (estimate)", "## Overall: about 63% (estimate)", 1)
s = s.replace("| Admin frontend | **~23%** | ~77% |", "| Admin frontend | **~44%** | ~56% |", 1)
s = s.replace("| AI / voice | **~55%** | ~45% |", "| AI / voice | **~56%** | ~44% |", 1)
s = s.replace("| Server | **~66%** | ~34% |", "| Server | **~72%** | ~28% |", 1)
s = s.replace("| **Overall (equal weight)** | **~56%** | ~44% |", "| **Overall (equal weight)** | **~63%** | ~37% |", 1)
new_changes = """- **2026-10-03 (evening, admin portal):** 11 of 25 admin pages now read real data (was 6): Integrations (credentials saved encrypted in the portal,
  fast list, real brand icons), platform email (SMTP) setup, Health, Settings, Notifications, Analytics (database-driven, design-image layout, animated
  charts, "Sample data" toggle), Receptionists, Appointments, Conversations (original designs kept, only the data source swapped). `GET /api/admin/calls`
  no longer seeds fake calls, needs a platform admin, and no longer invents fallback numbers. Checked in the container and with `tsc`; **not clicked
  through in a browser by a person**. Tracker entries 29 to 34 in `DOCS/17`.
"""
marker = "- **2026-10-02:** WhatsApp connected end to end"
assert s.count(marker) == 1
s = s.replace(marker, new_changes + marker, 1)

a = s.index("## Admin frontend (~23%, Claude)")
b = s.index("## AI / voice")
s = s[:a] + """## Admin frontend (~44%, Claude)
Done (real data): login + guard, dashboard, businesses list, business detail, billing / plan catalog and trial config, integrations (with
credential editing and SMTP setup), health, settings, notifications, analytics, receptionists, appointments, conversations. 11 of 25 pages.
Pending (mock): business-users (+ detail), admin-users, customers, services, usage, security, audit, tickets (+ detail), announcements, verticals, and the
detail pages of appointments / conversations. Analytics revenue stays 0 until payments are recorded. Needs a real browser pass (layout, responsive, charts).

""" + s[b:]
s = s.replace("## Server (~66%, Claude, except analytics / notifications / billing by Antigravity)", "## Server (~72%, Claude, except analytics / notifications / billing by Antigravity)", 1)
s = s.replace("change-plan, start-trial, trial config, admin integrations API, tenant integrations API**.",
              "change-plan, start-trial, trial config, admin integrations API (live checks, encrypted credential overrides, SMTP settings), tenant integrations API, admin health / settings / notifications / analytics / receptionists / appointments / conversations endpoints**.", 1)
s = s.replace("remaining admin APIs (users, cross-tenant lists, usage, tickets, announcements, audit / security read, verticals)",
              "remaining admin APIs (users, usage, tickets, announcements, audit / security read, verticals); portal-saved provider keys are not used by live calls yet (checks only)", 1)
s = s.replace("Open: no signature check", "Fixed 2026-10-03 (admin): `GET /api/admin/calls` was open to anonymous users and seeded demo data; now needs a platform admin.\nOpen: no signature check", 1)
s = s.replace("delete 8 empty\n\"Demo clinic\" businesses,", "delete 8 empty\n\"Demo clinic\" businesses (9 duplicates exist),", 1) if "delete 8 empty\n\"Demo clinic\" businesses," in s else s
p.write_text(s, encoding="utf-8")

# ------------------------------------------------------------------ DOCS/README.md
p = ROOT / "DOCS" / "README.md"
s = p.read_text(encoding="utf-8")
s = s.replace("| Admin frontend | ~23% | 20 mock pages (6 of 26 are real) |", "| Admin frontend | ~44% | 14 mock pages (11 of 25 are real, incl. analytics, health, integrations, receptionists, appointments, conversations) |", 1)
s = s.replace("| Server | ~66% |", "| Server | ~72% |", 1)
p.write_text(s, encoding="utf-8")
print("docs updated")

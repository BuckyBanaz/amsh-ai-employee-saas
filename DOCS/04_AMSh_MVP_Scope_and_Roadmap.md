# Amsh — MVP Scope & Roadmap
**Status:** Working document, generated from an actual audit of the codebase (not just the earlier research docs).
**Date:** 2026-09-09

---

## 0. Ground Rules (already decided, don't re-litigate)

1. **Product name is Amsh.** `.agents/rules/project-context.md` says explicitly: *"Do NOT use AuraHealth, Aira, or any other name."* User confirmed Amsh is final (2026-09-09).
   - ✅ **Resolved in code.** The live admin `Sidebar.tsx` was already correctly branded "Amsh Admin" — the "AuraHealth" text I'd seen was only in the (unrelated) Figma design file and one leftover mock-data file (`admin-users/page.tsx`, seed emails/copy), which has now been fixed to `@amsh.ai` / "Amsh".
   - ⚠️ **Still not fixed:** the Figma file (`Aura Health`) itself — out of reach right now (Figma MCP hit its Starter-plan rate limit this session). Rename it there too when convenient, so design and code stay in sync.( ye importtant  nhi ye mai khud karlungaa )
2. **MVP vertical = Healthcare only** — clinics, medical centers, hospitals. Confirmed by the user. Restaurant/salon/hotel/real-estate/etc. are **future phase**, not now.
3. **Architecture stays vertical-agnostic/config-driven** even though only one vertical ships in MVP (`.agents/rules/ai-receptionist-rules.md` §1, §6) — don't hardcode `if businessType == "clinic"` when building the real engine later, but don't spend MVP time building other verticals either.

---

## 1. The Single Most Important Finding

> **Update, later on 2026-09-09:** backend work has started — `auth`, `businesses`, and team invites (`users.py`) are real and curl-tested, in `backend/` at repo root, Dockerized (Postgres + Redis). The rest of this section describes the state *before* that; it's now only true for the modules not yet listed as done in §3.

**There is no backend.** `find` on the repo root shows only `frontend/admin`, `frontend/user`, and doc/rules folders — no Python/FastAPI service, no database, no API, no auth server. The PRD's entire "Conversation Engine" (Twilio, STT, Groq LLM, TTS, RAG, state machine) does not exist yet in this repo.

**Both frontends are 100% UI mockups.** Every page (`calls/page.tsx`, `receptionists/page.tsx`, the AI Test Playground I just added, etc.) reads from hardcoded local arrays (`callsData`, `receptionistsData`, `STRINGS.*`) — zero `fetch`/API calls anywhere. Auth screens exist but don't authenticate against anything real.

This changes what "MVP" means in practice: **the frontend design work is far ahead of the product.** The critical path to an actual MVP is the backend + wiring, not more screens.

---

## 2. Current State Audit

### Admin dashboard (`frontend/admin`) — platform operator console
19 route pages, all with substantial UI (73–1043 lines each), all mock data:
`dashboard`, `businesses`, `business-users`, `receptionists`, `appointments`, `calls`, `conversations`, `customers`, `services`, `billing`, `usage`, `analytics`, `integrations`, `health`, `audit`, `security`, `admin-users`, `tickets`, `announcements`, `verticals`.

- `verticals/page.tsx` is a **preview of the future multi-vertical vision** (Clinic/Restaurant/Real Estate/Hotel cards with "Edit Config (YAML)" buttons that do nothing). Correctly scoped as a mockup — don't build this out for MVP.
- Just added this session: **Live call badge + Take Over Call** and an upgraded **waveform audio player + sentiment tags** in `calls/page.tsx`.

### Business dashboard (`frontend/user`) — clinic-owner console
14 dashboard pages + full onboarding flow (`business → hours → services → staff → ai-receptionist → knowledge → integrations → review → success`) + auth (`login/register/forgot-password/verify-email/accept-invite`).
- Uses a centralized `utils/strings/en.ts` dictionary for all UI text — good foundation for the "map terminology per vertical" requirement in the rules, but only English/clinic terminology exists today.
- Just added this session: **AI Test Playground modal** (`components/dashboard/TestPlaygroundModal.tsx`), wired to the previously-dead "Test AI" button.

### Bugs found and fixed this session (pre-existing, not caused by new feature work)
- `STRINGS.DASHBOARD.COMPONENTS` was mis-nested inside `HEADERS` — this crashed most of the `frontend/user` dashboard at runtime (not just a type error). Fixed.
- 81 files imported `utils/strings/en` with one extra `../` — silently broken under strict resolution. Fixed.
- **Still broken (not fixed, out of scope of the feature work):** `components/dashboard/AppointmentsTable.tsx` reads `STRINGS.DASHBOARD_PANELS.APPOINTMENTS` (doesn't exist) and `components/dashboard/TopBar.tsx` reads `STRINGS.PAGES` (doesn't exist). Both will throw at runtime when rendered.

---

## 3. MVP Feature Checklist — Healthcare Vertical Only

Legend: ✅ done (UI) · 🟡 UI done, needs real backend wiring · 🔴 missing entirely · ⏭️ deliberately deferred

### A. Core voice engine (backend — must be built)
| Feature | State |
|---|---|
| FastAPI backend service | ✅ built (auth, businesses, team invites — see below) |
| Postgres + Redis (session/tenant data) | ✅ built |
| **AI phone number (forwarding or dedicated)** — the number a caller actually dials; MVP starts everyone on call-forwarding to a Twilio number, see `DOCS/05_AMSh_Backend_API_Endpoints.md` §4a | 🔴 missing — **flagged by user, don't forget this one** |
| Twilio voice webhook + media stream | 🔴 missing |
| Streaming STT (Deepgram/Groq Whisper) | 🔴 missing |
| Groq LLM conversation engine + deterministic state machine | 🔴 missing |
| Streaming TTS (ElevenLabs/Cartesia) | 🔴 missing |
| Clinic vertical config (intents: book/reschedule/cancel, FAQ) | 🔴 missing |
| Knowledge base / RAG per clinic | 🔴 missing |
| Barge-in (VAD interrupt) | 🔴 missing |

### B. Business (clinic) dashboard
| Feature | State |
|---|---|
| Onboarding flow (business, hours, services, staff, AI config, knowledge, review) | 🟡 UI complete, doesn't persist anywhere |
| Real auth (login/register/verify/reset) | 🟡 UI complete, not wired |
| AI Receptionist config (Behavior/Voice/Languages/Call Handling/Appointments/Escalation tabs) | 🟡 UI complete, mock data |
| **AI Test Playground** | 🟡 UI complete (just added), simulated transcripts only — needs the real engine to actually test against |
| Call logs, conversations, appointments, patients, services, doctors | 🟡 UI complete, mock data |
| Billing / plan management | 🟡 UI complete, no real Stripe (or other) integration |
| Team & permissions | 🟡 UI complete, mock data |

### C. Platform admin dashboard
| Feature | State |
|---|---|
| Multi-tenant business directory, business detail, business users | 🟡 UI complete, mock data |
| **Calls monitoring, Call Recording/Transcript Drawer** | 🟡 UI complete (waveform + sentiment tags just added), needs real call data |
| **Live Call Take Over** | 🟡 UI complete (just added) — needs a real signaling path to actually hand a live Twilio call to a human |
| AI receptionists directory, platform health, usage & limits, analytics, audit logs, security events | 🟡 UI complete, mock data |
| Billing/subscriptions, support tickets, announcements | 🟡 UI complete, mock data |
| Admin RBAC / admin-users | 🟡 UI complete, no real auth/roles enforced |
| Multi-vertical "Verticals" config page | ⏭️ deliberately a mockup — leave as-is until post-MVP |

### D. Cutting across both frontends
| Feature | State |
|---|---|
| Any real API layer connecting the two Next.js apps to a backend | 🔴 missing — **this is the actual MVP blocker** |
| Multi-tenancy / data isolation | 🔴 missing (no backend to isolate) |
| Consistent branding (Amsh vs AuraHealth) | 🔴 unresolved, see §0 |

---

## 4. What's Explicitly *Not* MVP (Post-MVP / Future)

Straight from `03_AMSh_High_Value_Roadmap.docx` and the PRD's multi-vertical vision — valuable, but only after the healthcare MVP proves the core engine:

- Additional verticals: restaurant, retail, salon/spa, real estate, gym, hotel, service centers (PRD §3.1). The `verticals/page.tsx` mockup already gestures at this — don't wire it up yet.
- Auto Top-Up / Usage Overage Rules automation
- Super-Admin Impersonation ("log in as clinic")
- Automated SMS payment links, Missed-Call Follow-Up automation
- Cancellation Gap Auto-Filler / Virtual Waitlist
- Estimated Revenue Captured metric
- Daily 8AM overnight email digest
- Automatic Google Review Booster
- Outbound calling, WhatsApp automation, PMS/EHR write-back — doc 03 explicitly notes these are **not verified as built anywhere** and shouldn't be marketed as existing.

**One judgment call worth flagging:** *AI Emergency Keyword Auto-Escalation* is filed as "Roadmap" in doc 03, but for a **healthcare** MVP specifically (patients in pain/emergency calling a clinic AI), this is arguably a safety-critical MVP requirement, not a nice-to-have. Recommend pulling it into MVP scope rather than deferring it — your call.

---

## 5. Recommended Immediate Next Steps (in order)

1. ~~Decide the branding question~~ — done, Amsh confirmed and code fixed (§0). Only the Figma file still says "Aura Health" — rename there when the Figma rate limit resets.
2. **Fix the 2 remaining broken `STRINGS` references** (`AppointmentsTable.tsx`, `TopBar.tsx`) — quick, prevents a runtime crash.
3. **Stand up the backend skeleton**: FastAPI + Postgres, one real endpoint (e.g. `POST /api/business`), one real auth flow. This is the highest-leverage next step — everything else in the frontend is already ahead of it.
4. **Wire ONE full vertical slice end-to-end** for Clinic: a real Twilio call → STT → LLM → TTS → appointment booked in the real DB → visible in both dashboards. This is the PRD's own Phase 1 milestone and the actual proof-of-concept the `.agents/rules` file calls for.
5. Once that slice works, connect the *existing* frontend screens to it one at a time (they're already built — they just need real data instead of the local arrays).
6. Only after the Clinic vertical is real end-to-end: revisit the P1/roadmap items in §4.

---

## 6. Format note
This is a Markdown file (matching `AI-Receptionist-PRD_English.md` / the architecture docs already in `DOCS/`), not a `.docx` like 01–03. Say the word if you want it as `.docx` instead, or published as a shareable page.

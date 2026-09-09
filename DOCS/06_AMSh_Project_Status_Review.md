# AMSh — Project Status Review (2026-09-09)

## Verdict

Execution is strong but **lopsided**: ~11 polished admin screens plus a full user dashboard are built and matching Figma, all running on hardcoded mock data — against a backend that only has auth + businesses working, with **zero voice/call logic**. The voice pipeline (Twilio/Groq/Deepgram/ElevenLabs) is the actual product, not a nice-to-have screen, and it's at 0% pending real provider keys. UI execution is currently ahead of the thing that makes this an AI receptionist.

## Confirmed issues (verified in code, not just claimed in docs)

1. **Two live runtime bugs** in `frontend/user`:
   - `components/dashboard/AppointmentsTable.tsx` reads `STRINGS.DASHBOARD_PANELS.APPOINTMENTS` — that key doesn't exist in `utils/strings/en.ts` (`DASHBOARD_PANELS` only has `AI_VOLUME`, `ANALYTICS`, `APPOINTMENT_DETAIL`, `CALL_DETAIL`, ...). Renders `undefined` at runtime.
   - `components/dashboard/TopBar.tsx` reads `STRINGS.PAGES` — no top-level `PAGES` key exists anywhere in the file. Also `undefined` at runtime.
   - (Previously-claimed fix confirmed good: `DASHBOARD.COMPONENTS` really is a sibling of `SETTINGS`/`TEAM`/`HEADERS` under `DASHBOARD` now — line 646 sits at the same indent level, not nested inside `HEADERS` anymore.)

2. **78 modified files, 0 commits since "heelo."** Every admin screen, the team-invite flow, and the entire new backend live only in the uncommitted working tree (3 commits total in repo history: `first commit`, `fix: add frontend files`, `heelo`). One bad `git checkout -- .` or crash away from losing all of it.

## Current state by area

- **Frontend — admin (`frontend/admin`)**: Screens 02–11 from the Figma sequence fully implemented (Dashboard, Businesses, Business Users, AI Receptionists, Calls, Conversations, Appointments, Customers, Services) with cross-screen navigation. All on mock data.
- **Frontend — user (`frontend/user`)**: Strings centralized into `utils/strings/en.ts` for vertical-based terminology; AI Test Playground added; two known broken string references (above).
- **Backend (`backend/`)**: FastAPI + SQLAlchemy 2.0 + Postgres 16 + Redis 7, Dockerized. Working and curl-verified: `POST/GET /api/auth/*` (register/login/me) and `POST/GET/PATCH /api/businesses*`, plus a full team-invite flow. DB models exist for Agent, Call, Message, Transaction, KnowledgeDocument, Integration, Usage, PhoneNumber — but no logic behind most of them yet. Neither frontend is wired to this backend; both still run on mock data.
- **Scope discipline**: MVP correctly scoped to clinics/medical/hospital vertical only (per project rule) — being followed.

## The open fork (not yet decided)

`.brain/progress.md` (as of this review) proposes continuing with more P1 features next (Auto Top-Up / Usage Overage Rules, Admin Impersonation) — i.e. more polish on top of mock data. Given the imbalance above, an alternative is wiring **one** existing screen end-to-end to the real backend (e.g. Businesses, since that endpoint already works) to validate the architecture actually holds up before building more UI on mocks.

## Recommended order

1. Fix the 2 string bugs above (cheap, ~10 min).
2. Commit the 78 uncommitted files (cheap, prevents loss of days of work).
3. Then decide: more UI/P1 features vs. wiring an existing screen to the live backend.

## AI phone number — don't forget this again (added 2026-09-09)

**The requirement:** every AI receptionist needs its own phone number, distinct from the business's own number. MVP plan is **call forwarding** — the business forwards their existing public number to a Twilio number we provision for the AI. Later upgrade: migrate the business's number to point directly at the AI (no forwarding hop). This was already flagged once (see `.brain/progress.md`, DB model `backend/.../phone_number.py`) but the UI wasn't showing it anywhere admins/users would actually see it, so it got flagged again.

**Where it's now visible (mock data, no backend wiring yet):**
- `frontend/user` → AI page header (`AIHeader.tsx`) — always-visible "AI Number" chip.
- `frontend/user` → AI page → Call Handling tab (`CallHandlingTab.tsx`) — full forwarding setup UI (pre-existing).
- `frontend/admin` → `/businesses/[id]` Overview tab — "AI Receptionist Number (Twilio)" now shown as its own field, separate from "Business Public Number" (previously both showed the same number, which was itself a bug — the UI conflated the two).
- `frontend/admin` → `/businesses/[id]` Integrations tab — Twilio SIP Trunk Gateway card now states the AI number and which business number forwards to it.
- `frontend/admin` → `/receptionists` — new "AI Number" table column (with "Forwarded from ..." subtext) and matching rows in the Test Voice modal.

**Still not done:** none of this is real. `phone_number.py` model exists but has no API routes (planned in `05_AMSh_Backend_API_Endpoints.md` §4a) and no Twilio number is actually provisioned. All numbers shown above are hardcoded mocks. When the backend work happens, wire all five UI spots above to the real `phone_numbers` table/API instead of re-deriving them separately.

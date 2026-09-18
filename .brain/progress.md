# Progress Tracker
Organized chronologically (dates anchored to actual git commit timestamps where available — `git log --all --format="%h %ad %s" --date=format:"%Y-%m-%d %H:%M"`) so it reads as a timeline, not a topic dump.

---

## Through 2026-08-27 — Repo initialized
- `9342c4e` (2026-08-27 09:35) "first commit" — initial repo.

## Through 2026-09-07 16:38 (commit `a619b5b`) — Core admin + user screens built
- **User Dashboard (`frontend/user`)**: centralized all hardcoded UI strings into `utils/strings/en.ts` for vertical-based terminology mapping; refactored auth + settings pages to use it.
- **Admin Portal (`frontend/admin`)**: login page, Light Theme layout (`bg-white`, Plus Jakarta Sans), `Sidebar.tsx` nav groups (Tenants, Operations, Platform, Security, etc.), and the following screens fully implemented against Figma:
  - `dashboard/page.tsx` — metric cards, Active Businesses table, AI Platform Health tracker.
  - `businesses/page.tsx` (Figma `35:514`) — search, filters, vertical badges, API usage bars, status indicators.
  - `businesses/[id]/page.tsx` — full onboarding metadata, 12 tabs (Overview/Users & Roles/AI Receptionist/Appointments/Calls/Customers/Services/Knowledge Base/Integrations/Usage/Billing/Activity), staff directory, admin password-reset modal, disaster-recovery tools (unlock, 2FA wipe, session revoke). Emojis removed platform-wide in favor of SVG icons.
  - `business-users/page.tsx` (Figma `35:968`) + `business-users/[id]/page.tsx` — role pills, status tags, associated-businesses table, audit trail.
  - `receptionists/page.tsx` — 4 KPI cards, multi-filter bar, Live Voice Test & Configuration modal.
  - `calls/page.tsx` (Figma `35:1501`) — 5 KPI cards, Active Call Inspection panel with audio playback + transcript.
  - `conversations/page.tsx` + `[id]` (Figma `35:1817`) — omnichannel filters, sentiment tags, tool-call logs, RAG traces.
  - `appointments/page.tsx` (Figma `35:2082`) + `[id]` — KPI cards, AI call recording, transcript, timeline notifications.
  - `customers/page.tsx` (Figma `35:2387`) — HIPAA/GDPR-masked records, audit drawer.
  - `services/page.tsx` (Figma `35:2628`) — template catalog, tool-binding inspector.
  - Full bidirectional cross-screen navigation across all of the above.

## Through 2026-09-09 11:02 (commit `9b747a4`, "heelo") — Additional admin modules
- New admin screens added (untracked until this session's commit): `admin-users`, `analytics`, `announcements`, `audit`, `billing`, `health`, `integrations`, `security`, `tickets`, `usage`, `verticals`.

## 2026-09-09 (this session) — MVP audit, P0 features, real backend
1. **Codebase + docs audit** — read the three `AMSh_*` research docs, the PRD, and the actual repo. Found the frontend was far ahead of the product: **no backend existed at all**, everything was hardcoded mock data. Wrote `DOCS/04_AMSh_MVP_Scope_and_Roadmap.md` (MVP feature checklist, what's real vs. mock, build order) and `DOCS/05_AMSh_Backend_API_Endpoints.md` (concrete endpoint plan mapped from the structure spec to the actual frontend).
2. **Branding fixed to Amsh** — `.agents/rules/project-context.md` says "Amsh", not "AuraHealth"/"Aira". Live `Sidebar.tsx` was already correct; `admin-users/page.tsx` mock data (`@aurahealth.ai` emails, "AuraHealth administrator" copy) was not — fixed.
3. **P0 missing-feature work** (from `DOCS/02_AMSh_Missing_Features.docx`):
   - Admin `calls/page.tsx`: `Live` outcome state (pulsing badge) + filter; **Take Over Call** button/flow; real multi-bar waveform audio player (replacing a fake progress bar) + download link; per-turn sentiment tags.
   - User `ai` page: previously-inert "Test AI" button now opens `TestPlaygroundModal.tsx` — scripted scenario playback (Book/Reschedule/Emergency/FAQ) with pass/fail checklist, **plus** a free-text chat mode and a simulated "Call Me" phone-call flow (dialing → connected → live transcript → end call). Explicitly labeled as a UI simulation — no real call/LLM behind it yet.
4. **Two pre-existing runtime bugs found and fixed** (unrelated to the above, discovered while wiring it):
   - `STRINGS.DASHBOARD.COMPONENTS` was mis-nested inside `HEADERS` — crashed most of `frontend/user`'s dashboard at runtime. Fixed the brace nesting.
   - 81 files imported `utils/strings/en` with one extra `../` than their actual depth — fixed every import.
   - (Found and fixed later the same day, after `DOCS/06` flagged them again): `AppointmentsTable.tsx` referenced `STRINGS.DASHBOARD_PANELS.APPOINTMENTS` (didn't exist — added `STRINGS.DASHBOARD.COMPONENTS.APPOINTMENTS_TABLE` and pointed the component at it) and `TopBar.tsx` referenced `STRINGS.PAGES` (didn't exist — added `STRINGS.PAGES.DASHBOARD.{GREETING,SUBTITLE}`). Both apps are now at **0 TypeScript errors**.
5. **Real backend built from scratch**, in `backend/` (repo root) — separate from the user's older, unrelated `AI Clinic Receptionist` project at `C:\Users\Parikshit\Desktop\workspace\AI Clinic Receptionist` (explicitly left alone, per user).
   - **Stack:** FastAPI + SQLAlchemy 2.0 + Postgres 16 + Redis 7, Dockerized (`docker-compose.yml`, `infrastructure/docker/api.Dockerfile`). Non-default host ports (Postgres 5434, Redis 6380, API 8010) to avoid clashing with the old project's still-running containers.
   - **Working and curl-verified:** `POST/GET /api/auth/*` (register/login/me — JWT + bcrypt), `POST/GET/PATCH /api/businesses*`, and a full **team-invite flow** (`backend/api/routes/users.py`): owner/admin invites a teammate (admin/manager/doctor/receptionist) → invite JWT returned (no email provider yet) → invitee calls `POST /api/auth/accept-invite` to set a password and auto-login → `GET /api/businesses/{id}/users` lists the roster. All permission edge cases tested (can't log in pre-accept, can't double-accept, non-owner/admin can't invite, can't invite as "owner").
   - Two packaging bugs hit and fixed: `pydantic[email]` extra wasn't declared (needed for `EmailStr`); `passlib[bcrypt]` pulled bcrypt 5.x, incompatible with passlib 1.7.4's backend detection (pinned `bcrypt==4.0.1`).
   - Swagger UI at `/docs` (ReDoc at `/redoc`), root `/` redirects there.
   - `.env`/`.env.example` set up at repo root with per-provider comments (Twilio, Groq, Deepgram, ElevenLabs, Cartesia) for the user to fill in real keys.
   - DB models: Business, User, Agent, Call, Message, Transaction, KnowledgeDocument, Integration, Usage, **PhoneNumber** (added same day, see next point).
   - Full spec directory skeleton scaffolded (`realtime/`, `engine/`, `speech/`, `llm/`, `rag/`, `memory/`, `tools/`, `verticals/`, `integrations/`, `billing/`, `analytics/`, `workers/`) — packages exist, no logic yet.
6. **AI phone number requirement flagged (user), made visible everywhere so it isn't forgotten:**
   - MVP plan: **call forwarding** (business keeps its existing number, forwards to a Twilio number provisioned for the AI); a dedicated AI number is a later upgrade.
   - DB model `backend/database/models/phone_number.py` (table `phone_numbers`) added; no API routes yet (planned as `phone_numbers.py`, `DOCS/05_AMSh_Backend_API_Endpoints.md` §4a).
   - Made visible in 5 UI spots (all mock, no backend wiring yet): `frontend/user` AI header chip + Call Handling tab (forwarding instructions + disabled "Request a Number"); `frontend/admin` Business Detail Overview tab, Integrations tab (Twilio SIP Trunk card), and Receptionists table ("AI Number" column).
7. **`DOCS/06_AMSh_Project_Status_Review.md` written** — an honest self-review: confirmed the two string bugs (now fixed, see #4), flagged that 78 files were uncommitted since "heelo", and laid out a recommended order (fix bugs → commit → decide next).
8. **Committed to a new branch** `wip/backend-and-mvp-updates` (not `main`) — one commit (`65a23ce`) covering the backend, the bug fixes, the phone-number UI, and the new docs. `main` untouched.

## 2026-09-09 (same session, cont'd) — Onboarding APIs built, curl-verified
Read `frontend/user/app/onboarding/*` (business, services, staff, hours, ai-receptionist, knowledge, integrations, review — all mock/hardcoded, no API calls) and built the backend to match, one route module per step:
- **`Business` model**: added `business_type` (default `"healthcare"`) + `business_subtype`, validated in `api/routes/businesses.py` via `BUSINESS_SUBTYPES` map — MVP allows only `healthcare` → `{hospital, clinic, medical_center}` (matches [[mvp-scope-healthcare-only]]). 422 on an invalid subtype, checked on both create and patch.
- **New models**: `Staff` (clinical roster entry — name/role/specialty/email/phone; deliberately separate from `User` login accounts, see docstring), `Service` (title/description/duration/price/staff_id FK). `KnowledgeDocument` extended with `source_url`/`question`/`answer` so one table covers all three Knowledge-step sections via `doc_type` (`document`/`website`/`faq`).
- **New route modules**, all under `/api/businesses/{business_id}/...`, registered in `api/router.py`: `services.py`, `staff.py`, `agents.py` (AI Receptionist config — personality/capabilities/transfer_phone/escalation all live in `Agent.config` JSON), `knowledge.py` (validates required fields per `doc_type`, 422 otherwise). Hours step needs no new route — reuses existing `PATCH /api/businesses/{id}` `working_hours` field. `integrations.py` added (`/connect`, `/disconnect`) — no real provider OAuth, just records intent (Twilio/Google keys still not supplied).
- **Refactored**: pulled the `_get_business_or_404`/`_require_membership`/`_require_owner_or_admin` helpers (previously duplicated in `users.py`) into a shared `api/routes/_shared.py`, used by all 5 business-scoped route modules now.
- **Curl-verified end-to-end** against the running `saas-api-1` container: register → create business (with subtype validation, incl. 422 on bad subtype) → create staff → create service (linked to staff_id) → create agent → create knowledge (faq + website, 422 on doc missing filename) → connect integration → PATCH working_hours → GET business roundtrip. All passed.
- **Dev-DB caveat (no Alembic, just `Base.metadata.create_all` on startup — see `main.py`)**: `create_all` only creates *missing* tables, it doesn't alter existing ones. `businesses` and `knowledge_documents` already existed from before this session, so their new columns had to be added by hand: `ALTER TABLE businesses ADD COLUMN business_type/business_subtype`, `ALTER TABLE knowledge_documents ADD COLUMN source_url/question/answer` + dropped the old NOT NULL on `filename`. `staff`/`services` are brand-new tables so `create_all` made them correctly. **If this DB is ever reset/recreated fresh, this manual step becomes unnecessary** — `create_all` will build the tables with the columns already in the model files.

## 2026-09-18 — UI Compaction & Architecture Modularization (4-Pillar Alignment)
1. **Frontend UI Standardized & Compacted Platform-Wide**:
   - Fixed oversized UI across all 20+ screens in `frontend/admin`:
     - Container padding unified to `p-4 sm:p-5`.
     - Massive titles (`text-[40px]`, `text-[28px]`, `text-[24px]`) brought to standard `text-lg font-bold text-[#0F172A]`.
     - KPI stat cards reduced to sleek `p-2.5 sm:p-3 rounded-lg shadow-2xs` with `text-base font-bold` values.
     - Table rows reduced to crisp `px-3.5 py-2 text-xs text-[#0F172A]`.
     - Fixed JSX syntax tag bugs in `services/page.tsx` (unclosed `</header>`) and `customers/page.tsx` (broken opening `<td ...>` in actions column).
2. **Architecture Evolution Plan Formulated (4 Logical Pillars)**:
   - Clarified the progressive roadmap from unified monorepo to independent multi-repo deployment:
     - `amsh-frontend`: Customer/tenant portal (Dashboard, appointments, call logs, staff, settings).
     - `amsh-admin`: Internal operator control panel (Tenants, usage, billing, audit, system health).
     - `amsh-backend`: Business server API (PostgreSQL, auth, CRUD, stripe, webhook triggers).
     - `amsh-ai`: Low-latency conversational engine (Twilio media stream, Deepgram STT, Groq LLM, ElevenLabs TTS, state machine, Redis session memory, RAG).
     - `infrastructure`: Docker Compose, Redis, Postgres, Qdrant/Chroma vector store, K8s configs.
   - Updated documentation in `.brain/overview.md`, `ai generated docs/architecture_overview.md`, `DOCS/AI_Receptionist_Project_Structure_Spec.md`, and created `DOCS/09_AMSh_Architecture_and_Repo_Evolution.md`.

3. **Backend Separation Completed (`backend/server` & `backend/ai`)**:
   - Cleanly decoupled the backend into two distinct logical packages matching Pillars 3 & 4:
     - `backend/server/`: Core Business Server & API (FastAPI routes, auth JWT/bcrypt, SQLAlchemy models, database session, billing, workers, analytics, integrations, common config & warmup).
     - `backend/ai/`: Voice & AI Intelligence Engine (deterministic state machine, realtime audio streaming/Twilio/VAD, STT/TTS, LLM providers, tenant-isolated RAG, memory, tools registry, vertical config loader).
   - Migrated all database models (`Agent`, `Business`, `Call`, `Integration`, `KnowledgeDocument`, `Message`, `PhoneNumber`, `Service`, `Staff`, `Transaction`, `Usage`, `User`) to `backend.server.database.models`.
   - Migrated all API route handlers (`agents`, `auth`, `businesses`, `integrations`, `knowledge`, `services`, `staff`, `users`) to `backend.server.api.routes`.
   - Updated `backend/main.py` to bootstrap from `backend.server.*` and `backend.ai.*`.
   - Established transparent backward-compatibility proxies at root `backend/` (`backend.database`, `backend.api`, `backend.auth`, `backend.common`).

4. **Root Folder Cleanup & AI Engine Implemented**:
   - Deleted all 16 legacy redundant folders from `backend/` root (`analytics`, `api`, `auth`, `billing`, `common`, `database`, `engine`, `integrations`, `llm`, `memory`, `rag`, `realtime`, `speech`, `tools`, `verticals`, `workers`).
   - Built the full AMSh AI Conversation Engine (Pillar 4):
     - `backend/ai/verticals/`: Dynamic YAML configuration system (`schemas.py`, `loader.py`, `registry.py`, `configs/clinic.yaml`, `configs/restaurant.yaml`).
     - `backend/ai/tools/`: Tool framework & registry (`framework/base.py`, `framework/registry.py`), common tools (`transfer_call.py`, `hangup.py`, `send_sms.py`), and clinic tools (`check_availability.py`, `book_appointment.py`).
     - `backend/ai/engine/`: Deterministic state machine (`conversation/state_machine.py`, `states.py`, `turn.py`, `context.py`), zero-latency emergency safety guardrail (`guardrails/safety.py`), and PII redaction (`guardrails/pii.py`).
     - `backend/ai/memory/`: Session memory tracking (`session_memory.py`).
     - `backend/ai/speech/`: STT & TTS streaming adapters with filler audio cache (`stt/deepgram.py`, `tts/elevenlabs.py`, `tts/filler_audio_cache.py`).
     - `backend/ai/realtime/`: Twilio Media Stream WebSocket gateway & VAD (`vad/detector.py`, `twilio/gateway.py`, `/api/voice/simulate` endpoint).
   - Fully verified live against running PostgreSQL:
     - Tested 4-turn appointment booking conversation via `/api/voice/simulate` -> slots collected -> `book_appointment` tool executed -> transaction confirmed into Postgres `transactions` table.
     - Tested emergency safety guardrail -> "chest pain" immediately escalated to emergency with zero latency.
     - Tested restaurant vertical dynamic loading -> multi-vertical support proven without modifying core engine code.

5. **Admin Routing Architecture Segregated (`/api/admin`)**:
   - Scaffolded a dedicated router `backend/server/api/routes/admin.py` mounted at `/api/admin` in `backend/server/api/router.py`.
   - Documented the planned surface (`/api/admin/auth`, `/api/admin/users`, `/api/admin/tenants`, `/api/admin/system`) in `.brain/overview.md`.
   - Actual implementation of admin APIs scheduled for the Admin phase; active development focuses on User/Tenant flows first.

6. **Telephony Ingestion & Call Transfer Architecture Documented**:
   - Designed dual-path telephony strategy: Dedicated Twilio number provisioning vs. Existing clinic number carrier call forwarding (`*72`/`*71` with `From` and `ForwardedFrom` header preservation).
   - Specified **Flaw 4: Human Doctor/Staff Call Transfer Engine**:
     - **Cold Transfer (MVP Core)**: TwiML `<Dial timeout="20" action="/api/voice/transfer-status">` with 20s timeout.
     - **Zero Dropped Calls 20s Fallback**: If doctor is busy/unanswered after 20s, AI resumes gracefully: *"Dr. Sarah is currently with a patient, I have marked this as high priority and she will call you back at this number in 10 minutes."*
     - Automatic P0 emergency ticket created in DB + immediate high-priority SMS alert dispatched to doctor.
     - **Warm Transfer (Optional / Phase 2)**: Maintained as a configurable option (whisper briefing + IVR bridge) without overloading MVP.
     - Browser WebRTC "Try It Yourself" test console for self-serve onboarding.
   - Created detailed architecture documents in `DOCS/11_AMSh_Telephony_Call_Transfer_and_Forwarding.md` and `ai generated docs/telephony_and_call_transfer.md`.

## Current & Next Steps
- Onboarding, Telephony blueprints, and backend separation are 100% complete and documented.
- Next priority: Build User/Tenant APIs according to user journey (Dashboard metrics, Appointments/Transactions, Call logs, Patients).

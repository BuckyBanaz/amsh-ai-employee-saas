# AMSh: AI Receptionist for Clinics

A multi-tenant SaaS where a clinic signs up, sets up its business and an AI receptionist, and the AI answers its phone calls
(and WhatsApp chats) around the clock: it books, cancels and reschedules appointments, answers questions from the clinic's
own facts and documents, speaks Hindi / Hinglish / English, and hands over to a human when needed. Healthcare only for the
MVP (clinics, medical centers, hospitals); other verticals come later.

> **Status in one line:** the voice / AI engine, calls, recordings, the AI Studio and WhatsApp chat are built and unit-tested;
> the tenant dashboard is partly real and partly static; the **admin portal is still a design mock** (see
> [Status](#status)). Full detail: [`DOCS/README.md`](DOCS/README.md).

---

## What is in this repo

| Path | What it is |
|---|---|
| `backend/server` | FastAPI API: auth, businesses, agents, staff, services, appointments, calls, knowledge, billing (Razorpay), integrations, admin |
| `backend/ai` | Voice / AI engine: LLM agent with tools and guards, STT (Deepgram), TTS (Cartesia), telephony gateways (Twilio, Exotel), RAG, evals |
| `backend/migrations` | Alembic database migrations |
| `frontend/user` | Tenant dashboard and onboarding wizard (Next.js) |
| `frontend/admin` | Platform admin portal (Next.js), UI only for now |
| `DOCS` | Architecture, pipelines and flowcharts, status, plan, change log |
| `docker-compose.yml` | api, postgres, redis, ngrok (public URL for phone provider webhooks) |
| `my-figma-plugin`, `services`, `infrastructure`, `fix`, `scratch` | side projects, Dockerfiles and scratch files |

---

## How it works (short)

```
Caller (phone) -> Exotel / Twilio -> WebSocket -> Deepgram STT -> AI agent (LLM + tools + guards) -> Cartesia TTS -> caller
Patient (WhatsApp) -> Meta webhook -> same AI agent (text) -> Graph API reply
Owner (dashboard) -> /ai playground -> same agent, in the browser
```

The agent (`backend/ai/engine/agent`) lets an LLM write the replies and call tools (check availability, book, look up, cancel,
reschedule, search knowledge, transfer, end call), while Python code enforces the rules: read-back confirmation, booking
values must come from the caller, no invented times, safety and escalation gates. Groq models are tried first with Gemini as
fallback. Diagrams of every pipeline are in [`DOCS/README.md`](DOCS/README.md).

---

## Run it locally

Requirements: Docker, Node 20+, Python 3.12+ (only for running tests outside Docker).

```bash
# 1. Configure
cp .env.example .env          # then fill in the keys you have (see "Keys" below)

# 2. Start the backend (api, postgres, redis, ngrok)
docker compose up -d
docker compose logs -f api    # API: http://localhost:8010  (docs at /docs, health at /health)

# 3. Start the tenant dashboard
cd frontend/user
npm install
npm run dev                   # https://localhost:3000

# 4. Admin portal (optional; UI mock). Use another port: the dashboard already uses 3000
cd frontend/admin
npm install
npm run dev -- -p 3001
```

Ports: api `8010`, postgres `5434`, redis `6380`, ngrok inspector `4040`.

Good to know:
- `./backend` is mounted into the api container and uvicorn runs with `--reload`: **saving a backend file restarts the API and
  drops in-memory call sessions** (calls resume from the saved transcript, but avoid saving while someone is testing).
- Docker reads `.env` only when the container is created. After changing keys:
  `docker compose stop api && docker compose up -d --no-deps --force-recreate api`.
- The database schema is migrated automatically at startup (Alembic). Databases created before Alembic are stamped and
  upgraded without losing data.
- Recordings of browser test calls are stored in `backend/data/recordings` (git-ignored).

### Keys (`.env`)

Nothing works end to end without some of these; the app starts without them and features degrade.

| Key | Used for |
|---|---|
| `GROQ_API_KEY`, `GEMINI_API_KEY`, `LLM_PROVIDERS` | the AI agent (Groq free tier is rate limited; a paid tier is recommended) |
| `DEEPGRAM_API_KEY` | speech-to-text on phone calls (and the playground relay) |
| `CARTESIA_API_KEY` | text-to-speech (credits are billed per character) |
| `TWILIO_*`, `EXOTEL_*` | phone numbers and SMS |
| `META_APP_ID`, `META_APP_SECRET`, `META_WHATSAPP_VERIFY_TOKEN` | WhatsApp (the secret also verifies webhook signatures) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL` | email (password reset, verification). Without a key the link is only printed in the API log |
| `CONVERSATION_ENGINE` | `state_machine` (old templates), `shadow`, or `llm_agent` |
| `ALLOW_DEV_FALLBACKS` | development helpers that are unsafe with several customers; set `false` in production |

Never paste keys into chats, tickets or terminals. If one was printed anywhere, rotate it.

### First platform admin

```bash
docker compose exec api python -m backend.scripts.create_platform_admin you@example.com --name "Your Name"
```

It asks for a password (12+ characters). This account signs in at `POST /api/admin/auth/login`.

---

## Tests and checks

```bash
# Backend and AI: 190 deterministic tests, no network needed (fake model, in-memory database)
python -m unittest backend.ai.evals.test_agent_core

# Frontend type check
cd frontend/user && npx tsc --noEmit -p .

# Live evaluation of the agent against real models (spends Groq quota; run sparingly)
python -m backend.ai.evals.runner
```

New database change: generate a migration against a scratch database, review it, commit it:
`cd backend && DATABASE_URL=sqlite:///scratch.db python -m alembic -c alembic.ini revision --autogenerate -m "what changed"`.

---

## Status

Honest summary (updated 2026-09-28). "Tested" means unit tests; many parts have **not** been clicked through in a browser or
tried on a real phone call.

| Area | State |
|---|---|
| AI agent, guards, Hindi handling, emotion and laughter, session resume | built, tested |
| Voice interrupt, call recording and playback, `/calls` (Test-call and WhatsApp labels) | built, tested (backend); not tried live |
| WhatsApp AI chat | built, tested with fakes; **not tried with a real number** |
| Auth: login, register, reset / change password, email verification, audit log, lockout | built (backend, tested); some pages not wired |
| Tenant dashboard: AI Studio, calls, appointments, doctors, knowledge | wired |
| Tenant dashboard: team, billing, integrations, conversations, notifications, analytics, most settings | **static UI** |
| Admin portal | **25 pages, mock UI, no API** (backend has only admin login) |
| Phone webhooks (Exotel, Twilio) | written earlier, not re-verified live |

What is left, in order: see [`DOCS/18_AMSh_Completion_Plan_User_and_Admin.md`](DOCS/18_AMSh_Completion_Plan_User_and_Admin.md) and
section 9 of [`DOCS/README.md`](DOCS/README.md).

---

## Documentation map

| Read this | For |
|---|---|
| [`DOCS/README.md`](DOCS/README.md) | architecture, call and WhatsApp pipelines, flowcharts, per-module status, pending list, ideas |
| [`DOCS/18_AMSh_Completion_Plan_User_and_Admin.md`](DOCS/18_AMSh_Completion_Plan_User_and_Admin.md) | phased plan to finish the user app and the admin portal |
| [`DOCS/17_AMSh_Claude_Change_Tracker.md`](DOCS/17_AMSh_Claude_Change_Tracker.md) | every change with what was and was not verified |
| [`DOCS/16_AMSh_LLM_Agent_Tool_Calling_Architecture_Plan.md`](DOCS/16_AMSh_LLM_Agent_Tool_Calling_Architecture_Plan.md) | agent design |
| [`DOCS/flowcharts`](DOCS/flowcharts) | login, onboarding, integrations flows |
| `CLAUDE.md`, `frontend/*/AGENTS.md` | rules for AI coding assistants working in this repo |

Older specs and roadmaps in `DOCS` are history; the roadmap file is marked superseded.

# AMSh Architecture & Repository Evolution Blueprint

> **Strategic Architecture Guide:** How the AMSh SaaS platform transitions smoothly from a high-velocity **Monorepo** to a decoupled **4-Repository Microservices Architecture** without premature operational overhead.

---

## 1. Context & Motivation

In modern AI voice SaaS development, architecture can become unmanageable if responsibilities are entangled. The platform must balance two opposing needs:
1. **Developer Velocity Today:** Instant cross-cutting edits between frontend screens, backend APIs, and conversational schemas.
2. **System Scalability Tomorrow:** Independent auto-scaling of high-concurrency telephony WebSocket audio streams versus standard database CRUD APIs.

Currently, **AMSh** has cleanly segregated the user frontend (`frontend/user`) and admin frontend (`frontend/admin`). In the backend (`backend/`), all components are co-located in a single Python package.

This document formalizes the **4-Pillar Model** of AMSh and lays out the exact directory mapping, interface contracts, and transition triggers.

---

## 2. The 4-Pillar Responsibility Matrix

```
                                  ┌────────────────────────┐
                                  │   Caller Phone Network │
                                  └───────────┬────────────┘
                                              │ Inbound SIP / PSTN
                                              ▼
┌────────────────────────┐        ┌────────────────────────┐        ┌────────────────────────┐
│     amsh-frontend      │        │     Twilio Gateway     │        │       amsh-admin       │
│  (Customer Dashboard)  │        └───────────┬────────────┘        │    (Operator Portal)   │
└───────────┬────────────┘                    │ Media Stream WS     └───────────┬────────────┘
            │ HTTPS / REST                    ▼                                 │ HTTPS / REST
            │                     ┌────────────────────────┐                    │
            │                     │        amsh-ai         │                    │
            │                     │  (Voice & AI Engine)   │                    │
            │                     └───────────┬────────────┘                    │
            │                                 │ gRPC / Internal REST / Redis    │
            ▼                                 ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       amsh-backend                                         │
│                      (Core Business Server, Auth, Database, Billing)                       │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Pillar | Service / Repo Name | Responsibility | AMSh Real-World Example | Monorepo Path |
|---|---|---|---|---|
| **1** | `amsh-frontend` | Customer-facing app for clinic/business owners | Dentist logs in → views today's 17 appointments → inspects 8 calls handled by AI → updates clinic working hours. | `frontend/user/` |
| **2** | `amsh-admin` | Internal management panel for AMSh operations | AMSh engineer views 4,238 minutes consumed by Clinic XYZ → inspects live call waveform → adjusts vertical YAML template. | `frontend/admin/` |
| **3** | `amsh-backend` | Core business logic server & data persistence | Auth JWT verification, PostgreSQL storage, Stripe subscription webhooks, Staff CRUD, Appointment slot validation. | `backend/` (`api/`, `auth/`, `database/`, `billing/`, `workers/`) |
| **4** | `amsh-ai` | Low-latency voice & conversational intelligence | Twilio WebSocket audio stream → Deepgram STT (stream) → Groq LLM (state machine) → ElevenLabs TTS (audio chunks) → Barge-in. | `backend/` (`engine/`, `realtime/`, `speech/`, `llm/`, `rag/`, `memory/`, `tools/`, `verticals/`) |
| **Platform** | `infrastructure` | Containers, databases, networking & CI/CD | Docker Compose, PostgreSQL 16, Redis 7, Vector DB (Qdrant/Chroma), Caddy reverse proxy, environment secrets. | `infrastructure/` + root configs |

---

## 3. Deep Dive into Each Pillar

### 3.1 Pillar 1: `amsh-frontend` (Customer Portal)
* **Technology:** Next.js 15+ (App Router), React 19, Tailwind CSS v4.
* **Key Modules:**
  - `app/dashboard/`: Daily business metrics, appointment schedules, live call feed.
  - `app/appointments/`: Full interactive calendar, patient slot booking, attendance status.
  - `app/conversations/`: Call recordings player, sentiment tags, transcripts, WhatsApp dialogues.
  - `app/contacts/`: CRM database of patients/customers with visit history.
  - `app/ai/`: Voice Receptionist personality, tone, prompt overrides, and Interactive Testing Playground.
  - `app/onboarding/`: 7-step guided setup (Business, Services, Staff, Hours, AI, Knowledge, Integrations).
* **Communication:** Consumes `amsh-backend` via REST (`/api/businesses/{id}/...`).

### 3.2 Pillar 2: `amsh-admin` (Internal Platform Operations)
* **Technology:** Next.js 15+ (App Router), Tailwind CSS v4, High-Density Compact Design System (`shadow-2xs`, `text-xs`, `p-4 sm:p-5`).
* **Key Modules:**
  - `businesses/`: Multi-tenant registry, 11-tab business inspector, tier quotas.
  - `business-users/`: Tenant administrative accounts and role permissions.
  - `receptionists/`: Global AI receptionist fleet status and live voice configuration testing.
  - `calls/` & `conversations/`: Live call observation, waveform visualizer, manual operator takeover.
  - `usage/` & `billing/`: Twilio minutes, Deepgram hours, Groq tokens, Stripe MRR tracking.
  - `verticals/`: Dynamic YAML/JSON vertical templates and tool mappings.
  - `security/` & `audit/`: Threat detection, rate limiting, and HIPAA/GDPR immutable audit trails.
* **Communication:** Consumes `amsh-backend` via operator-authenticated REST (`/api/admin/...`).

### 3.3 Pillar 3: `amsh-backend` (Core Business Server)
* **Technology:** Python 3.11+, FastAPI, SQLAlchemy 2.0, PostgreSQL 16, Alembic, Celery / Background Workers.
* **Key Modules:**
  - `auth/`: User registration, email verification, team invites, JWT token issuance.
  - `database/`: Relational schema models (`Business`, `User`, `Staff`, `Service`, `Appointment`, `Transaction`, `PhoneNumber`).
  - `api/routes/`: REST endpoints for business operations, rosters, calendars, and configurations.
  - `billing/`: Stripe billing portal, plan enforcement, usage-based invoicing calculation.
  - `integrations/`: Outbound webhooks and sync adapters for Google Calendar, Outlook, and CRMs.
  - `workers/`: Background task execution (nightly report generation, SMS confirmation triggers).
* **Boundary Principle:** Does **not** handle raw telephony audio packets or direct WebSocket voice streams. It provides structured JSON APIs and manages persistent state.

### 3.4 Pillar 4: `amsh-ai` (Voice Intelligence Layer)
* **Technology:** Python (AsyncIO), WebSockets, NumPy/Audio processing, Deepgram SDK, Groq SDK, ElevenLabs SDK, Qdrant/Chroma Client, Redis (Ephemeral Cache).
* **Key Modules:**
  - `realtime/`: Twilio bi-directional WebSocket handler, media stream audio decoder (`mulaw` 8kHz to PCM 16kHz).
  - `speech/stt/`: Deepgram Nova-2 streaming client with real-time speech event callbacks.
  - `speech/tts/`: ElevenLabs / Cartesia streaming audio chunk generation.
  - `engine/`: **Deterministic State Machine** orchestrating dialogue turns, slot extraction, and business logic verification.
  - `llm/`: Groq Llama-3.3-70B model connector with custom system prompt templating.
  - `rag/`: Vector search pipeline extracting context chunks from tenant-isolated documents.
  - `memory/`: Redis short-term conversation state (dialogue history, collected variables, VAD status).
  - `tools/`: Executable function bindings (`check_calendar_slot`, `create_appointment`).
* **Boundary Principle:** Designed for sub-800ms end-to-end voice latency. It communicates with `amsh-backend` via internal API calls only when business persistence is needed (e.g. creating a finalized appointment).

---

## 4. Current State vs. Future Extraction Roadmap

### Phase 1: Current Monorepo (Active)
All code resides in `saas/`:
```
saas/
├── frontend/
│   ├── user/              --> (Pillar 1: amsh-frontend)
│   └── admin/             --> (Pillar 2: amsh-admin)
├── backend/
│   ├── [Business API]     --> (Pillar 3: amsh-backend: api, auth, database, billing)
│   └── [AI Voice Engine]  --> (Pillar 4: amsh-ai: engine, realtime, speech, llm, rag, tools)
├── infrastructure/        --> (Platform: docker-compose, configs)
└── DOCS/                  --> (Living specifications)
```
* **Status:** 1 Git repository, single CI pipeline, zero network latency between internal Python services.

### Phase 2: Internal Package Decoupling (Near-Term)
Inside `backend/`, explicitly decouple the business server from the voice runtime:
```
backend/
├── app_server/            --> (Core Business Server: FastAPI HTTP REST)
│   ├── api/
│   ├── auth/
│   ├── database/
│   └── billing/
│
├── ai_voice_runtime/      --> (Streaming Voice Daemon: WebSocket + Audio Engine)
│   ├── stream_gateway/
│   ├── state_machine/
│   ├── speech/
│   ├── rag/
│   └── llm/
```
* Communication between `ai_voice_runtime` and `app_server` occurs via clean internal Python service clients or Redis Pub/Sub, preparing for physical separation.

### Phase 3: Standalone 4-Repository Deployment (Scale Trigger)
When the team grows beyond 5-8 engineers or voice streaming requires dedicated Kubernetes GPU/Audio worker nodes:
```
GitHub Organization: AMSh
│
├── amsh-frontend          (Deployed on Vercel / Cloudflare Pages)
├── amsh-admin             (Deployed on Internal VPC / Vercel with IP Allowlist)
├── amsh-backend           (Deployed on AWS ECS / Google Cloud Run - Auto-scaled on CPU)
├── amsh-ai                (Deployed on High-Bandwidth WebSocket Node Cluster - Auto-scaled on Active Voice Streams)
└── amsh-infra             (Terraform, Helm charts, Docker base images)
```

---

## 5. Architectural Guardrails
1. **Never Call External DB Directly from AI Realtime Loop:** The `amsh-ai` streaming audio loop must never execute heavy, unindexed database queries while on an active call. It reads pre-cached business parameters from Redis and calls `amsh-backend` asynchronously.
2. **Deterministic Rules Over Generative Ambiguity:** Voice tool execution (booking slots, pricing quotes) is always enforced by Python state rules, never left to LLM imagination.
3. **Multi-Tenant Isolation:** Knowledge vectors, memory keys, and database queries are strictly prefixed with `tenant_id` (`business_id`).

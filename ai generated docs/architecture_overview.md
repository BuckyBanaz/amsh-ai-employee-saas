# AI Receptionist Platform — Architecture Overview

## Core Principles
1. **Vertical-Agnostic Engine:** The core platform logic is completely generic. It does not contain any business-specific logic (e.g., no `if businessType == "clinic"`).
2. **Configuration-Driven:** All vertical-specific behavior (e.g., clinic vs. restaurant) is driven by configuration files (YAML/JSON).

## System Components

### 1. Backend Conversation Engine
*   **Framework:** Python + FastAPI.
*   **Voice/Media Gateway:** Twilio (handling WebSocket media streams).
*   **Speech-to-Text (STT):** Deepgram / Groq Whisper for low-latency transcription.
*   **LLM Inference:** Groq LLM for fast text generation.
*   **Text-to-Speech (TTS):** ElevenLabs / Cartesia.
*   **Core Logic:** Uses a **deterministic state machine** to govern call flow, preventing the LLM from hallucinating conversational states. Field validation and tool routing are handled strictly via Python code.
*   **Memory & Storage:**
    *   Redis: Short-term conversational state memory.
    *   PostgreSQL: Persistent caller history and business data.
    *   Vector DB: Used for Knowledge Base/RAG, isolated per business.
*   **Features:** Barge-in support (VAD-based interruption).

### 2. Frontend Dashboard
*   **Architecture:** Generic Business Dashboard.
*   **Capability System:** Features are toggled based on the backend config (e.g., `has_appointments`, `has_menu`).
*   **Dynamic Terminology:** Core resources like 'Customer' or 'Service' are dynamically labeled based on the vertical config (e.g., Customer -> Patient for Clinics).

### 3. Security & Guardrails
*   PII Masking in logs.
*   Multi-tenant data isolation.
*   Automatic human handoff for out-of-scope queries.

---

## 4. The 4-Pillar Model & Repository Evolution

As the **AMSh** platform matures, its architecture is partitioned into four clear logical pillars (each representing a distinct functional boundary and future independent repository):

| Pillar | Service / Repo Name | Core Responsibility | Current Monorepo Location |
| :--- | :--- | :--- | :--- |
| **Pillar 1** | `amsh-frontend` | Customer/Business Owner Dashboard (Appointments, Conversations, CRM, Staff, AI Settings, Integrations) | `frontend/user/` |
| **Pillar 2** | `amsh-admin` | Platform Internal Operations Panel (Tenant Management, Billing Oversight, Telephony Usage, Active Call Monitoring, System Health) | `frontend/admin/` |
| **Pillar 3** | `amsh-backend` | Core Server & Business Logic (Auth, PostgreSQL DB, Stripe Billing, Appointments CRUD, Roster, Webhooks, Celery Workers) | `backend/` (`api/`, `auth/`, `database/`, `billing/`, `workers/`) |
| **Pillar 4** | `amsh-ai` | AI Voice Intelligence Engine (Twilio Media Streams, Deepgram STT, Groq LLM, ElevenLabs TTS, Deterministic State Machine, Vector RAG) | `backend/` (`engine/`, `realtime/`, `speech/`, `llm/`, `rag/`, `memory/`, `tools/`, `verticals/`) |
| **Platform** | `infrastructure` | Multi-environment provisioning (Docker Compose, Redis, Postgres, Qdrant/Chroma, Twilio Webhooks, Nginx/Traefik) | `infrastructure/` + `docker-compose.yml` |

---

## 2. Pillar Deep-Dive

### 2.1 Pillar 1: `amsh-frontend` (Customer-Facing App)
* **Target Audience:** Clinic owners, dental practice managers, restaurant operators, gym owners.
* **Key Functionality:**
  - Onboarding flow (Business Profile, Services, Clinical Roster, Operating Hours, AI Receptionist setup, Knowledge Base upload).
  - Daily operations dashboard: Today's appointments, real-time call logs, patient/customer directory.
  - Interactive AI Playground: Simulate calls and test conversational responses before going live.
  - Multi-vertical capability adaptation: UI hides/shows modules dynamically based on backend capability flags.

### 2.2 Pillar 2: `amsh-admin` (Internal Superadmin Panel)
* **Target Audience:** AMSh core team, DevOps, platform support engineers, account managers.
* **Key Functionality:**
  - Global tenant control: Provision, suspend, and configure business accounts.
  - Telephony and compute audit: Monitor Twilio minute consumption, Deepgram STT audio hours, Groq token usage, and ElevenLabs character counts.
  - Live call observation: Real-time audio waveform player, call intervention ("Take Over Call" emergency fallback), and turn-by-turn dialogue inspection.
  - Industry vertical templates: Blueprint editor for YAML configs (intents, required slots, tool bindings).
  - High-density compact interface designed for rapid operator workflows.

### 2.3 Pillar 3: `amsh-backend` (Main Business Server & API)
* **Target Audience:** Serves both `amsh-frontend` and `amsh-admin` via secure REST and WebSockets.
* **Core Responsibilities:**
  - User Authentication & RBAC (JWT, bcrypt, invite tokens, multi-tenant permissions).
  - Business Persistence & Relational Schema (PostgreSQL via SQLAlchemy 2.0).
  - Transactional CRUD: Appointments booking calendar, staff availability slots, services catalog, and customer contact records.
  - Billing & Subscription Lifecycle: Stripe checkout, recurring SaaS subscriptions, per-minute overage calculations.
  - Integrations Gateway: Webhooks and OAuth integrations with Google Calendar, Practice Better, Clio, WhatsApp Business, and POS systems.

### 2.4 Pillar 4: `amsh-ai` (Voice & Conversational Intelligence Layer)
* **Target Audience:** Real-time telephony streams initiated by Twilio incoming calls or outbound confirmation calls.
* **Core Responsibilities:**
  - **Real-Time Voice Streaming:** Twilio Bi-directional WebSocket Media Stream (`backend/realtime/`).
  - **Speech-to-Text (STT):** Deepgram Nova-2 / Groq Whisper streaming client with Voice Activity Detection (VAD).
  - **Conversational State Machine:** Deterministic Python state engine (`backend/engine/`) ensuring strict field validation, no hallucinations, and latency under 800ms.
  - **LLM Fast Inference:** Groq Llama-3.3-70B-Versatile adapter with streaming tokens.
  - **Text-to-Speech (TTS):** ElevenLabs / Cartesia low-latency audio chunk streaming back over WebSocket.
  - **Barge-in / Interruption Handler:** Instantly silences AI playback when caller starts speaking.
  - **RAG & Knowledge Base:** Vector similarity search (isolated per tenant namespace) for answering clinic policies, doctor bios, and FAQ.
  - **Tool Calling:** Deterministic function execution (`check_doctor_availability`, `book_appointment_slot`, `transfer_to_human`).

---

## 3. Current Monorepo Layout vs. Multi-Repo Evolution

```
CURRENT REPO (Monorepo)                 FUTURE TARGET (GitHub Org: AMSh)
=====================================   ==================================================
amsh-ai-employee-saas/                  github.com/AMSh/
├── frontend/                           ├── amsh-frontend (Next.js / Tailwind v4)
│   ├── user/    =====================> │   └── Customer Dashboard & Client Portal
│   └── admin/   =====================> ├── amsh-admin (Next.js / Tailwind v4)
│                                       │   └── Internal Platform Operations
├── backend/                            ├── amsh-backend (Python / FastAPI / Postgres)
│   ├── api/     =====================> │   ├── REST API & Auth
│   ├── auth/    =====================> │   ├── Database & Models (SQLAlchemy)
│   ├── database/=====================> │   ├── Billing & Subscriptions
│   ├── billing/ =====================> │   └── Webhooks & Integrations
│   │
│   ├── realtime/=====================> ├── amsh-ai (Python / Audio Streaming / LLM)
│   ├── engine/  =====================> │   ├── Twilio WebSocket Media Gateway
│   ├── speech/  =====================> │   ├── STT (Deepgram) & TTS (ElevenLabs)
│   ├── llm/     =====================> │   ├── Groq LLM Inference & State Machine
│   ├── rag/     =====================> │   ├── Isolated Tenant Vector RAG
│   └── tools/   =====================> │   └── Dynamic Tool Dispatcher
│
└── infrastructure/ ==================> └── amsh-infra (Terraform / K8s / Docker / Caddy)
```

### Why Stay in a Monorepo Now?
1. **Zero Multi-Repo Overhead:** Fast atomic commits across frontend views and backend route contracts.
2. **Simplified Local Development:** One `docker-compose up` spins up Postgres, Redis, and API services simultaneously.
3. **Internal Code Reuse:** Shared Pydantic models, TypeScript interfaces, and configuration schemas without private NPM/PyPI registries.

### When to Split into 4 Separate Repositories?
1. **Team Specialization:** When voice AI engineers work exclusively on streaming audio latency while product engineers build CRM UI.
2. **Independent Scaling:** When `amsh-ai` requires GPU/high-compute WebSocket pods, while `amsh-backend` scales on standard CPU clusters.
3. **Deployment Cadence:** When the frontend needs 10 deployments/day without touching telephony runtime pods.


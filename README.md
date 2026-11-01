# AMSh: Autonomous 24/7 AI Employee SaaS

**AMSh** is an autonomous AI front-desk employee platform for **Healthcare Clinics, Educational Institutions, Hair & Beauty Salons, and Luxury Spas**. 

A business signs up, selects its industry vertical, configures its services, staff, and operating hours, and deploys an intelligent AI receptionist that answers phone calls and WhatsApp inquiries around the clock:
- **Books, reschedules, and cancels appointments** directly into the business calendar or EHR.
- **Answers questions** accurately using the business's own verified documents (RAG Knowledge Base).
- **Multi-lingual & Natural Voice**: Real-time ultra-low latency voice with Deepgram STT, Groq LLM, and Cartesia TTS, featuring native speech interruption (barge-in).
- **Deterministic Safeguards**: Emergency medical triage, strict read-back confirmation, and warm transfers to human staff.

> **Status in one line:** The voice/AI conversation engine, multi-vertical workflow definitions, call recording, AI Studio, and WhatsApp chat are built and unit-tested. Full details: [`DOCS/README.md`](DOCS/README.md) and [`DOCS/34_AMSh_Vertical_Flowcharts_Visual_Guide.md`](DOCS/34_AMSh_Vertical_Flowcharts_Visual_Guide.md).

---

## What is in this repo

| Path | What it is |
|---|---|
| `backend/server` | FastAPI API: auth, businesses, agents, staff, services, appointments, calls, knowledge, billing, integrations, admin |
| `backend/ai` | Voice / AI engine: LLM agent with tools and guards, STT (Deepgram), TTS (Cartesia), telephony gateways (Twilio, Plivo, Exotel), RAG, evals |
| `backend/migrations` | Alembic database migrations |
| `frontend/landing-page` | Public marketing site with multi-currency ROI calculator and persona demos (Next.js) |
| `frontend/user` | Tenant dashboard and dynamic vertical onboarding wizard (Next.js) |
| `frontend/admin` | Platform admin portal (Next.js) |
| `DOCS` | Architecture, multi-vertical flowcharts, visual infographic guides, latency strategy, change log |
| `docker-compose.yml` | api, postgres, redis, ngrok (public URL for phone provider webhooks) |

---

## Multi-Vertical Architecture & Visual Flowcharts

AMSh operates on a **generic, config-driven architecture** where zero vertical logic is hardcoded. Industry behavior, terminology, and conversation state machines are driven by vertical definitions (`backend/ai/workflows/definitions/`).

Complete step-by-step guides and Mermaid diagrams: [`DOCS/34_AMSh_Vertical_Flowcharts_Visual_Guide.md`](DOCS/34_AMSh_Vertical_Flowcharts_Visual_Guide.md).

### Visual Workflow Infographics

| Vertical | Scope & Workflow Highlights | Visual Flowchart Infographic |
| :--- | :--- | :--- |
| **Universal SaaS Onboarding** | JWT Auth $\rightarrow$ Vertical selection $\rightarrow$ Dynamic steps (Services, Staff, Hours, AI, RAG) $\rightarrow$ Validation & Go-Live | [Universal Onboarding Flowchart](DOCS/flowcharts/images/01_universal_onboarding_flow.jpg) |
| **Education & Universities** | Inbound inquiry $\rightarrow$ Intent classification $\rightarrow$ RAG lookup $\rightarrow$ Multi-department transfer (International, Accounts) $\rightarrow$ Campus tour booking | [University Flowchart](DOCS/flowcharts/images/02_university_ai_flowchart.jpg) |
| **Healthcare & Clinics** | Patient call $\rightarrow$ Deterministic emergency triage $\rightarrow$ Intake & doctor selection $\rightarrow$ EHR slot sync $\rightarrow$ Verbal confirmation & WhatsApp slip | [Clinic Flowchart](DOCS/flowcharts/images/03_clinic_ai_flowchart.jpg) |
| **Salons & Beauty Studios** | Client call $\rightarrow$ Service & stylist preference $\rightarrow$ Dynamic duration & pricing $\rightarrow$ Deposit link $\rightarrow$ Calendar lock | [Salon Flowchart](DOCS/flowcharts/images/04_salon_ai_flowchart.jpg) |
| **Luxury Spas & Wellness** | Guest call $\rightarrow$ Health & contraindication check $\rightarrow$ Therapist assignment $\rightarrow$ Dedicated room & resource lock $\rightarrow$ Prep guide | [Spa & Wellness Flowchart](DOCS/flowcharts/images/05_spa_wellness_flowchart.jpg) |

---

## How it works (short)

```
Caller (phone) -> Twilio / Plivo / Exotel -> WebSocket -> Deepgram STT -> AI agent (LLM + tools + guards) -> Cartesia TTS -> caller
Patient / Client (WhatsApp) -> Meta webhook -> same AI agent (text) -> Graph API reply
Owner (dashboard) -> /ai playground -> same agent, in the browser
```

The agent (`backend/ai/engine/agent`) lets an LLM converse naturally and call tools (check availability, book, look up, cancel, reschedule, search knowledge, transfer, end call), while Python code enforces strict deterministic rules:
1. **Read-back Confirmation**: Bookings require explicit verbal confirmation from the caller.
2. **Grounding**: Booking values and dates must originate from the caller or business schedule (no hallucinations).
3. **Emergency Escalation**: Immediate transfer / instructions for medical emergencies before LLM inference.
4. **Sub-second Latency**: Streaming audio processing with instant interruption (barge-in) support.

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
npm run dev                   # http://localhost:3000

# 4. Start the landing page (optional)
cd frontend/landing-page
npm install
npm run dev                   # http://localhost:3005

# 5. Admin portal (optional; UI mock)
cd frontend/admin
npm install
npm run dev -- -p 3001
```

Ports: api `8010`, postgres `5434`, redis `6380`, ngrok inspector `4040`.

---

### Keys (`.env`)

| Key | Used for |
|---|---|
| `GROQ_API_KEY`, `GEMINI_API_KEY`, `LLM_PROVIDERS` | AI agent inference (Groq primary, Gemini fallback) |
| `DEEPGRAM_API_KEY` | Real-time speech-to-text (STT) on phone calls |
| `CARTESIA_API_KEY` | Ultra-low latency text-to-speech (TTS) |
| `TWILIO_*`, `EXOTEL_*`, `PLIVO_*` | Telephony providers and SMS messaging |
| `META_APP_ID`, `META_APP_SECRET`, `META_WHATSAPP_VERIFY_TOKEN` | WhatsApp Cloud API integration |
| `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL` | Transactional email (password reset, invitations) |
| `CONVERSATION_ENGINE` | `state_machine`, `shadow`, or `llm_agent` |

---

## Tests and checks

```bash
# Backend and AI: Deterministic unit and evaluation tests (no network needed)
python -m unittest backend.ai.evals.test_agent_core

# Multi-vertical workflow tests
python -m unittest backend.tests.test_workflows

# Frontend type check
cd frontend/user && npx tsc --noEmit -p .
```

---

## Documentation map

| Read this | For |
|---|---|
| [`DOCS/34_AMSh_Vertical_Flowcharts_Visual_Guide.md`](DOCS/34_AMSh_Vertical_Flowcharts_Visual_Guide.md) | **Complete illustrated visual flowcharts guide for all verticals with diagrams** |
| [`DOCS/flowcharts/images/`](DOCS/flowcharts/images/) | High-resolution flowchart infographics library (`.jpg`) |
| [`DOCS/31_AMSh_Multi_Vertical_Architecture.md`](DOCS/31_AMSh_Multi_Vertical_Architecture.md) | Multi-vertical architecture and configuration engine spec |
| [`DOCS/README.md`](DOCS/README.md) | Core system architecture, call and WhatsApp pipelines, module status |
| [`DOCS/17_AMSh_Claude_Change_Tracker.md`](DOCS/17_AMSh_Claude_Change_Tracker.md) | Chronological changelog of all architectural and codebase changes |
| [`DOCS/16_AMSh_LLM_Agent_Tool_Calling_Architecture_Plan.md`](DOCS/16_AMSh_LLM_Agent_Tool_Calling_Architecture_Plan.md) | LLM Agent tool calling and state management design |
| [`DOCS/flowcharts/`](DOCS/flowcharts/) | Source `.mmd` diagrams and onboarding flows |

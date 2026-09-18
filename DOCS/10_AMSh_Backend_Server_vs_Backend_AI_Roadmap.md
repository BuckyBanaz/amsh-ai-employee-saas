# AMSh — Backend Server vs. Backend AI Architecture & Scope Roadmap

This document outlines the clear architectural division, completed milestones, and pending tasks between the **REST Business Server (`backend/server`)** and the **Realtime Voice AI Engine (`backend/ai`)**.

---

## 🏛️ System Architectural Split

```
                              ┌─────────────────────────────────────────────────────────┐
                              │                    Client Layers                        │
                              │   - User Portal (Next.js Dashboard & Onboarding)        │
                              │   - Admin Portal (Platform Management)                  │
                              │   - Inbound Phone Callers (Twilio SIP / PSTN)           │
                              └───────────────────────────┬─────────────────────────────┘
                                                          │
                                ┌─────────────────────────┴─────────────────────────┐
                                │                                                   │
                                ▼                                                   ▼
            ┌───────────────────────────────────────┐   ┌───────────────────────────────────────┐
            │       backend/server (REST API)       │   │        backend/ai (Voice Engine)      │
            ├───────────────────────────────────────┤   ├───────────────────────────────────────┤
            │  • FastAPI REST Framework             │   │  • WebSocket Media Stream Server      │
            │  • PostgreSQL + SQLAlchemy ORM        │   │  • Deepgram Live Streaming STT        │
            │  • JWT Auth & Multi-tenant RBAC       │   │  • Deterministic State Machine Engine │
            │  • Onboarding CRUD (100% Verified)    │   │  • Groq Fast LLM (<250ms TTFT)        │
            │  • Dashboard & Management APIs        │   │  • ElevenLabs / Cartesia Ultra-Low TTS│
            │  • Business Roster, Menu & Schedules  │   │  • Isolated Multi-Tenant RAG          │
            │  • Third-Party Integrations & Webhooks│   │  • Barge-In / VAD Interruption        │
            │  • Billing & Plan Activation          │   │  • Real-Time Tool Calling             │
            └───────────────────────────────────────┘   └───────────────────────────────────────┘
                                │                                           │
                                └─────────────────────┬─────────────────────┘
                                                      ▼
                                ┌───────────────────────────────────────────┐
                                │            Shared Infrastructure          │
                                │   - PostgreSQL (Persistent Business Data) │
                                │   - Redis (Active Call State & Sessions)  │
                                │   - Vector DB (Tenant Knowledge Vectors)  │
                                └───────────────────────────────────────────┘
```

---

## 1. 🏢 Backend Server (`backend/server`)

The `backend/server` component manages all administrative, customer portal, operational data, persistent storage, authentication, and external webhook integrations.

### ✅ What is Already Implemented & Verified
- **Authentication & Security (`/api/auth`)**:
  - `POST /api/auth/login` (JWT token issuance)
  - `POST /api/auth/register` (Owner sign-up)
  - `POST /api/auth/accept-invite` (Team invite resolution)
  - Role-Based Access Control (`owner`, `admin`, `doctor`, `receptionist`)
- **Full Onboarding Flow (100% Schema-Verified)**:
  - `POST /api/onboarding/businesses` — Practice creation
  - `POST / PATCH / DELETE .../services` — Treatment menu & duration/pricing
  - `POST / PATCH / DELETE .../staff` — Doctor/staff roster & service assignment
  - `PATCH .../businesses/{id}` — Operating hours, breaks & special holiday closures
  - `POST .../agents` — AI receptionist personality, voices, and capability toggles
  - `POST / PATCH / DELETE .../knowledge` — Documents, websites, and custom FAQs
  - `POST .../integrations/{provider}/connect` — Google Cal, Twilio, WhatsApp, Stripe
  - `PATCH .../businesses/{id}` — Checkout plan selection & activation (`status: "active"`)
- **Database Layer (`backend/server/database`)**:
  - Multi-tenant schemas: `businesses`, `users`, `services`, `staff`, `staff_services`, `agents`, `knowledge_documents`, `integrations`.

---

### ⏳ What Needs To Be Done in `backend/server`

#### 1. Dashboard Overview API (`/api/businesses/{business_id}/dashboard`)
- **Objective:** Provide a single-request overview for `frontend/user/app/(dashboard)/dashboard/page.tsx`.
- **Data required:**
  - Today's appointment count & upcoming appointments list.
  - Active call streams count & recent call logs.
  - AI resolution metrics (e.g. Total calls, % Booked, % Transferred, Avg Duration).
  - Quick action status (AI Receptionist online/offline).

#### 2. Appointments Management API (`/api/businesses/{business_id}/appointments`)
- **Endpoints:**
  - `GET /` — List appointments with date filters, doctor filter, status filter.
  - `POST /` — Create manual appointment (from dashboard).
  - `PATCH /{appointment_id}` — Reschedule appointment, change status (`confirmed`, `completed`, `cancelled`, `no_show`).
  - `DELETE /{appointment_id}` — Remove or cancel appointment.
  - `GET /slots` — Query available slots for a given doctor and date range.

#### 3. Patients / Customers Directory API (`/api/businesses/{business_id}/patients`)
- **Endpoints:**
  - `GET /` — Paginated list of patients with search (name, phone, email).
  - `GET /{patient_id}` — Patient profile with full history of past visits, notes, and call recordings.
  - `POST /` & `PATCH /{patient_id}` — Create / update patient record.

#### 4. Call Logs & Transcripts API (`/api/businesses/{business_id}/calls`)
- **Endpoints:**
  - `GET /` — List all AI-handled and transferred calls with duration, outcome, intent.
  - `GET /{call_id}` — Full turn-by-turn conversational transcript + audio recording URL.
  - `GET /{call_id}/analytics` — Sentiment, extracted intent entities, and tool invocation log.

#### 5. Team & Permissions API (`/api/businesses/{business_id}/team`)
- **Endpoints:**
  - `GET /` — List clinic team members.
  - `POST /invite` — Send invite email with signed JWT token.
  - `PATCH /{user_id}` — Update user role or permissions.
  - `DELETE /{user_id}` — Revoke user access.

#### 6. External Webhook Handlers
- **Twilio Status Callbacks (`/api/webhooks/twilio`)**:
  - Capture call duration, recording completion, and Twilio billing metrics.
- **Stripe Webhooks (`/api/webhooks/stripe`)**:
  - Handle subscription renewal, invoice payment failures, and plan upgrades.

---

## 2. 🤖 Backend AI Engine (`backend/ai`)

The `backend/ai` component is the high-performance, ultra-low latency (<800ms) conversational engine that handles live phone calls from Twilio WebSocket media streams.

### ✅ What is Already Implemented
- **Config-Driven Vertical Architecture (`backend/ai/verticals`)**:
  - `clinic.yaml` and `restaurant.yaml` defining vertical intents, slots, prompt templates, and terminology.
  - No hardcoded `if business_type == "clinic"` branches in core logic.
- **Tools & Function Calling Registry (`backend/ai/tools`)**:
  - `book_appointment.py`, `check_availability.py`, `cancel_appointment.py`
  - `hangup.py`, `transfer_call.py`
- **Groq LLM Client (`backend/ai/llm/client.py`)**:
  - Ultra-fast inference (<250ms Time-To-First-Token).
- **RAG Architecture Structure (`backend/ai/rag`)**:
  - Multi-tenant tenant-scoped chunking & retrieval schemas.

---

### ⏳ What Needs To Be Done in `backend/ai`

#### 1. Twilio WebSocket Media Stream Gateway (`backend/ai/realtime/websocket_server.py`)
- **Objective:** Accept bi-directional audio streams from Twilio (`wss://.../ws/voice/stream/{business_id}`).
- **Tasks:**
  - Handle Twilio WebSocket events: `start`, `media`, `mark`, `stop`.
  - Convert Twilio $\mu$-law 8kHz audio $\leftrightarrow$ PCM 16kHz audio stream.
  - Maintain call connection lifecycle and session handshake.

#### 2. Streaming Audio Pipeline (STT $\rightarrow$ Engine $\rightarrow$ TTS)
- **Speech-to-Text (STT):**
  - Stream audio chunks to **Deepgram Live Streaming WebSocket** or Groq Whisper.
  - Intercept final & interim transcripts in real time.
- **Deterministic State Machine Turn Management:**
  - Route caller intent through the state machine (`GREETING` $\rightarrow$ `COLLECT_NAME` $\rightarrow$ `SLOT_SELECTION` $\rightarrow$ `CONFIRMATION` $\rightarrow$ `COMPLETED`).
  - Execute Python validation code for slot checking and booking to prevent LLM hallucinations.
- **Text-to-Speech (TTS):**
  - Stream response sentences to **Cartesia Sonic** or **ElevenLabs WebSocket TTS**.
  - Stream raw $\mu$-law chunks back to Twilio WebSocket with lowest possible buffer latency (<300ms).

#### 3. Barge-in (Interruption Handling via VAD)
- **Objective:** When caller starts speaking while the AI is talking, AI must stop speaking instantly (<100ms).
- **Tasks:**
  - Voice Activity Detection (VAD) / Deepgram `speech_started` event detection.
  - Send Twilio `clear` command to flush the caller's audio buffer immediately.
  - Cancel any in-flight LLM/TTS streams for the previous turn.

#### 4. Short-Term & Long-Term Memory
- **Redis (Short-Term Call State):**
  - Store active caller slots, current state, and conversation history buffer.
- **PostgreSQL Sync (Long-Term Call Logs):**
  - On `hangup` or disconnect, persist the full structured transcript, outcome (`Booked`, `Transferred`, `Resolved`), audio recording URL, and analytics to `call_logs` table.

#### 5. Multi-Tenant Vector RAG Query Integration
- **Objective:** When caller asks questions about policies, pricing, or FAQ, retrieve knowledge dynamically.
- **Tasks:**
  - Isolated RAG index querying scoped by `business_id`.
  - Fallback guardrails: If question is out-of-scope, gracefully route to human agent via `transfer_call`.

---

## 📋 Summary Checklist

| Component | Layer | Main Task | Status |
|---|---|---|:---:|
| **backend/server** | Auth | Login, Register, Invite Tokens | ✅ Complete |
| **backend/server** | Onboarding | Full 8-Step Business Configuration CRUD | ✅ Complete |
| **backend/server** | Dashboard | Overview metrics & today's schedule API | ⏳ Next |
| **backend/server** | Appointments | Bookings calendar & slot availability CRUD | ⏳ Next |
| **backend/server** | Patients | Patient profiles, medical notes & directory | ⏳ Next |
| **backend/server** | Call Logs | Historical call logs, recordings & transcripts API | ⏳ Next |
| **backend/ai** | Verticals | YAML Config layer (Clinic & Restaurant) | ✅ Complete |
| **backend/ai** | Tools | Appointment booking, availability & transfer tools | ✅ Complete |
| **backend/ai** | Media Stream | Twilio Bi-directional WebSocket Gateway | ⏳ Next |
| **backend/ai** | Streaming Audio| Deepgram Live STT + Cartesia/ElevenLabs TTS | ⏳ Next |
| **backend/ai** | Engine | Deterministic State Machine Turn Runner | ⏳ Next |
| **backend/ai** | Barge-In | VAD Interruption & Twilio audio buffer clear | ⏳ Next |
| **backend/ai** | RAG Integration| Per-tenant Vector Search for FAQs & policies | ⏳ Next |


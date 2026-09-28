# Amsh - Project Overview

## Motive & Vision
Amsh is a generic, configuration-driven, multi-vertical AI Receptionist SaaS platform. It acts as an automated, highly-intelligent voice receptionist for modern businesses—clinics, hospitality, dental, salons, and gyms.

Instead of hardcoding logic for specific business types, Amsh utilizes a generic engine. The system's behavior, terminology, intents, and capabilities are determined dynamically based on the configuration of the specific business vertical.

## Architectural Pillars (The 4-Pillar Model)
When scaling, AMSh logically partitions into 4 distinct responsibilities (currently co-located in this monorepo with strict boundary discipline):

| Logical Pillar | Repository / Service | Responsibility in AMSh | Monorepo Directory |
|---|---|---|---|
| **Pillar 1: Customer Portal** | `amsh-frontend` | Tenant-facing web app (Dashboard, calendar appointments, conversation transcripts, customer CRM, staff, settings) | `frontend/user/` |
| **Pillar 2: Admin Portal** | `amsh-admin` | Platform operator control panel (Tenants, subscriptions, telephony usage, active calls inspection, health, audit logs) | `frontend/admin/` |
| **Pillar 3: Business Backend** | `amsh-backend` | Core business logic server & persistence API (Auth, PostgreSQL DB, stripe billing, appointment bookings CRUD, webhooks, worker queues) | `backend/` (`api/`, `auth/`, `database/`, `billing/`) |
| **Pillar 4: AI & Voice Engine** | `amsh-ai` | Low-latency voice & conversational intelligence (Twilio WebSocket media stream, Deepgram STT, Groq LLM, ElevenLabs TTS, deterministic state machine, RAG vector search, dynamic tools) | `backend/` (`engine/`, `realtime/`, `speech/`, `llm/`, `rag/`, `memory/`, `tools/`, `verticals/`) |

## API Routing Architecture & Namespace Isolation
To ensure strict security and avoid cross-tenant or role confusion, API routes follow a clean namespace division:
1. **Customer & Tenant Namespace (`/api/onboarding/*`, `/api/businesses/*`, `/api/auth/*`)**:
   - Manages tenant onboarding, business services, staff, working hours, and clinic-level team invites.
2. **Platform Admin Namespace (`/api/admin/*`)**:
   - Dedicated, isolated route surface strictly for internal platform operators and super-admins.
   - Planned sub-modules: `/api/admin/auth/*` (platform login, 2FA, session kill), `/api/admin/users/*` (internal staff directory, role permissions, unlock, suspend), `/api/admin/tenants/*` (global clinic oversight, plan modification, tenant suspension), `/api/admin/audit/*` (audit logs), `/api/admin/system/*` (diagnostics & health).
3. **Voice & AI Engine Namespace (`/api/voice/*`, `/media-stream/*`)**:
   - Twilio WebSocket media streams, VAD, and voice simulation endpoints.

## Multi-Telephony Inbound & Outbound Architecture (Call Tunnels)
AMSh operates a unified, provider-agnostic telephony adapter pattern (`call_tunnels/`):
- **India Telephony (Local +91 DIDs)**: Handled via **Exotel** (`08047284627`) with PCM16 @ 8kHz streaming and Indian SMS.
- **Global / US / UK Telephony (+1 DIDs)**: Handled via **Twilio** (`+16562547488`) with $\mu$-law @ 8kHz media streaming and international SMS.
- **Future Country Tunnels**: Designed for zero-overhead plug-and-play expansion (Telnyx for Middle East/Europe, Plivo/Sinch for Southeast Asia).
- **Unified Engine**: All tunnels feed normalized audio and metadata into the core pipeline (`Deepgram Nova-2` $\leftrightarrow$ `Groq Fast LLM` $\leftrightarrow$ `Cartesia Sonic-3` $\leftrightarrow$ `PostgreSQL DB`).

## AI Capabilities & Server Notification Hub
1. **AI Capabilities Architecture (`backend/ai/capabilities/`)**:
   - **Rules**: Deterministic guardrails (Emergency safety, working hours, HIPAA/PII masking).
   - **Skills**: Conversational workflows (Appointment booking, table reservation, lead qualification, FAQ handling).
   - **Operations (Read vs. Write)**:
     - *Read*: Fetch doctor schedule, check availability, query RAG knowledge base.
     - *Write*: Persist appointment, update CRM, dispatch notifications.
2. **Server Notification Hub (`backend/server/notifications/`)**:
   - Centralized multi-channel dispatcher supporting: SMS (Exotel/Twilio), WhatsApp (Meta Cloud API / Twilio), Email (Resend), and Live Dashboard Push (SSE/FCM).

## Key Architectural Principles
1. **Vertical Agnostic:** Never hardcode vertical-specific logic (`if businessType == "clinic"`). Support any business via a configuration layer.
2. **Dynamic Tenant-Driven (Zero Hardcoding):** Business name, operating hours, active doctor list, services catalog, and AI voice settings are fetched dynamically from PostgreSQL per tenant.
3. **Capability System:** The frontend dashboard adapts based on the features the business supports (e.g., appointments, orders, menu).
4. **Deterministic Core with Conversational NLU:** The conversation engine combines a deterministic state machine for business actions with a fast Groq NLU layer for language understanding. Multi-category routing (`persona`, `action`, `knowledge`, `out_of_scope`, `ambiguous_unclear`) prevents generic fallback traps and guarantees dynamic persona awareness (`Agent.name`).
4b. **LLM Agent + Tool Calling (implemented 2026-09-28, behind a flag, default OFF):** The LLM writes replies and calls tools; Python validates every action (booking, cancel, transfer) and checks that booking values and quoted times trace back to the caller or a tool; emergency safety stays a static pre-LLM gate. Removes the template ceiling of Principle 4. Not for live traffic until a paid LLM tier is in place. Spec: `DOCS/16_AMSh_LLM_Agent_Tool_Calling_Architecture_Plan.md`; tracker: `DOCS/17_AMSh_Claude_Change_Tracker.md`.
5. **Monorepo First, Split on Scale:** Keep development unified in the monorepo during early growth to eliminate network hops and multi-repo deployment overhead, while maintaining clean internal module boundaries so extraction into 4 dedicated repos is seamless when team size demands it.

## Where to look for current status
Done / pending / architecture and pipelines: `DOCS/README.md`. Phased plan for the user app and admin portal: `DOCS/18_AMSh_Completion_Plan_User_and_Admin.md`. Change log with evidence: `DOCS/17_AMSh_Claude_Change_Tracker.md`.

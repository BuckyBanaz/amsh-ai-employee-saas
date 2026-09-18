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

## Key Architectural Principles
1. **Vertical Agnostic:** Never hardcode vertical-specific logic (`if businessType == "clinic"`). Support any business via a configuration layer.
2. **Capability System:** The frontend dashboard adapts based on the features the business supports (e.g., appointments, orders, menu).
3. **Deterministic Core:** The conversation engine uses a deterministic state machine rather than purely unbounded LLM generation. Field validation and tool routing are handled strictly via Python code to maintain low latency (<800ms) and eliminate hallucinations.
4. **Monorepo First, Split on Scale:** Keep development unified in the monorepo during early growth to eliminate network hops and multi-repo deployment overhead, while maintaining clean internal module boundaries so extraction into 4 dedicated repos is seamless when team size demands it.

# PRD — AI Voice Business Agent Platform (Multi-Vertical)
**Version:** 1.2
**Owner:** [Your Name]
**Tech Stack:** Python, FastAPI, Groq (LLM), STT/TTS providers, Vector DB
**Date:** August 2026

---

## 1. Overview

This is a **generic AI Voice Agent platform** — designed to automatically handle phone calls for **all types of businesses** (e-commerce, restaurants, retail shops, clinics, salons, real estate, gyms, hotels, service centers, offices, etc.) without requiring a human agent.

Every vertical has a **different use case**:
- Clinic → appointment booking, doctor availability
- Restaurant → table reservation, phone orders, menu FAQ
- E-commerce → order status/tracking, returns, product availability
- Retail Shop → stock check, store hours, price inquiry
- Salon/Spa → slot booking, service pricing

Therefore, the platform will be designed using a **generic core engine + vertical-specific configuration (plug-in style)** — allowing any business type to be onboarded without rewriting core code.

This will be a Vapi/Retell-style **Conversation Engine** featuring Streaming STT, Groq LLM, RAG (Knowledge Base), Tool-calling, Memory, Guardrails, and Barge-in support — all running on a Python FastAPI backend.

### 1.1 Problem Statement
Small/medium businesses across verticals face constant phone calls (order status, booking, timings, pricing, complaints) that require dedicated staff. This is cost-inefficient and missed calls lead to revenue loss. Existing solutions (Vapi, Retell) are expensive and lack India-specific + multi-vertical customization (Hinglish support, local business rules, vertical-specific flows).

### 1.2 Goal
To build a self-hosted, cost-effective, low-latency, **vertical-agnostic** AI voice agent platform that:
- Handles natural Hindi/English/Hinglish conversations.
- Supports configurable intents/tools (booking, ordering, order tracking, reservation, FAQ) for any business type.
- Utilizes business-specific knowledge (RAG).
- Supports real-time barge-in (callers can interrupt the AI).
- Enables onboarding a new business vertical **simply by adding a config file**, without rewriting code.

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|---|---|---|
| Low latency response | First-token latency | < 800ms |
| Accurate intent handling | Successful task completion rate | > 85% |
| Natural conversation | Call completion without human transfer | > 70% |
| Reliability | Uptime | 99.5% |
| Scalability | Concurrent calls supported | 50+ (MVP), 500+ (v2) |
| Vertical extensibility | Time to onboard a new business type | < 1 day (config only, no code) |

---

## 3. Users & Use Cases

**Primary users:** Business owners across any vertical who want to automate their inbound calls.

**End users (callers):** Customers booking, ordering, checking status, or asking for business info.

### 3.1 Supported Verticals (target set)

| Vertical | Primary Intents |
|---|---|
| E-commerce | Order status/tracking, return/refund initiation, product availability, FAQ (shipping, policy) |
| Restaurant | Table reservation, phone orders, menu/pricing FAQ, delivery status |
| Retail Shop | Product/stock availability, store hours/location, price inquiry |
| Clinic / Healthcare | Appointment booking, cancel/reschedule, doctor availability, FAQs (timings, insurance) |
| Salon / Spa | Slot booking, service pricing, staff availability |
| Real Estate | Property inquiry, site-visit scheduling, FAQ (pricing, availability) |
| Gym / Fitness | Membership inquiry, class booking, trial scheduling |
| Hotel | Room booking/availability, reservation modification, FAQ (amenities, check-in/out) |
| Service Centers | Service booking, status inquiry, FAQ (pricing, turnaround) |

The intent-set and tool-set for each vertical will be **config-driven** (Section 6.7). Onboarding a new vertical = new config file, not new code.

### 3.2 Key Use Cases (Generic pattern across all verticals)
1. Caller states a transactional intent (book / order / cancel / check status) → required fields are collected.
2. Caller asks an FAQ (timings, pricing, location, policy) → Answered via RAG from the vertical-specific knowledge base.
3. Caller modifies/cancels an existing transaction.
4. Caller says something beyond the agent's scope → Transferred to a human agent.
5. Caller interrupts (barge-in) → Agent stops speaking immediately.

---

## 4. System Architecture

```text
Caller
  │
  ▼
Twilio (Voice Gateway) ──WebSocket──▶ FastAPI Backend
  │
  ▼
┌─────────────────────────────────────────┐
│           CONVERSATION ENGINE           │
│         (vertical-agnostic core)        │
│                                         │
│  ┌───────────┐   ┌───────────────────┐  │
│  │  Memory / │   │   Knowledge Base  │  │
│  │  Session  │   │   (RAG / Vector DB│  │
│  │  State    │   │   per business    │  │
│  └─────┬─────┘   └─────────┬─────────┘  │
│        └─────────┬─────────┘            │
│                  ▼                      │
│            GROQ LLM (fast inference)    │
│                  │                      │
│    ┌─────────────┼─────────────┐        │
│    ▼             ▼             ▼        │
│  Tools       Guardrails    Response     │
│(per vertical)(safety,      Controller   │
│               validation)  (speak/wait) │
└──────────────────┬──────────────────────┘
                   ▼
         Vertical Config Layer
   (clinic.yaml / restaurant.yaml /
    ecommerce.yaml / retail.yaml ...)
  │
  ▼
Streaming TTS ──▶ Twilio ──▶ Caller
```

### 4.1 Core Modules
1. **Voice Gateway** — Twilio (inbound/outbound calls, media streams via WebSocket)
2. **Streaming STT** — Deepgram / Groq Whisper (real-time transcription)
3. **Conversation Engine** — FastAPI service, state machine + LLM orchestration (fully vertical-agnostic)
4. **Vertical Config Layer** — Loads intents, required fields, tools, and prompts from the vertical's config file (Section 6.7)
5. **Knowledge Base (RAG)** — Document ingestion → chunking → embeddings → vector DB → retrieval (isolated per business)
6. **Tool Router** — Function calling for calendar, CRM, order systems, database operations — tools are registered via vertical config
7. **Memory/Session Store** — Redis (short-term, per-call), Postgres (long-term, caller history)
8. **Guardrails** — Input/output validation, PII handling, escalation rules
9. **Streaming TTS** — ElevenLabs / Cartesia for low-latency voice output
10. **Barge-in Handler** — VAD (Voice Activity Detection) based interruption handling

---

## 5. Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | **Python + FastAPI** |
| Async server | Uvicorn / Gunicorn (async workers) |
| Voice/Telephony | Twilio Programmable Voice + Media Streams |
| STT | Deepgram (streaming) or Groq Whisper |
| LLM | Groq (Llama 3.x / Mixtral for speed) |
| TTS | ElevenLabs (streaming) or Cartesia |
| Vector DB | Qdrant / Pinecone / pgvector |
| Session store | Redis |
| Persistent DB | PostgreSQL (via SQLAlchemy / SQLModel) |
| Task queue | Celery / Arq (for async jobs: embeddings, reminders) |
| Config format | YAML (per-vertical business templates) |
| Auth | JWT (business dashboard login) |
| Deployment | Docker + Railway/Fly.io/AWS |
| Real-time comms | WebSockets (FastAPI native support) |

---

## 6. Functional Requirements

### 6.1 Call Handling
- **FR1:** System receives incoming Twilio call and establishes a WebSocket media stream.
- **FR2:** Audio streamed to real-time STT, handling partial and final transcripts.
- **FR3:** VAD detects caller speech or silence (turn-taking).
- **FR4:** Barge-in support — TTS stops immediately if the caller interrupts.

### 6.2 Conversation Management
- **FR5:** Maintain a generic state machine per call: `GREETING → IDENTIFY_INTENT → COLLECTING_INFO → VALIDATING → CONFIRMING → EXECUTING_ACTION → COMPLETED`. States are generic; actual actions come from vertical config.
- **FR6:** Maintain structured memory per call (intent, collected fields, history).
- **FR7:** Context preservation on topic switch (e.g., FAQ pushed to state stack, then return to original state).

### 6.3 Knowledge Base / RAG
- **FR8:** Business owners can upload vertical-specific docs (menus, pricing, policies).
- **FR9:** Documents are chunked, embedded, and stored in an isolated vector DB per business.
- **FR10:** Relevant chunks are retrieved at runtime and passed as context to the LLM.

### 6.4 Tools / Function Calling
- **FR11:** Vertical-specific tool-sets registered via config. (e.g., Clinic: `book_appointment()`, Restaurant: `place_order()`).
- **FR12:** Tool results update conversation memory so callers aren't asked repeatedly for the same info.
- **FR13:** Shared/common tools available across verticals (e.g., `transfer_call()`, `get_business_info()`).

### 6.5 Guardrails
- **FR14:** PII (phone, name, payment details) securely handled and masked in logs.
- **FR15:** Out-of-scope requests (e.g., medical advice) politely declined or transferred to human.
- **FR16:** Max conversation turns or timeout limits to avoid runaway calls.

### 6.6 Dashboard (Business Owner side)
- **FR17:** Select a vertical during onboarding to load the default config template.
- **FR18:** Manage knowledge base documents.
- **FR19:** Configure business-specific entities (e.g., doctors for clinics, menu items for restaurants).
- **FR20:** View call logs, transcripts, and transaction history.

### 6.7 Vertical Config Layer (core design principle)
- **FR21:** Each vertical is defined by a config file (YAML/JSON): intents list, required fields, tool mappings, prompt templates.
- **FR22:** Config examples: `clinic.yaml`, `restaurant.yaml`, `ecommerce.yaml`.
- **FR23:** Core engine code must remain agnostic (no `if vertical == "clinic"`). Adding a vertical requires only a new config file and tool implementations.
- **FR24:** Businesses can combine multiple config "modules" (e.g., reservation + delivery).

---

## 7. Non-Functional Requirements
- **Latency:** End-to-end response (caller speech end → AI speech start) < 1.2s target.
- **Scalability:** Horizontal scaling via async FastAPI workers, Redis session state.
- **Reliability:** Graceful fallback for LLM/STT/TTS failures (retry + human transfer).
- **Security:** API calls authenticated (JWT), data encrypted at rest, call recordings opt-in.
- **Multi-tenancy:** Data isolation guaranteed across multiple businesses.
- **Observability:** Structured logging, call-level tracing, latency metrics per stage.

---

## 8. Data Models (High Level)

```python
# Business — generic across all verticals
class Business(BaseModel):
    id: UUID
    name: str
    vertical: str  # "clinic" | "restaurant" | "ecommerce" | "retail" | "salon" | ...
    timezone: str
    working_hours: dict
    config_ref: str  # path/key to vertical config template

# Call Session — generic
class CallSession(BaseModel):
    call_id: UUID
    business_id: UUID
    caller_phone: str
    state: str  # e.g. "COLLECTING_INFO"
    intent: str | None
    collected_fields: dict
    history: list[dict]
    created_at: datetime

# Transaction — generic wrapper (booking / order / reservation, depending on vertical)
class Transaction(BaseModel):
    id: UUID
    business_id: UUID
    call_id: UUID
    type: str  # "appointment" | "order" | "reservation" | "status_check"
    details: dict  # vertical-specific payload
    status: str  # confirmed / cancelled / pending
    created_at: datetime
```

Vertical-specific extra fields will be stored within the `details: dict` (validated by the config schema) to keep the core model generic.

---

## 9. API Endpoints (FastAPI)

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/webhook/twilio/voice` | Incoming call webhook, returns TwiML |
| `WS` | `/ws/media-stream/{call_id}` | Twilio media stream (audio in/out) |
| `POST` | `/api/business` | Create/update business (with vertical selection) |
| `GET` | `/api/verticals` | List available vertical config templates |
| `POST` | `/api/knowledge-base/upload` | Upload docs for RAG |
| `GET` | `/api/transactions` | List bookings/orders/reservations (dashboard) |
| `POST` | `/api/transactions` | Create transaction (internal tool call) |
| `PATCH` | `/api/transactions/{id}` | Update/cancel transaction |
| `GET` | `/api/calls/{call_id}/transcript` | Get call transcript |
| `GET` | `/health` | Health check |

---

## 10. Conversation Engine Logic (Deterministic vs LLM)

**Important principle: Do not make the Conversation Manager purely LLM-based.**

| Component | Implementation |
|---|---|
| State machine | Python code (deterministic, vertical-agnostic) |
| Field validation | Python code (rules loaded from vertical config) |
| Business rules (hours, slot conflicts, stock limits) | Python code |
| Tool routing | Python code, tool registry per vertical |
| Natural language generation/understanding | Groq LLM |
| RAG retrieval | Vector DB + Python code |

This approach ensures lower latency, reduced token usage, fewer hallucinations, and high reusability when adding new verticals.

---

## 11. Milestones / Roadmap

**Phase 1 — Core Engine + First Vertical (4-6 weeks)**
- Twilio integration + basic STT/TTS streaming
- Generic state machine + config loader (no hardcoded verticals)
- Fully implement one vertical to prove the architecture (e.g., clinic or restaurant)
- Basic FastAPI backend + Postgres

**Phase 2 — Knowledge Base + Second Vertical (validate genericness)**
- RAG pipeline (document upload, embeddings, vector search)
- Add second vertical (new config file + tool set) to validate engine genericness
- Barge-in support

**Phase 3 — More Verticals + Production Hardening**
- 2-3 additional verticals (based on business demand)
- Guardrails, escalation to human agent
- Dashboard: vertical selection, config management, KB upload, transaction history
- Multi-tenant support, analytics

**Phase 4 — Scale**
- Multi-language support (Hindi/English/regional)
- Outbound calling (reminders, confirmations, order updates)
- Marketplace-style vertical templates (businesses self-onboard by picking a template)
- Advanced analytics, A/B testing on prompts

---

## 12. Open Questions
- Which vertical should be built first for the MVP? (This decides Phase 1 scope)
- Final selection of STT/TTS providers (cost vs. latency tradeoff)
- Multi-tenancy architecture (single Postgres schema vs. per-business schema)
- Pricing model for end businesses (per-minute vs. subscription, per-vertical pricing tiers)
- Vertical-specific third-party integrations (e.g., Shopify/WooCommerce for e-commerce, POS integration for restaurants)

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Engine over-fitting to one vertical | Add a second vertical early in Phase 2 to validate genericness |
| LLM hallucination in booking/order flow | Deterministic validation layer before confirming any transaction |
| High latency ruining voice UX | Streaming everywhere (STT/LLM/TTS), aggressive caching, fast LLM inference (Groq) |
| STT errors with Hinglish/accents | Extensive testing with real Indian accents, fallback confirmation flows |
| Endless integrations (POS, inventory, order systems) inflating scope | Design adapter plugins in the config layer, limit MVP scope to 1-2 integrations |
| Vendor costs (Twilio/LLM/TTS) at scale | Monitor per-call costs closely, consider self-hosted STT/TTS models later |

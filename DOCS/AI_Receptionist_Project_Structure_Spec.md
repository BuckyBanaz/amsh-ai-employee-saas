AI RECEPTIONIST — PROJECT STRUCTURE & ARCHITECTURE SPEC

Implementation blueprint based on the uploaded Claude PRD

# 1. Purpose

This document converts the PRD into a concrete monorepo and backend architecture. The central rule is: one vertical-agnostic Conversation Engine, with vertical configuration, tools and integrations plugged into it. The source PRD explicitly defines this generic-core approach. fileciteturn0file0L20-L32

# 2. Repository Structure

ai-receptionist/
├── apps/
│   ├── landing/                 # Public marketing website
│   ├── admin/                   # Platform/admin panel
│   └── dashboard/               # Business owner/user panel
├── backend/
│   ├── api/                     # REST API
│   ├── realtime/                # Twilio/WebSocket/audio runtime
│   ├── engine/                  # Conversation Engine
│   ├── speech/                  # STT + TTS providers
│   ├── llm/                     # Groq + model adapters
│   ├── rag/                     # Knowledge ingestion/retrieval
│   ├── memory/                  # Redis/session/caller memory
│   ├── tools/                   # Tool framework + vertical tools
│   ├── verticals/               # YAML/JSON vertical configs
│   ├── integrations/            # Calendar/CRM/POS/ecommerce etc.
│   ├── auth/
│   ├── billing/
│   ├── analytics/
│   ├── workers/
│   ├── database/
│   └── common/
├── packages/
│   ├── shared-types/
│   ├── api-client/
│   ├── ui/
│   └── config-schema/
├── infrastructure/
├── docs/
├── tests/
├── .env.example
├── docker-compose.yml
└── README.md

# 3. Frontend Applications

Keep the three frontend surfaces separate. This prevents public marketing, platform operations and customer workflows from becoming one tangled application.

## 3.1 Landing Website

apps/landing/
├── app/
│   ├── page.tsx
│   ├── features/
│   ├── pricing/
│   ├── solutions/
│   │   ├── clinics/
│   │   ├── restaurants/
│   │   ├── ecommerce/
│   │   ├── salons/
│   │   └── real-estate/
│   ├── docs/
│   └── contact/
├── components/
├── lib/
└── public/

- SEO, product pages, pricing, demos and signup.

- No customer dashboard logic.

## 3.2 Admin Panel

apps/admin/
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── businesses/
│   ├── users/
│   ├── agents/
│   ├── calls/
│   ├── verticals/
│   ├── providers/
│   ├── integrations/
│   ├── billing/
│   ├── system-health/
│   └── audit-logs/
├── components/
├── services/
├── hooks/
├── lib/
└── types/

- Platform operator controls.

- Manage tenants, vertical templates, providers, health, usage and audit logs.

## 3.3 Business User Panel

apps/dashboard/
├── app/
│   ├── onboarding/
│   ├── dashboard/
│   ├── agents/
│   │   ├── [agentId]/
│   │   ├── builder/
│   │   ├── prompt/
│   │   ├── voice/
│   │   ├── knowledge/
│   │   ├── tools/
│   │   └── phone/
│   ├── calls/
│   ├── conversations/
│   ├── transactions/
│   ├── integrations/
│   ├── analytics/
│   ├── billing/
│   └── settings/
├── components/
├── services/
├── hooks/
├── lib/
└── types/

The PRD requires the business dashboard to handle vertical selection, knowledge management, business entities, calls, transcripts and transaction history. fileciteturn0file0L186-L190

# 4. Backend Structure

backend/
├── api/
│   ├── routes/
│   │   ├── auth.py
│   │   ├── businesses.py
│   │   ├── agents.py
│   │   ├── calls.py
│   │   ├── knowledge.py
│   │   ├── transactions.py
│   │   ├── integrations.py
│   │   ├── billing.py
│   │   └── verticals.py
│   ├── dependencies/
│   └── router.py
│
├── realtime/
│   ├── twilio/
│   │   ├── webhook.py
│   │   ├── media_stream.py
│   │   └── events.py
│   ├── audio/
│   │   ├── codec.py
│   │   ├── buffer.py
│   │   └── resampler.py
│   ├── vad/
│   ├── turn_detection/
│   ├── barge_in/
│   └── session.py
│
├── engine/
│   ├── conversation/
│   │   ├── engine.py
│   │   ├── state_machine.py
│   │   ├── context.py
│   │   ├── turn.py
│   │   ├── intent.py
│   │   ├── response_controller.py
│   │   └── escalation.py
│   ├── orchestration/
│   │   ├── runtime.py
│   │   ├── pipeline.py
│   │   ├── event_bus.py
│   │   └── provider_router.py
│   ├── guardrails/
│   ├── policies/
│   └── prompts/
│
├── speech/
│   ├── stt/
│   │   ├── base.py
│   │   ├── groq.py
│   │   ├── deepgram.py
│   │   └── factory.py
│   └── tts/
│       ├── base.py
│       ├── elevenlabs.py
│       ├── cartesia.py
│       └── factory.py
│
├── llm/
│   ├── base.py
│   ├── groq.py
│   ├── streaming.py
│   └── router.py
│
├── rag/
│   ├── ingestion/
│   ├── embeddings/
│   ├── retrieval/
│   ├── vector_store/
│   └── service.py
│
├── memory/
├── tools/
├── verticals/
├── integrations/
├── auth/
├── billing/
├── analytics/
├── workers/
├── database/
└── common/

The source PRD specifies FastAPI, Twilio Media Streams, STT, LLM, TTS, RAG, Redis, PostgreSQL, tools, guardrails and WebSockets as the core platform layers. fileciteturn0file0L118-L149

# 5. Conversation Engine

engine/
├── conversation/
│   ├── engine.py             # Main coordinator
│   ├── state_machine.py      # Deterministic states
│   ├── context.py            # LLM context builder
│   ├── turn.py               # Turn model
│   ├── intent.py
│   ├── response_controller.py
│   └── escalation.py
├── orchestration/
│   ├── runtime.py            # Main realtime loop
│   ├── pipeline.py           # STT → engine → LLM → TTS
│   ├── event_bus.py
│   └── provider_router.py
├── guardrails/
└── policies/

Important: the Conversation Manager should not become a giant LLM prompt. The PRD explicitly puts state machine, validation, business rules and tool routing in deterministic Python code, while Groq handles natural-language understanding/generation. fileciteturn0file0L266-L279

# 6. STT / TTS Provider Architecture

speech/
├── stt/
│   ├── base.py
│   ├── groq.py
│   ├── deepgram.py
│   └── factory.py
└── tts/
    ├── base.py
    ├── elevenlabs.py
    ├── cartesia.py
    └── factory.py

- base.py defines the provider interface.

- Provider files contain vendor-specific code only.

- factory/router chooses the configured provider.

- Conversation Engine never imports ElevenLabs/Groq-specific implementation directly.

The PRD names Deepgram/Groq as STT candidates and ElevenLabs/Cartesia as TTS candidates, so provider adapters should remain swappable. fileciteturn0file0L120-L128

# 7. RAG / Knowledge Base

rag/
├── ingestion/
│   ├── upload.py
│   ├── parser.py
│   ├── cleaner.py
│   ├── chunker.py
│   └── metadata.py
├── embeddings/
│   ├── base.py
│   └── provider.py
├── retrieval/
│   ├── search.py
│   ├── reranker.py
│   └── context_builder.py
├── vector_store/
│   ├── base.py
│   ├── pgvector.py
│   └── qdrant.py
└── service.py

Upload → Parse → Clean → Chunk → Embed → Vector DB
Caller query → Retrieve → Rerank → Context → Groq

The PRD requires business-isolated documents, chunking, embeddings, vector storage and runtime retrieval. fileciteturn0file0L167-L170

# 8. Memory

memory/
├── session_memory.py
├── conversation_summary.py
├── caller_memory.py
└── redis_store.py

- Redis = active call/session state.

- PostgreSQL = durable caller/call/transaction history.

- Structured slots stay separate from transcript text.

- Older turns are compressed into a rolling summary.

# 9. Vertical Config System

This is one of the most important architecture rules. New business types should be added through configuration and tools rather than hardcoding vertical-specific branches into the engine. fileciteturn0file0L192-L196

verticals/
├── registry.py
├── loader.py
├── schemas.py
└── configs/
    ├── clinic.yaml
    ├── restaurant.yaml
    ├── ecommerce.yaml
    ├── retail.yaml
    ├── salon.yaml
    ├── real_estate.yaml
    ├── gym.yaml
    ├── hotel.yaml
    └── service_center.yaml

name: clinic

intents:
  - appointment_booking
  - appointment_cancel
  - appointment_reschedule
  - doctor_availability
  - clinic_faq

entities:
  - patient_name
  - doctor
  - date
  - time
  - service

tools:
  - check_availability
  - book_appointment
  - cancel_appointment
  - reschedule_appointment

escalation:
  medical_advice: human
  unsupported_request: human

# 10. Business Verticals

These are the target verticals defined by the source PRD. fileciteturn0file0L56-L70

# 11. Tool System

tools/
├── framework/
│   ├── base.py
│   ├── registry.py
│   ├── schema.py
│   ├── permissions.py
│   └── idempotency.py
├── common/
│   ├── transfer_call.py
│   ├── get_business_info.py
│   └── send_message.py
└── vertical/
    ├── clinic/
    │   ├── check_availability.py
    │   ├── book_appointment.py
    │   ├── cancel_appointment.py
    │   └── reschedule_appointment.py
    ├── restaurant/
    │   ├── check_table.py
    │   ├── create_reservation.py
    │   └── place_order.py
    └── ecommerce/
        ├── get_order_status.py
        ├── check_stock.py
        └── initiate_return.py

The PRD defines both common tools and vertical-specific tools, with tool results feeding back into conversation memory. fileciteturn0file0L172-L179

# 12. Integrations

integrations/
├── calendar/
│   ├── google_calendar.py
│   └── outlook_calendar.py
├── crm/
├── ecommerce/
│   ├── shopify.py
│   └── woocommerce.py
├── restaurant/
│   └── pos.py
├── messaging/
│   ├── sms.py
│   └── whatsapp.py
└── payments/

Keep integrations separate from tools. A tool expresses what the agent can do; an integration expresses how the platform connects to an external system.

# 13. Database

database/
├── models/
│   ├── tenant.py
│   ├── user.py
│   ├── business.py
│   ├── agent.py
│   ├── phone_number.py
│   ├── call.py
│   ├── message.py
│   ├── transaction.py
│   ├── knowledge_base.py
│   ├── document.py
│   ├── tool_execution.py
│   ├── integration.py
│   └── usage.py
├── repositories/
├── migrations/
└── session.py

The source PRD already models Business, CallSession and generic Transaction entities, with vertical-specific transaction details kept in a validated payload. fileciteturn0file0L211-L245

# 14. API + Realtime

api/routes/
├── auth.py
├── businesses.py
├── agents.py
├── calls.py
├── knowledge.py
├── transactions.py
├── integrations.py
├── billing.py
└── verticals.py

realtime/twilio/
├── webhook.py
└── media_stream.py

The PRD's FastAPI surface includes Twilio voice webhook, media-stream WebSocket, business/vertical/knowledge/transaction endpoints and transcript retrieval. fileciteturn0file0L249-L261

# 15. Async Workers

workers/
├── jobs/
│   ├── ingest_document.py
│   ├── generate_embeddings.py
│   ├── summarize_call.py
│   ├── send_followup.py
│   └── calculate_usage.py
├── queue.py
└── scheduler.py

- Anything non-realtime should be kept out of the live call path.

- Use workers for embeddings, summaries, reminders, analytics aggregation and other background jobs.

# 16. Analytics & Observability

analytics/
├── call_metrics.py
├── latency.py
├── cost.py
├── outcomes.py
└── quality.py

common/observability/
├── logging.py
├── tracing.py
└── metrics.py

- Track STT, LLM and TTS latency separately.

- Track first-token and first-audio timing.

- Track tool latency/errors.

- Track transfer, resolution and task-success rates.

- Track provider failures and estimated cost per call.

The PRD requires structured logging, call-level tracing and per-stage latency metrics. fileciteturn0file0L200-L207

# 17. Infrastructure

infrastructure/
├── docker/
│   ├── api.Dockerfile
│   ├── realtime.Dockerfile
│   └── worker.Dockerfile
├── nginx/
├── monitoring/
│   ├── prometheus/
│   └── grafana/
└── deployment/
    ├── staging/
    └── production/

- Local: Docker Compose with FastAPI, Redis, PostgreSQL and vector DB.

- Production: Docker + VPS/managed infrastructure initially.

- Scale realtime workers horizontally when concurrency grows.

# 18. Shared Packages

packages/
├── shared-types/
│   ├── call.ts
│   ├── agent.ts
│   ├── tool.ts
│   └── transaction.ts
├── api-client/
├── ui/
└── config-schema/

Shared contracts prevent the three frontend apps and backend from drifting into incompatible data structures.

# 19. Documentation

docs/
├── product/
│   ├── PRD.md
│   ├── roadmap.md
│   └── pricing.md
├── architecture/
│   ├── system-architecture.md
│   ├── realtime-runtime.md
│   ├── conversation-engine.md
│   ├── rag.md
│   ├── tools.md
│   └── multi-tenancy.md
├── api/
│   ├── authentication.md
│   ├── webhooks.md
│   └── endpoints.md
├── verticals/
│   ├── clinic.md
│   ├── restaurant.md
│   └── templates.md
└── runbooks/
    ├── provider-outage.md
    ├── incident-response.md
    └── deployment.md

# 20. Non-Negotiable Architecture Rules

- Core engine NEVER contains `if vertical == clinic` business logic.

- Vertical behavior comes from config + registered tools.

- STT, LLM, TTS and telephony providers are adapters.

- Realtime call path must avoid slow document/DB work.

- Redis stores active call state; PostgreSQL stores durable data.

- RAG is tenant-isolated.

- Mutation tools are validated and idempotent.

- LLM never directly writes SQL/database records.

- Human transfer is first-class.

- Barge-in is part of the realtime runtime.

- Every call gets an end-to-end trace.

- Landing, Admin and Business Dashboard remain separate apps.

- Adding a vertical should not require modifying Conversation Engine.

# 21. First Build Sequence

1. Create monorepo + Landing/Admin/Dashboard.

1. Create FastAPI + database + Redis foundations.

1. Implement Twilio inbound webhook and Media Stream.

1. Implement STT adapter.

1. Implement Groq streaming adapter.

1. Implement TTS adapter.

1. Build the realtime Conversation Runtime.

1. Add VAD, turn detection and barge-in.

1. Add Redis session memory.

1. Add one vertical config and one complete transaction flow.

1. Add tool registry and validation.

1. Add RAG.

1. Add business dashboard agent builder.

1. Add call tracing/analytics.

1. Add second vertical to prove the engine is truly generic.

# 22. Final Architecture

┌──────────────────────┐
                  │    LANDING WEBSITE    │
                  │     Public SaaS       │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
     ┌──────▼───────┐                 ┌──────▼────────┐
     │  ADMIN PANEL │                 │ BUSINESS PANEL│
     │ Platform Ops │                 │ Agent Builder │
     └──────┬───────┘                 └──────┬────────┘
            └────────────────┬────────────────┘
                             ▼
                     ┌───────────────┐
                     │   FASTAPI API │
                     └───────┬───────┘
                             │
                  ┌──────────┴──────────┐
                  │                     │
          ┌───────▼────────┐    ┌──────▼──────┐
          │ REALTIME VOICE │    │   WORKERS   │
          │    RUNTIME     │    │ RAG / Jobs  │
          └───────┬────────┘    └─────────────┘
                  ▼
          ┌──────────────────────┐
          │ CONVERSATION ENGINE  │
          │ State • Memory • RAG │
          │ Tools • Guardrails   │
          └───┬──────┬──────┬───┘
              │      │      │
             STT    GROQ    TTS
              │      │      │
           Twilio   LLM  ElevenLabs
              │
           Caller

      Vertical Config + Tool Registry
      Clinic / Restaurant / E-commerce / Retail / ...

This architecture preserves the uploaded PRD's main design principle: a generic conversation engine with configurable verticals, business-specific knowledge/tools, realtime voice handling and separate SaaS surfaces. fileciteturn0file0L81-L128



| Vertical | Main intents | Typical tools |

| --- | --- | --- |

| Clinic | appointment, availability, cancel, reschedule, FAQ | calendar, patient lookup, transfer |

| Restaurant | reservation, order, menu FAQ, delivery | tables, POS/order |

| E-commerce | order status, return, stock, FAQ | orders, inventory, returns |

| Retail | stock, hours, price, location | inventory, store info |

| Salon/Spa | slot, service price, staff availability | calendar, staff schedule |

| Real Estate | property inquiry, site visit | CRM, calendar, property DB |

| Gym | membership, class, trial | membership, calendar |

| Hotel | room availability, booking, modification | PMS/booking |

| Service Center | service booking, status, pricing | job status, CRM |
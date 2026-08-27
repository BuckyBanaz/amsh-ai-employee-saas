---
description: Coding guidelines and architecture rules for the AI Receptionist platform based on product specs.
trigger: always_on
---

# AI Receptionist Platform Guidelines

These rules ensure the AI Receptionist codebase stays aligned with the core vision of a dynamic, configuration-driven, multi-vertical platform.

## 1. Core Architectural Principle: Generic & Config-Driven
- **NEVER hardcode vertical-specific logic** (e.g., `if businessType == "clinic"`).
- The platform must be **vertical-agnostic**. Support any business (clinic, restaurant, e-commerce, gym) via a configuration layer.
- Add a new vertical simply by adding a new configuration file, not by modifying core engine code.

## 2. Frontend Architecture (Dashboard)
- Build a **generic Business Dashboard** driven by a `Business Type + Capabilities + Configuration` system.
- Use a **Capability System** (e.g., appointments, customers, orders, menu). The frontend features (navigation, UI, tables) activate based on the capabilities returned by the backend.
- Define generic **Resources** (e.g., Customer, Service, Appointment) and map terminology per vertical (e.g., Clinic: Customer -> Patient; Restaurant: Customer -> Customer).
- Organize the frontend repository around features and business registry, separating capabilities from vertical configs.

## 3. Backend Architecture (Conversation Engine)
- The backend core is built in **Python and FastAPI**.
- Use **Twilio** for voice gateways (WebSocket media streams), **Deepgram/Groq Whisper** for STT, **Groq LLM** for fast inference, and **ElevenLabs/Cartesia** for TTS.
- Implement a **deterministic state machine** per call. Do NOT make the conversation manager purely LLM-based. 
- Use Python code for field validation, tool routing, and business rules to maintain low latency (<800ms) and avoid hallucinations.
- Maintain a structured memory per call (short-term in Redis) and persistent caller history (Postgres).
- Implement an isolated **Knowledge Base / RAG** per business using a Vector DB for answering FAQ and policies.
- Ensure **barge-in support** (interrupting the AI instantly via VAD).

## 4. Vertical Config Layer
- Every vertical uses a config file (YAML/JSON) defining:
  - Intents list
  - Required fields
  - Tool mappings (function calling)
  - Prompt templates and terminology

## 5. Security and Guardrails
- Securely handle and mask PII (names, phone numbers, payments) in logs.
- Add guardrails to transfer out-of-scope requests to a human agent.
- Ensure multi-tenancy data isolation.

## 6. Goal Alignment
- Focus on building an MVP first with a generic engine + ONE vertical (e.g., Clinic) as a proof-of-concept before adding more. 

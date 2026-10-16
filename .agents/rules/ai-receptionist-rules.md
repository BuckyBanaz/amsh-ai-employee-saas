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

## 7. Conversational NLU & Persona Intelligence
- **5-Way Categorization**: Every turn must be classified into `persona`, `action`, `knowledge`, `out_of_scope`, or `ambiguous_unclear`.
- **No Monolithic Fallbacks**: Never collapse distinct user intents (FAQ vs. chit-chat vs. broken audio vs. persona) into a single generic booking fallback.
- **Dynamic Persona & Identity**: The AI must know its own identity (`agent.name`, business name, role) and handle questions like *"What is your name?"* or *"Are you an AI?"* naturally.
- **Context & Correction Awareness**: Handle slot corrections (*"Actually Thursday"*, *"Make it 5 PM"*) by overriding slots rather than creating conflicting states.
- **Lean Real-Time Pipeline**: Do NOT introduce heavy abstractions (LangChain/spaCy) into the real-time audio loop. Keep inference single-pass (<250ms) using Groq JSON mode + deterministic State Machine.

## 8. Target Direction: LLM Agent + Tool Calling (Planned, see `DOCS/16_...`)
- **Status**: Implemented 2026-09-28 behind `CONVERSATION_ENGINE` (default `state_machine`). Rules 3 and 7 still describe the live engine for every tenant until the agent is enabled for them.
- **Never run live LLM evals casually**: the Groq on-demand tier allows only 200k tokens/day for the whole org; a full agent eval (~240 calls) can exhaust it and break live calls. Ask first, run once, and prefer `python -m unittest backend.ai.evals.test_agent_core` (no network).
- **Grounding**: booking name/phone/date/time must trace back to caller words (`validator.ground_booking`); reply times must come from the caller, a tool or clinic hours (`grounding.py`). Do not weaken these to make an eval pass.
- **Hybrid split**: the LLM converses (persona, small talk, out-of-scope, corrections, phrasing); Python decides actions. Do not add new regex/template branches for conversational cases the LLM agent will cover.
- **LLM asks, code decides**: booking, cancel, reschedule and transfer go through validated tools. `business_id`, `call_id`, `caller_number` are injected by the runtime, never LLM arguments. Booking requires a confirmation read-back enforced in code.
- **Facts only from context**: hours, doctors, services and prices come from DB/RAG in the prompt. Unknown facts mean offer a staff transfer, never a guess.
- **Static on purpose**: emergency/safety escalation and PII masking stay deterministic, before the LLM.
- **Evals before refactor**: no engine change ships without the eval suite (`backend/ai/evals/`) showing no regression.
- **Change tracking**: every Claude session logs its changes in `DOCS/17_AMSh_Claude_Change_Tracker.md`.

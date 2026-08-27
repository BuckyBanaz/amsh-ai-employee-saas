# AI Receptionist Platform - Architecture Overview

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

# AMSh — Conversational NLU, Persona & Intelligent Dialog System Specification

> **Status note (2026-09-28):** spec for the older state-machine/NLU engine. The live engine is the tool-calling agent described in `16_*Tool_Calling_Architecture_Plan.md`; treat this file as background only.

**Document Version:** 1.0.0  
**Status:** Architecture Blueprint & Implementation Specification  
**Focus:** Conversational Natural Language Understanding (NLU), Persona Identity, Dynamic Dialog Management, and Multi-Category Intent Routing  

---

## 1. Executive Summary & Problem Diagnosis

AMSh is designed as a hybrid voice receptionist platform combining deterministic business workflows with low-latency LLM intelligence. 

### The Diagnostic Finding
Previously, when callers interacted with the receptionist outside a rigid booking happy-path, the system exhibited significant conversational failure modes:
1. **Identical Fallback Trapping:**
   - Case A (Clinic FAQ): *"Clinic Sunday ko open hoti hai?"*
   - Case B (Out-of-Scope): *"Who is the Prime Minister of India?"* / *"Do you play cricket?"*
   - Case C (Ambiguous Reference): *"Woh wala kal kar dena"*
   - Case D (Nonsense / Broken Audio): *"Potato helicopter"* / *"Blue banana doctor"*
   - 👉 **All 4 distinct cases collapsed into the identical generic response:**
     > *"I'm here to help with scheduling appointments, checking doctors, or clinic hours. What can I do for you?"*
2. **Missing Persona & Identity Awareness:**
   - Callers asking *"Aapka naam kya hai?"*, *"Who are you?"*, or *"Kya aap robot ho?"* were met with the generic appointment booking message because the state machine had no concept of agent identity, despite `Agent.name` existing in the PostgreSQL database.
3. **Rigid Template Delivery:**
   - Every slot question was a static string from i18n JSON files, causing the bot to sound like an IVR tree rather than an intelligent receptionist.
4. **Context Blindness in Corrections:**
   - Utterances like *"Actually Thursday kar do"* or *"Make it 5 PM instead"* risked resetting state or falling into generic fallbacks rather than performing slot replacement.

---

## 2. Core Architectural Philosophy

### "LLM Understands, State Machine Controls, Tools Execute, Persona Delivers"

```
                    CALLER VOICE
                         │
                         ▼
                   Deepgram STT
                         │ (Transcript)
                         ▼
        ┌───────────────────────────────────┐
        │  Safety Guardrails (0ms Python)   │ ── Emergency ──> Immediate Escalation
        └─────────────────┬─────────────────┘
                          │ Normal Speech
                          ▼
        ┌───────────────────────────────────┐
        │      Conversational NLU Layer     │
        │   (Groq LLaMA 3.1 / JSON Mode)    │
        │                                   │
        │ 1. Semantic Category Classification│
        │ 2. Intent Identification          │
        │ 3. Entity & Slot Extraction       │
        │ 4. Persona / Identity Detection   │
        │ 5. Anaphora & Context Resolution  │
        │ 6. Confidence Scoring (0.0 - 1.0) │
        └─────────────────┬─────────────────┘
                          │ Structured NLU Output
                          ▼
        ┌───────────────────────────────────┐
        │   Deterministic State Machine     │
        │                                   │
        │ ├── Persona ───────> Agent Name/ID│
        │ ├── Out-of-Scope ──> Scope Redirect
        │ ├── Unclear/Nonsense ─> Repetition │
        │ ├── Ambiguous ─────> Clarification│
        │ ├── Clinic FAQ ────> RAG + DB     │
        │ └── Action/Booking ─> Slot Engine  │
        └─────────────────┬─────────────────┘
                          │ Factual State & Context
                          ▼
        ┌───────────────────────────────────┐
        │ Natural Response Generator (Groq) │
        │ (Factually bounded by DB & State) │
        └─────────────────┬─────────────────┘
                          │ Spoken Text
                          ▼
                     Cartesia TTS
                          │ Audio Stream
                          ▼
                    CALLER EARS
```

---

## 3. Five-Way Semantic Categorization Taxonomy

The NLU layer categorizes every user turn into one of 5 fundamental semantic categories before routing to business logic:

| Category | Definition | Examples | System Action |
|---|---|---|---|
| **`persona`** | Caller asks about the AI, its name, role, identity, or human status | *"Aapka naam kya hai?"*, *"Who am I speaking with?"*, *"Are you an AI?"* | Responds using dynamic tenant persona (`Agent.name`, business name, role) with polite human transfer option |
| **`action`** | Concrete business workflows (booking, reschedule, cancel, availability) | *"Kal doctor se milna hai"*, *"Can I book an appointment with Dr. Sharma?"* | Enters deterministic slot collection and validation loop |
| **`knowledge`** | Legitimate questions about clinic hours, doctors, treatments, fees, policies | *"Clinic Sunday ko open hoti hai?"*, *"Do you offer dental implants?"* | Queries PostgreSQL Catalog + Vector RAG without resetting booking slots |
| **`out_of_scope`**| Off-topic queries, world trivia, personal questions, unrelated topics | *"Who is the Prime Minister of India?"*, *"Do you like cricket?"* | Friendly boundary redirect without pushing appointment sales |
| **`ambiguous_unclear`**| Low STT confidence, nonsense phrases, or context-dependent pronouns without reference | *"Potato helicopter"*, *"Woh wala kal kar do"* (with no active appointment) | Politely asks for clarification or repetition based on confidence score |

---

## 4. Persona & Agent Identity System

### 4.1 Dynamic Persona Injection
Every tenant configures their receptionist in the database:
- `Agent.name` (e.g., *"Maya"*, *"Aura"*, *"Priya"*)
- `Business.name` (e.g., *"Sanjeevani Dental Clinic"*, *"City Heart Hospital"*)
- `Agent.config['personality']` (e.g., *"professional"*, *"empathetic"*, *"friendly"*)
- `Agent.config['transfer_phone']` (Human front desk handover number)

### 4.2 Handling Identity Inquiries
1. **"What is your name? / Who are you?":**
   - Natural response: *"Main {agent_name} hoon, {business_name} ki AI receptionist. Bataiye, main aapki kya madad kar sakti hoon?"*
   - English: *"I am {agent_name}, the AI receptionist at {business_name}. How can I assist you today?"*
2. **"Are you a robot / AI or a real human?":**
   - Natural response: *"Main ek AI voice assistant hoon jo {business_name} ki help ke liye banayi gayi hoon. Agar aap kisi human staff se baat karna chahte hain, toh main call transfer kar sakti hoon."*

---

## 5. Conversational NLU Schema & Protocol

### 5.1 Single-Pass Groq JSON Prompt
To maintain **<250ms inference**, NLU performs intent classification, slot extraction, persona detection, confidence scoring, and context resolution in **one single request**:

```json
{
  "category": "persona | action | knowledge | out_of_scope | ambiguous_unclear",
  "intent": "agent_identity | appointment_booking | check_availability | clinic_faq | out_of_scope | clarification_needed | repetition_needed",
  "confidence": 0.94,
  "slots": {
    "patient_name": "Parikshit Verma",
    "doctor_name": "Dr. Sharma",
    "service_name": "Dental Consultation",
    "preferred_date": "2026-09-29",
    "preferred_time": "17:00",
    "phone_number": "9876543210"
  },
  "correction": {
    "is_correction": true,
    "slot_overridden": "preferred_date"
  },
  "context_resolution": {
    "referenced_entity": "previous_slot",
    "resolved_text": "Rescheduling existing appointment date to Thursday"
  }
}
```

### 5.2 Confidence Thresholds
- **High Confidence ($\ge 0.75$):** Directly execute the determined category workflow.
- **Medium Confidence ($0.45 \le score < 0.75$):** Prompt targeted clarification (e.g., *"Did you want to see Dr. Sharma or Dr. Miller?"*).
- **Low Confidence ($< 0.45$):** Polite repetition prompt (e.g., *"I'm sorry, the line broke up slightly. Could you please say that again?"*).

---

## 6. Implementation Roadmap (Tier 1 Execution)

1. **Step 1: Locales & Configuration Expansion**
   - Update `en.json`, `hi.json`, `es.json`, `nl.json` with keys for:
     - `persona_identity`, `persona_is_ai`, `out_of_scope_redirect`, `unclear_speech_repeat`, `ambiguous_clarification`.
   - Update `VerticalConfig` (`clinic/*.yaml`) to register `agent_identity`, `clinic_hours`, `clinic_services`, `pricing_information`.
2. **Step 2: Conversational NLU Core Engine**
   - Create `backend/ai/engine/conversation/nlu.py`.
   - Implement `ConversationalNLU` with session history awareness, persona injection, and robust fallback parsers.
3. **Step 3: State Machine Dynamic Router Upgrade**
   - Update `backend/ai/engine/conversation/state_machine.py`.
   - Replace rigid regexes and the single `no_intent_guidance` catch-all with multi-category state routing.
   - Inject `agent_name` and full agent settings into `business_info`.
4. **Step 4: Gateway Integration**
   - Connect `backend/ai/realtime/twilio/gateway.py` (both live WebSocket media streams and playground simulator) to use the new NLU pipeline.
5. **Step 5: Automated Testing & Validation**
   - Create `backend/tests/test_conversational_nlu.py` testing all 5 categories, identity questions, corrections, and multilingual variations.

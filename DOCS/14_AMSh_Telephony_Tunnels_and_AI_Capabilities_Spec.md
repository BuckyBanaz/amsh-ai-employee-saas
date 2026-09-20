# AMSh Architecture Spec: Call Tunnels, AI Capabilities & Notification Hub

This specification outlines the modular architecture for:
1. **Multi-Country Call Tunnels (`backend/ai/telephony/` / `call_tunnels/`)**
2. **Modular AI Capabilities Layer (Rules, Skills, Read/Write Operations)**
3. **Omnichannel Notification Engine (`backend/server/notifications/`)**

---

## 1. Multi-Country Telephony Call Tunnels (`call_tunnels/`)

To make global expansion effortless across different countries (India, US, UK, Middle East, Europe), telephony adapters are isolated behind a unified abstract interface:

```
                                  ┌──────────────────────────────┐
                                  │   Abstract Telephony Tunnel  │
                                  │    (BaseGateway / Protocol)  │
                                  └──────────────┬───────────────┘
                                                 │
            ┌───────────────────┬────────────────┴───────────────────┬───────────────────┐
            ▼                   ▼                                    ▼                   ▼
    ┌───────────────┐   ┌───────────────┐                    ┌───────────────┐   ┌───────────────┐
    │     INDIA     │   │   US / UK     │                    │  MIDDLE EAST  │   │  SOUTHEAST    │
    │ Exotel Tunnel │   │ Twilio Tunnel │                    │ Telnyx Tunnel │   │ Plivo/Sinch   │
    │ (PCM16 8kHz)  │   │ (μ-law 8kHz)  │                    │ (Opus/PCM16)  │   │ (PCM / μ-law) │
    └───────────────┘   └───────────────┘                    └───────────────┘   └───────────────┘
```

### Folder Structure:
```
backend/ai/realtime/call_tunnels/
├── base_tunnel.py           # Abstract BaseGateway (on_audio_chunk, send_audio, on_hangup, on_dtmf)
├── exotel_tunnel.py         # India (+91 DIDs) - PCM16 Linear 8kHz, JSON Voicebot Applet
├── twilio_tunnel.py         # US/Global (+1 DIDs) - μ-law 8kHz Media Streams
├── telnyx_tunnel.py         # Middle East / Europe expansion
├── plivo_tunnel.py          # Southeast Asia / Alternative global
└── router.py                # Smart DID/Country router (maps incoming request to correct tunnel)
```

---

## 2. AI Capabilities Architecture (Rules, Skills, Operations)

Separates the AI intelligence into 3 clean, composable sub-layers:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             AI CAPABILITY LAYER                                  │
│                                                                                  │
│   ┌─────────────────────┐   ┌────────────────────────┐   ┌───────────────────┐   │
│   │     1. RULES        │   │       2. SKILLS        │   │   3. OPERATIONS   │   │
│   │ (Guardrails/Policy) │   │ (Intent Conversational)│   │   (Read / Write)  │   │
│   ├─────────────────────┤   ├────────────────────────┤   ├───────────────────┤   │
│   │ • Emergency Rule    │   │ • Schedule Appointment │   │ READ:             │   │
│   │ • Working Hours     │   │ • Reserve Table        │   │ • Retrieve Staff  │   │
│   │ • Medical Boundary  │   │ • Query Service FAQ    │   │ • Check Open Slots│   │
│   │ • PII Redaction     │   │ • Solopreneur Screen   │   │ • Fetch RAG Docs  │   │
│   │ • Call Duration Max │   │ • Reschedule / Cancel  │   │ WRITE:            │   │
│   │                     │   │                        │   │ • Store Booking   │   │
│   │                     │   │                        │   │ • Update CRM / DB │   │
│   │                     │   │                        │   │ • Trigger Alerts  │   │
│   └─────────────────────┘   └────────────────────────┘   └───────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Folder Structure:
```
backend/ai/capabilities/
├── rules/                   # Deterministic boundaries & guardrails
│   ├── safety_emergency.py  # Zero-latency emergency handoff
│   ├── business_hours.py    # After-hours behavior & voicemail
│   ├── compliance_pii.py    # Masking patient/customer sensitive data
│   └── rate_limits.py       # Call duration & max turn safeguards
│
├── skills/                  # Conversational workflows & slot collectors
│   ├── appointment_booking.py
│   ├── table_reservation.py
│   ├── faq_answering.py
│   ├── lead_qualification.py
│   └── call_transfer_escalation.py
│
└── operations/              # Concrete data mutations (Read vs. Write)
    ├── read/                # Information retrieval
    │   ├── get_doctor_schedule.py
    │   ├── get_service_catalog.py
    │   ├── search_knowledge_base.py
    │   └── get_customer_history.py
    └── write/               # Data persistence & side effects
        ├── store_appointment.py
        ├── update_customer_profile.py
        ├── log_call_transcript.py
        └── dispatch_notification.py
```

---

## 3. Server Omnichannel Notification Hub (`backend/server/notifications/`)

A dedicated notification engine in `backend/server` to handle all post-call alerts, booking confirmations, and staff reminders:

```
                                  ┌───────────────────────────────┐
                                  │      Notification Hub         │
                                  │   (Priority Queue & Router)   │
                                  └───────────────┬───────────────┘
                                                  │
            ┌───────────────────┬─────────────────┴─────────────────┬───────────────────┐
            ▼                   ▼                                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐                   ┌───────────────┐   ┌───────────────┐
    │   SMS HUB     │   │  WHATSAPP HUB │                   │   EMAIL HUB   │   │ APP PUSH HUB  │
    │ Exotel (India)│   │ Meta Cloud API│                   │ Resend / SES  │   │ Expo / FCM    │
    │ Twilio (Global│   │ Twilio WA API │                   │ Postmark      │   │ Webhook Push  │
    └───────────────┘   └───────────────┘                   └───────────────┘   └───────────────┘
```

### Folder Structure:
```
backend/server/notifications/
├── dispatcher.py            # Central priority dispatcher (async background tasks)
├── channels/
│   ├── sms/                 # SMS dispatchers
│   │   ├── exotel_sms.py    # India (+91)
│   │   └── twilio_sms.py    # Global (+1 / International)
│   ├── whatsapp/            # WhatsApp interactive templates
│   │   ├── meta_cloud.py    # Official Meta WhatsApp Cloud API
│   │   └── twilio_wa.py     # Twilio WhatsApp adapter
│   ├── email/               # Transactional email confirmations
│   │   ├── resend_email.py  # Resend API
│   │   └── templates/       # HTML responsive templates (Appointment confirmation, Daily report)
│   └── push/                # Dashboard / Mobile app live notifications
│       ├── fcm_push.py      # Firebase Cloud Messaging
│       └── sse_events.py    # Server-Sent Events to live Tenant Dashboard
└── templates/               # Multilingual message templates (English, Hindi, etc.)
```

---

## Benefits of this Modular Setup:
1. **Instant Country Expansion**: Launching in UAE, UK, or Germany requires only adding one file in `call_tunnels/`.
2. **Pluggable AI Skills**: Adding a new vertical means picking existing skills (e.g. `appointment_booking` + `store_appointment`).
3. **Multi-Channel Delivery**: A booked appointment automatically sends a WhatsApp message + SMS + Dashboard SSE alert through a single `NotificationDispatcher.send()` call.

---

## 4. Multi-Language Localization Strategy (I18n)

To support seamless global scaling and multi-language AI interactions (e.g., Hindi, English, Spanish) while maintaining strict **<800ms latency** and preventing LLM translation hallucinations, the system employs a **Config-Driven I18n Dictionary Architecture**:

1. **Schema-Only Verticals**: 
   The core `backend/ai/verticals/configs/*.yaml` files define ONLY the logical schema (intents, slots, data types, tools). Text strings in prompts are replaced with localization keys.
   ```yaml
   # clinic.yaml
   slots:
     - name: patient_name
       prompt_key: "appointment.slots.patient_name.prompt"
   ```

2. **Language Dictionaries (JSON)**:
   The actual dialogue texts reside in dedicated locale dictionaries (`locales/en.json`, `locales/hi.json`, `locales/es.json`).
   ```json
   // hi.json
   {
     "appointment.slots.patient_name.prompt": "Aapka poora naam kya hai?"
   }
   ```

3. **Zero-Latency Injection**:
   During the call, the `ConversationStateMachine` resolves the bot's next prompt directly from the JSON dictionary matching the Agent's configured `primary_language`. This removes the need for real-time LLM translation passes, securing low latency and ensuring 100% deterministic, hallucination-free speech output.

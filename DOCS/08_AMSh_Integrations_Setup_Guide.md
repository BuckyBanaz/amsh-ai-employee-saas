# AMSh AI Receptionist — Third-Party Integrations & Setup Guide

This document provides a step-by-step onboarding and integration guide for connecting **WhatsApp Business API**, **Twilio Voice**, **Deepgram (STT)**, **Groq (LLM)**, and **Cartesia / ElevenLabs (TTS)** into the AMSh platform.

---

## 1. WhatsApp Business API Setup

There are two primary integration routes for WhatsApp:
1. **Direct Meta Cloud API (Recommended for Production & Cost-Efficiency)**
2. **Twilio WhatsApp API (Fastest to set up if already using Twilio for voice)**

---

### Option A: Meta Cloud API (Official & Lowest Cost)

Meta gives **1,000 free service conversations every month**. Beyond that, you only pay Meta's base message rates with zero middleman markup.

#### Step-by-Step Onboarding:
1. **Create Meta Developer Account:**
   - Go to [Meta for Developers](https://developers.facebook.com/) and log in with your Facebook account.
2. **Create a Meta App:**
   - Click **My Apps** -> **Create App**.
   - Select **Other** as use case -> choose **Business** app type.
   - Give your app a name (e.g., `AMSh AI Receptionist`) and link your Business Account.
3. **Add WhatsApp Product:**
   - On the App Dashboard, find **WhatsApp** and click **Set up**.
   - You will be redirected to the **API Setup** page.
4. **Get Development Sandbox Credentials:**
   - Meta assigns a temporary test phone number and a **Temporary Access Token** (valid for 24h).
   - Copy the following into your `.env`:
     ```env
     META_WA_PHONE_NUMBER_ID=your_phone_number_id
     META_WA_BUSINESS_ACCOUNT_ID=your_waba_id
     META_WA_ACCESS_TOKEN=your_permanent_or_temp_token
     META_WA_VERIFY_TOKEN=your_custom_webhook_secret
     ```
5. **Configuring the Inbound Webhook:**
   - In the Meta App dashboard, go to **WhatsApp** -> **Configuration**.
   - Click **Edit Webhook**.
   - Callback URL: `https://api.yourdomain.com/api/v1/integrations/whatsapp/webhook`
   - Verify Token: Enter the value set in `META_WA_VERIFY_TOKEN`.
   - Under **Webhook fields**, subscribe to: `messages`.
6. **Moving to Production:**
   - Go to **WhatsApp** -> **API Setup** -> **Step 5: Add a phone number**.
   - Enter a clean phone number (must **not** currently be registered on standard WhatsApp/WhatsApp Business app).
   - Complete OTP verification and Meta Business Verification.
   - Generate a **System User Permanent Access Token** in Meta Business Manager (`business.facebook.com`).

---

### Option B: Twilio WhatsApp API (Unified with Twilio Voice)

If you prefer managing voice, SMS, and WhatsApp under one single dashboard/billing account.

#### Step-by-Step Onboarding:
1. Go to [Twilio Console](https://console.twilio.com/).
2. Navigate to **Messaging** -> **Try SMS / WhatsApp** -> **Send a WhatsApp message**.
3. Activate the **Twilio Sandbox for WhatsApp**:
   - Send the join phrase (e.g., `join <keyword>`) from your personal WhatsApp to Twilio’s sandbox number.
4. Set Sandbox Inbound Webhook:
   - Go to **Messaging** -> **Settings** -> **WhatsApp Sandbox Settings**.
   - Set **"WHEN A MESSAGE COMES IN"** URL to:
     `https://api.yourdomain.com/api/v1/integrations/twilio/whatsapp/webhook` (HTTP POST).
5. Production Setup:
   - In Twilio Console, navigate to **Messaging** -> **Senders** -> **WhatsApp Senders**.
   - Click **New WhatsApp Sender** and submit your Meta Business Manager ID for Twilio-hosted approval.

---

## 2. Twilio Voice Integration (Real-Time Media Streams)

Twilio handles PSTN phone numbers, inbound incoming calls, and bidirectional audio streaming over WebSockets.

### Step-by-Step Setup:
1. **Sign Up & Account Setup:**
   - Register at [Twilio](https://www.twilio.com/) (Trial accounts come with ~$15–$20 in credits).
2. **Retrieve Account Credentials:**
   - From the [Twilio Console Homepage](https://console.twilio.com/):
     - Copy `Account SID` -> `TWILIO_ACCOUNT_SID`
     - Copy `Auth Token` -> `TWILIO_AUTH_TOKEN`
3. **Purchase a Voice-Enabled Number:**
   - Go to **Phone Numbers** -> **Manage** -> **Buy a number**.
   - Ensure the number supports **Voice**.
   - Copy number -> `TWILIO_PHONE_NUMBER` (E.164 format, e.g., `+1234567890`).
4. **Configure Inbound Call Webhook (TwiML / WebSocket Stream):**
   - Click on your purchased phone number -> scroll to **Voice Configuration**.
   - Under **"A CALL COMES IN"**, select **Webhook** (HTTP POST):
     `https://api.yourdomain.com/api/v1/voice/twiml/incoming`
   - The FastAPI backend responds with TwiML instructions directing Twilio to stream audio to our WebSocket:
     ```xml
     <?xml version="1.0" encoding="UTF-8"?>
     <Response>
         <Connect>
             <Stream url="wss://api.yourdomain.com/api/v1/voice/stream" />
         </Connect>
     </Response>
     ```

---

## 3. Deepgram (Speech-to-Text / STT)

Deepgram Nova-2 provides ultra-low latency (<200ms) real-time streaming audio transcription via WebSocket.

### Step-by-Step Setup:
1. Sign up at [Deepgram Console](https://console.deepgram.com/) ($200 free trial credits).
2. Go to **API Keys** -> click **Create a New API Key**.
3. Set key permissions to `Member` or `Admin`.
4. Copy the API Key to `.env`:
   ```env
   DEEPGRAM_API_KEY=your_deepgram_key
   ```
5. **Recommended Streaming Configuration:**
   - Model: `nova-2`
   - Encoding: `mulaw` (Twilio 8kHz stream format)
   - Sample Rate: `8000`
   - Endpointing: `300ms` (for fast turn detection)
   - Interim results: `true`

---

## 4. Groq (Ultra-Fast LLM Inference)

Groq LPU hardware runs Llama 3 models at 300–500 tokens/second, keeping voice response latency sub-second.

### Step-by-Step Setup:
1. Sign up at [Groq Console](https://console.groq.com/).
2. Navigate to **API Keys** -> click **Create API Key**.
3. Copy the key to `.env`:
   ```env
   GROQ_API_KEY=gsk_your_groq_api_key
   ```
4. **Recommended Production Models:**
   - Primary: `llama-3.3-70b-versatile` (complex reasoning, tool calling)
   - Fast Turnaround: `llama-3.1-8b-instant` (simple greetings & clarifications)

---

## 5. Cartesia / ElevenLabs (Text-to-Speech / TTS)

Converts generated text responses back into realistic audio chunks streamed back to Twilio.

### Option A: Cartesia (Recommended for Ultra-Low Latency Voice)
1. Sign up at [Cartesia Play](https://play.cartesia.ai/).
2. Go to **API Keys** -> generate new key.
3. Save to `.env`:
   ```env
   CARTESIA_API_KEY=your_cartesia_key
   ```
4. Output format: `pcm_mulaw_8000` (Directly compatible with Twilio audio stream with zero transcoding overhead).

### Option B: ElevenLabs (Recommended for High Naturalness)
1. Sign up at [ElevenLabs](https://elevenlabs.io/).
2. Go to **Profile** -> **API Keys** -> copy API key.
3. Save to `.env`:
   ```env
   ELEVENLABS_API_KEY=your_elevenlabs_key
   ```
4. Output format: `ulaw_8000` (via WebSockets streaming API).

---

## 6. Complete `.env` Configuration Reference

```env
# ── Application Settings ────────────────────────────────────────────────
ENV=development
DEBUG=true
DATABASE_URL=postgresql+psycopg2://amsh:amsh@localhost:5432/amsh
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secure-jwt-secret-key-min-32-chars

# ── Twilio Telephony ──────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# ── Voice Engine (STT -> LLM -> TTS) ──────────────────────────────────
DEEPGRAM_API_KEY=your_deepgram_api_key
GROQ_API_KEY=gsk_your_groq_api_key
CARTESIA_API_KEY=your_cartesia_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# ── WhatsApp Integration (Meta Cloud API) ─────────────────────────────
META_WA_PHONE_NUMBER_ID=your_phone_number_id
META_WA_BUSINESS_ACCOUNT_ID=your_waba_id
META_WA_ACCESS_TOKEN=your_meta_system_user_token
META_WA_VERIFY_TOKEN=amsh_secure_verify_token_2026
```

---

## 7. Real-Time Voice & Message Data Flow

```
[Inbound Phone Call]
        │
        ▼
   [Twilio PSTN]
        │ (WebSocket - 8kHz μ-law audio)
        ▼
   [AMSh FastAPI Voice Gateway]
        │
        ├──► [Deepgram Nova-2] (Realtime STT Stream)
        │           │
        │           ▼ (User Transcript)
        ├──► [Deterministic State Machine + Business Rules]
        │           │
        │           ▼ (Context + Prompt)
        ├──► [Groq Llama 3.3] (Fast LLM Tool & Sentence Generation)
        │           │
        │           ▼ (Streaming Tokens)
        ├──► [Cartesia Sonic TTS] (Generates 8kHz μ-law Audio)
        │           │
        │           ▼ (Audio Chunks)
        └──► [Twilio Audio Stream Output] -> [User Hears Voice]

[Post-Call / Action Completed]
        │
        ▼
   [Meta / Twilio WhatsApp API]
        │
        ▼
   [WhatsApp Confirmation Message sent to User]
```

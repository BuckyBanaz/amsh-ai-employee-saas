# Conversation Engine Flow

This flowchart illustrates the real-time AI Voice pipeline architecture using Twilio for telephony, Deepgram for Speech-to-Text, Groq for the LLM Brain, and Fish Voice for Text-to-Speech.

```mermaid
flowchart TD
    %% Caller Interaction
    Caller(("Patient / Caller")) <-->|Phone Call| Twilio["Twilio (SIP/Voice)"]
    
    %% Real-time connection
    Twilio <-->|"WebSocket (WSS) \n Audio Media Stream"| FastAPI["FastAPI Engine (Python)"]
    
    %% STT Pipeline
    FastAPI -->|"Stream Audio Packets"| STT["Speech-to-Text \n (Deepgram)"]
    STT -->|"Return Transcribed Text"| Brain["Conversation Manager \n (State & Logic)"]
    
    %% LLM Pipeline
    Brain -->|"Prompt + Context \n (History & Tools)"| LLM["LLM Inference \n (Groq)"]
    LLM -->|"Return Text Response \n (Streaming)"| Brain
    
    %% TTS Pipeline
    Brain -->|"Send AI Text Response"| TTS["Text-to-Speech \n (Fish Voice)"]
    TTS -->|"Return Audio Bytes \n (Streaming)"| FastAPI
    
    %% Feedback to Caller
    FastAPI -->|"Send Audio Packets \n via WebSocket"| Twilio
    
    %% Styling
    classDef external fill:#F3F4F6,stroke:#6B7280,stroke-width:2px;
    classDef core fill:#EFF6FF,stroke:#2563EB,stroke-width:2px;
    classDef ai fill:#FDF4FF,stroke:#C026D3,stroke-width:2px;
    classDef caller fill:#ECFCCB,stroke:#65A30D,stroke-width:2px;
    
    class Caller caller;
    class Twilio,STT,LLM,TTS external;
    class FastAPI,Brain core;
```

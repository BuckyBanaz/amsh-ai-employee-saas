# Amsh - Project Overview

## Motive & Vision
Amsh is a generic, configuration-driven, multi-vertical AI Receptionist platform. It is designed to act as an automated, intelligent receptionist for various businesses—ranging from clinics to restaurants, hotels, and beyond.

Instead of hardcoding logic for specific business types, Amsh utilizes a generic engine. The system's behavior, terminology, intents, and capabilities are determined dynamically based on the configuration of the specific business vertical.

## Key Principles
1. **Vertical Agnostic:** Never hardcode vertical-specific logic. Support any business via a configuration layer.
2. **Capability System:** The frontend dashboard adapts based on the features the business supports (e.g., appointments, orders, menu).
3. **Deterministic Core:** The conversation engine is built on Python and FastAPI. It uses a deterministic state machine, Twilio, Deepgram/Groq Whisper, Groq LLM, and ElevenLabs/Cartesia. It relies on code for validation and tool routing to maintain low latency and avoid hallucinations.

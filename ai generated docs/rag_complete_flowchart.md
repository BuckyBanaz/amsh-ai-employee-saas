# 🧠 Amsh AI Receptionist — Complete RAG Architecture

> **Target Latency:** < 800ms end-to-end (perceived ~250ms with filler word trick)

---

## 📌 Recommended RAG Stack

| Layer | Technology | Why |
|---|---|---|
| **Voice Gateway** | Twilio WebSocket | Low-latency media streaming |
| **STT** | Deepgram (`nova-2`) | Streaming partial transcripts, ~50ms |
| **Intent Classifier** | Groq (Llama-3 8B) | Ultra-fast classification, ~70ms |
| **Embeddings** | `text-embedding-3-small` (OpenAI) or BGE-M3 (local) | Fast, cheap, high quality |
| **Vector DB** | **Qdrant** (self-host) | Hybrid search + metadata filtering natively |
| **LLM Generation** | Groq (Llama-3 70B or Mixtral) | Fastest LPU inference |
| **TTS** | Cartesia / ElevenLabs | First audio byte in ~150ms |
| **Short-term Memory** | Redis | Per-call conversation state |
| **Long-term DB** | PostgreSQL | Caller history, business config |

---

## 🔄 FULL CALL FLOW — Real-Time Voice + RAG Pipeline

```mermaid
flowchart TD
    A(["📞 Caller Dials In"]) --> B["Twilio\n(SIP / WebSocket)"]
    B <-->|"Audio Stream\nWSS"| C["FastAPI Engine\n(Python)"]
    
    C --> D["🎙️ Deepgram STT\nStreaming Transcription\n~50ms"]
    D -->|"Partial + Final\nTranscripts"| E["🧠 State Machine\n(Conversation Manager)"]
    
    E --> VAD["⚡ VAD Endpoint Detection\n~250ms — User stopped speaking?"]
    VAD -->|"No, still talking"| E
    VAD -->|"Yes — Trigger Response"| FILLER["🗣️ Play Filler Word\n'Let me check...' ~0ms\nbuys 400ms of thinking time"]
    
    FILLER --> INTENT["🔍 Intent Classifier\nGroq Llama-3 8B\n~70ms"]
    
    INTENT -->|"book_appointment\nreschedule / cancel"| TOOL["🔧 Tool Calling Path\n(No RAG needed!)"]
    INTENT -->|"ask_question\nFAQ / policy"| RAG_PATH["📚 RAG Path Triggered"]
    INTENT -->|"small_talk\ngreet"| LLM_DIRECT["💬 Direct LLM Response\n(No DB lookup)"]
    
    subgraph RAG ["📚 RAG Pipeline - only for ASK_QUESTION intent"]
        RAG_PATH --> EMB["⚡ Generate Query Embedding\ntext-embedding-3-small\n~30ms"]
        EMB --> VECT["🔎 Qdrant Hybrid Search\nSemantic + BM25 Keyword\nFilter: business_id = tenant_123\n~40ms"]
        VECT -->|"Top 2-3 Chunks\nonly most relevant"| CTX["📋 Context Injection\nInto LLM Prompt"]
    end
    
    subgraph TOOL_PATH ["🔧 Tool Calling Path"]
        TOOL --> DB_CHECK["PostgreSQL\nCheck Availability"]
        DB_CHECK --> BOOK["Create or Update\nAppointment Record"]
        BOOK --> TOOL_RESP["Structured Response\ne.g. 'Tuesday 3pm confirmed'"]
    end
    
    CTX --> LLM["⚡ Groq LLM\nMixtral / Llama-3 70B\n~70ms TTFT\nMax 2 sentences for voice!"]
    TOOL_RESP --> LLM
    LLM_DIRECT --> LLM
    
    LLM -->|"Streaming Token Output\nChunk by sentence"| TTS["🔊 TTS Engine\nCartesia / ElevenLabs\n~150ms first audio byte"]
    
    TTS -->|"Audio Stream"| C
    C -->|"WebSocket\nAudio Packets"| B
    B -->|"Phone Audio"| A
    
    subgraph MEMORY ["💾 Memory Layer (Per Call)"]
        E <-->|"Read/Write\nconversation state"| REDIS["Redis\n(Short-term Memory)\nConversation history\nCurrent intent state"]
        E <-->|"Caller history\nBusiness config"| PG["PostgreSQL\n(Long-term Memory)\nCaller profiles\nBusiness settings"]
    end

    classDef caller fill:#ECFCCB,stroke:#65A30D,stroke-width:2px
    classDef gateway fill:#F3F4F6,stroke:#6B7280,stroke-width:2px
    classDef core fill:#EFF6FF,stroke:#2563EB,stroke-width:2px
    classDef ai fill:#FDF4FF,stroke:#9333EA,stroke-width:2px
    classDef rag fill:#FFF7ED,stroke:#EA580C,stroke-width:2px
    classDef tool fill:#F0FDF4,stroke:#16A34A,stroke-width:2px
    classDef mem fill:#FFF1F2,stroke:#E11D48,stroke-width:2px
    
    class A caller
    class B gateway
    class C,E,VAD core
    class D,INTENT,LLM,TTS,FILLER ai
    class RAG_PATH,EMB,VECT,CTX rag
    class TOOL,DB_CHECK,BOOK,TOOL_RESP tool
    class REDIS,PG,MEMORY mem
```

---

## 📥 OFFLINE INGESTION PIPELINE (Knowledge Base Builder)

> **When:** Business owner uploads PDF, DOCX, or syncs a website URL.

```mermaid
flowchart TD
    SRC["📄 Source Files\nPDF / DOCX / TXT\nWebsite URL"] --> LOADER["📂 Document Loader\nLangChain / Unstructured"]
    
    LOADER --> CHUNK["✂️ Text Chunker\n~500 token chunks\n~50 token overlap\nfor context continuity"]
    
    CHUNK --> EMBED_BATCH["⚡ Batch Embedding\nOpenAI text-embedding-3-small\nor local BGE-M3\nCheap: ~$0.13 / 1M tokens"]
    
    EMBED_BATCH --> UPSERT["📤 Upsert to Qdrant\nPayload includes:\nbusiness_id (MANDATORY)\nsource_file_name\npage_number\nchunk_index\ncontent_text"]
    
    UPSERT --> DONE["✅ Knowledge Base Ready\nIndexed and Searchable\nper Business Tenant"]
    
    DONE --> ISOLATION["🔒 Multi-Tenant Isolation\nEvery query MUST include:\nfilter: business_id = X\nNo cross-tenant leakage possible"]

    classDef src fill:#FFF7ED,stroke:#EA580C,stroke-width:2px
    classDef process fill:#EFF6FF,stroke:#2563EB,stroke-width:2px
    classDef store fill:#F0FDF4,stroke:#16A34A,stroke-width:2px
    classDef security fill:#FFF1F2,stroke:#E11D48,stroke-width:2px
    
    class SRC src
    class LOADER,CHUNK,EMBED_BATCH process
    class UPSERT,DONE store
    class ISOLATION security
```

---

## ⚡ LATENCY BREAKDOWN (Optimized Pipeline)

| Stage | Time | Notes |
|---|---|---|
| VAD Endpoint Detection | ~250ms | User finished speaking |
| STT Final Transcript | ~50ms | Deepgram nova-2 streaming |
| Intent Classification | ~70ms | Groq Llama-3 8B (fast model) |
| **[RAG] Query Embedding** | ~30ms | Small embedding model |
| **[RAG] Qdrant Hybrid Search** | ~40ms | Pre-filtered by business_id |
| LLM TTFT (Groq) | ~70ms | First token from Mixtral/Llama-3 70B |
| TTS First Audio Byte | ~150ms | Cartesia streaming |
| Network (colocated) | ~80ms | Same AZ as Twilio edge |
| **Total True Latency** | **~600ms** | End-to-end |
| **Perceived Latency** | **~250ms** | With filler word trick |

---

## 🏗️ Backend Module Map

```
backend/
├── engine/
│   ├── conversation/   ← State machine, turn management
│   ├── orchestration/  ← Coordinates STT → Intent → RAG/Tool → TTS
│   ├── guardrails/     ← PII masking, out-of-scope detection
│   └── prompts/        ← System prompt templates per vertical
│
├── rag/
│   ├── ingestion/      ← PDF/web loader, chunker
│   ├── embeddings/     ← Embedding model wrapper
│   ├── vector_store/   ← Qdrant client with business_id filter
│   └── retrieval/      ← Hybrid search, context builder
│
├── speech/             ← Deepgram STT, TTS (Cartesia/ElevenLabs)
├── llm/                ← Groq client, prompt builder
├── memory/             ← Redis (short-term), PG (long-term)
├── tools/              ← Appointment booking, calendar, etc.
├── verticals/          ← clinic.yaml, restaurant.yaml configs
└── integrations/       ← Twilio, third-party APIs
```

---

## 🔑 Key Design Rules

> [!IMPORTANT]
> **Multi-Tenancy:** `business_id` MUST be passed as a hard filter in every single Qdrant query. Never search across all vectors.

> [!IMPORTANT]
> **Intent Routing:** RAG is ONLY triggered for `ask_question` intent. Booking/rescheduling goes straight to Tool Calling. This saves 100-200ms on most calls.

> [!TIP]
> **Voice-Optimized Prompt:** Always add to LLM system prompt: *"Answer in max 2 short sentences. This is for voice playback — never use bullet points or markdown."*

> [!TIP]
> **Filler Words:** The instant VAD detects silence, play a pre-recorded filler word while the pipeline processes in background. This makes perceived latency feel like ~250ms instead of ~600ms.

> [!WARNING]
> **Chunk Size:** Keep chunks at ~500 tokens with 50-token overlap. Too small = loses context. Too large = wastes LLM context window and increases latency.

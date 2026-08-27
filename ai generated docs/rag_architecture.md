# Recommended RAG Architecture for AI Receptionist

Since this is a real-time voice AI platform, the RAG (Retrieval-Augmented Generation) system must optimize for **extreme low latency (<800ms total loop)**, **strict multi-tenancy (data isolation)**, and **high accuracy** to avoid hallucinating business policies.

Here is the most powerful and scalable RAG architecture for this use case:

## 1. Multi-Tenant Vector Database
*   **Recommendation:** **Qdrant** or **Pinecone**.
*   **Why:** They both support high-performance **metadata filtering**. 
*   **Architecture Rule:** You MUST NOT rely purely on separate indexes per business (which is hard to manage). Instead, use a single index and attach `business_id` to every vector payload. Every single search must apply a hard filter: `{"business_id": "tenant_123"}` before doing vector math. This guarantees absolute data isolation.

## 2. Hybrid Retrieval (Semantic + Keyword)
*   **Recommendation:** Dense Vectors (Embeddings) + Sparse Vectors (BM25/Splade).
*   **Why:** Voice queries are messy. If a patient asks about a highly specific medical term (e.g., "Invisalign pricing"), keyword search (BM25) often beats pure semantic search. Qdrant supports hybrid search natively.

## 3. Fast Embeddings
*   **Recommendation:** `text-embedding-3-small` (OpenAI) or locally hosted **BGE-M3** / **Nomic Embed**.
*   **Why:** You need embeddings generated in milliseconds. Do not use overly large embedding models that add 200ms+ to your pipeline.

## 4. Query Routing (The Secret to Low Latency)
*   **Recommendation:** Do NOT trigger RAG on every user message. 
*   **Architecture Rule:** Use a fast classifier (via Groq/Llama-3) in your deterministic state machine to classify the intent first. 
    *   If intent == `book_appointment` -> Go straight to tool calling.
    *   If intent == `ask_question` -> Trigger RAG.
    *   This saves hundreds of milliseconds on standard conversational turns.

## 5. RAG Processing Pipeline
1.  **Voice to Text:** User speaks -> Whisper STT (Fast).
2.  **Intent Router:** Groq LLM quickly classifies if this needs KB lookup.
3.  **Embed & Search:** Generate embedding -> Query Vector DB with `business_id` filter (Hybrid Search).
4.  **Generation:** Pass the top 2-3 most relevant chunks to Groq LLM with a strict prompt: *"Answer ONLY using the provided knowledge. Keep the answer under 2 sentences for voice playback."*
5.  **Text to Voice:** Stream response to TTS (ElevenLabs/Cartesia).

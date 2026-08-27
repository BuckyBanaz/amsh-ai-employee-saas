# RAG Implementation Guide: Intent Routing & Metadata Filtering

This document outlines the Python code structure for implementing the low-latency, multi-tenant RAG architecture for the AI Receptionist.

## Core Concept
1. **Intent Routing:** Prevent unnecessary database queries to save latency.
2. **Metadata Filtering:** Ensure strict data isolation between businesses.

## Code Prototype

```python
from enum import Enum
from typing import List, Dict, Optional

class UserIntent(Enum):
    BOOK_APPOINTMENT = "book_appointment"
    PROVIDE_INFO = "provide_info"
    ASK_QUESTION = "ask_question" # ONLY this triggers RAG
    UNKNOWN = "unknown"

class VectorDBClient:
    def __init__(self):
        # Initialize Qdrant/Pinecone client here
        pass
        
    def hybrid_search(self, query: str, business_id: str, top_k: int = 3) -> List[str]:
        """
        Executes a hybrid (semantic + keyword) search.
        CRITICAL: The business_id filter guarantees multi-tenancy isolation.
        """
        print(f"Executing Vector DB search for {business_id}...")
        
        # Pseudo-code for Qdrant/Pinecone query
        # results = self.client.search(
        #     collection_name="business_knowledge",
        #     query_vector=get_embedding(query),
        #     query_filter={
        #         "must": [{"key": "business_id", "match": {"value": business_id}}]
        #     },
        #     limit=top_k
        # )
        
        # Simulated response
        return [
            "We validate parking for up to 2 hours.",
            "Our standard consultation fee is $150."
        ]

class CallManager:
    def __init__(self, groq_client, vector_db: VectorDBClient):
        self.llm = groq_client
        self.vector_db = vector_db

    async def classify_intent(self, user_text: str) -> UserIntent:
        """Uses a fast LLM call (e.g., Llama-3 8B on Groq) to classify intent in <200ms."""
        # Simulated fast LLM intent classification
        if "?" in user_text or "what" in user_text.lower() or "how" in user_text.lower():
            return UserIntent.ASK_QUESTION
        return UserIntent.PROVIDE_INFO

    async def process_user_turn(self, user_text: str, business_id: str) -> str:
        """Main processing loop for a conversational turn."""
        
        # 1. Fast Intent Classification
        intent = await self.classify_intent(user_text)
        
        context = ""
        # 2. Conditional RAG Trigger
        if intent == UserIntent.ASK_QUESTION:
            # Only incur the latency of RAG if they asked a question
            retrieved_chunks = self.vector_db.hybrid_search(user_text, business_id)
            context = " ".join(retrieved_chunks)
        
        # 3. Final Generation Prompt
        system_prompt = f"""You are a helpful receptionist.
        Keep answers short (1-2 sentences) for voice playback.
        """
        
        if context:
            system_prompt += f"\nUse this verified knowledge to answer: {context}"
            
        # 4. Stream response back to TTS (Pseudo-code)
        # return await self.llm.generate(system_prompt, user_text)
        
        if context:
             return f"[RAG Triggered] Based on our policies: {context}"
        else:
             return "[Standard Conversation] Great, what time works for you?"

# --- Example Usage ---
# manager = CallManager(groq_client=..., vector_db=VectorDBClient())
# response = await manager.process_user_turn("How much is a consultation?", business_id="clinic_123")
```

## Key Takeaways
*   **Latency Savings:** By routing intents first, normal conversation flows bypass the embedding model and vector database entirely.
*   **Safety:** The `business_id` is a mandatory parameter in `hybrid_search`, ensuring a query can never accidentally retrieve data from another tenant.
*   **Voice Optimized:** The system prompt explicitly forces short answers, which is crucial for Text-to-Speech (TTS) pacing.

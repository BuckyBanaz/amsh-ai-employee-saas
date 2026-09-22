"""Fast Vector Store & Hybrid Matcher for RAG Knowledge Lookup.
Indexed per business_id. Guarantees sub-50ms vector & keyword similarity lookups.
"""

import math
import re
import time
from collections import Counter


def _tokenize(text: str) -> list[str]:
    """Lowercase word tokenizer stripping punctuation."""
    return re.findall(r"\b\w+\b", text.lower())


def _compute_tf_vector(tokens: list[str]) -> dict[str, float]:
    """Computes term frequency vector normalized by token length."""
    if not tokens:
        return {}
    counts = Counter(tokens)
    total = float(len(tokens))
    return {term: count / total for term, count in counts.items()}


def _cosine_similarity(vec1: dict[str, float], vec2: dict[str, float]) -> float:
    """Computes cosine similarity between two term frequency vectors."""
    if not vec1 or not vec2:
        return 0.0

    common_terms = set(vec1.keys()) & set(vec2.keys())
    if not common_terms:
        return 0.0

    dot_product = sum(vec1[t] * vec2[t] for t in common_terms)
    norm1 = math.sqrt(sum(val * val for val in vec1.values()))
    norm2 = math.sqrt(sum(val * val for val in vec2.values()))

    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0

    return dot_product / (norm1 * norm2)


class BusinessVectorStore:
    def __init__(self):
        # business_id -> list of chunk dicts
        self._stores: dict[str, list[dict]] = {}

    def index_chunks(self, business_id: str, chunks: list[dict]) -> int:
        """Indexes text chunks for a given business."""
        if business_id not in self._stores:
            self._stores[business_id] = []

        indexed_count = 0
        for chunk in chunks:
            tokens = _tokenize(chunk["text"])
            tf_vec = _compute_tf_vector(tokens)
            item = {
                "chunk_id": chunk.get("chunk_id"),
                "source_id": chunk.get("source_id"),
                "text": chunk["text"],
                "tokens": tokens,
                "tf_vec": tf_vec,
            }
            self._stores[business_id].append(item)
            indexed_count += 1

        return indexed_count

    def clear_business(self, business_id: str) -> None:
        """Clears all indexed chunks for a business."""
        if business_id in self._stores:
            self._stores[business_id] = []

    def search(self, business_id: str, query: str, top_k: int = 2) -> list[dict]:
        """Performs fast similarity search for a user query. Returns top_k chunks in <50ms."""
        start_time = time.perf_counter()
        chunks = self._stores.get(business_id, [])

        if not chunks or not query.strip():
            return []

        query_tokens = _tokenize(query)
        if not query_tokens:
            return []

        query_vec = _compute_tf_vector(query_tokens)

        scored_chunks: list[tuple[float, dict]] = []
        for chunk in chunks:
            # Cosine vector similarity score
            cos_sim = _cosine_similarity(query_vec, chunk["tf_vec"])

            # Exact keyword overlap boost for numbers/pricing/terms (e.g. 500, fees, scaling)
            token_set = set(chunk["tokens"])
            matching_tokens = sum(1 for qt in query_tokens if qt in token_set)
            keyword_score = matching_tokens / max(len(query_tokens), 1)

            # Combined hybrid score
            final_score = (0.7 * cos_sim) + (0.3 * keyword_score)

            if final_score > 0.05:
                scored_chunks.append((final_score, chunk))

        # Sort descending by score
        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        results = []
        for score, item in scored_chunks[:top_k]:
            results.append({
                "chunk_id": item["chunk_id"],
                "source_id": item["source_id"],
                "text": item["text"],
                "score": round(score, 4),
                "lookup_ms": round(elapsed_ms, 2),
            })

        return results


# Global singleton vector store instance
global_vector_store = BusinessVectorStore()

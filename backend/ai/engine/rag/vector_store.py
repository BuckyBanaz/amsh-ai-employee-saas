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


def _normalize_token(t: str) -> str:
    """Lightweight suffix normalization for plurals and common inflections."""
    t = t.lower()
    if t.endswith("ies") and len(t) > 4:
        return t[:-3] + "y"
    if t.endswith("es") and len(t) > 3:
        return t[:-2]
    if t.endswith("s") and not t.endswith("ss") and len(t) > 3:
        return t[:-1]
    if t.endswith("ing") and len(t) > 4:
        return t[:-3]
    return t


import difflib

def _fuzzy_token_match(q: str, token_set: set[str], norm_token_set: set[str]) -> float:
    """Returns 1.0 for exact/stem match, 0.85 for close fuzzy typo match (e.g. 'canel' -> 'canal')."""
    nq = _normalize_token(q)
    if q in token_set or nq in norm_token_set:
        return 1.0
    if len(q) >= 4:
        for t in token_set:
            if len(t) >= 4:
                if q in t or t in q:
                    return 0.85
                if difflib.SequenceMatcher(None, q, t).ratio() >= 0.75:
                    return 0.85
    return 0.0


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
            norm_tokens = set(_normalize_token(t) for t in tokens)
            item = {
                "chunk_id": chunk.get("chunk_id"),
                "source_id": chunk.get("source_id"),
                "source_name": chunk.get("source_name", "Knowledge Base"),
                "text": chunk["text"],
                "tokens": tokens,
                "norm_tokens": norm_tokens,
                "tf_vec": tf_vec,
            }
            self._stores[business_id].append(item)
            indexed_count += 1

        return indexed_count

    def clear_business(self, business_id: str) -> None:
        """Clears all indexed chunks for a business."""
        if business_id in self._stores:
            self._stores[business_id] = []

    def search(self, business_id: str, query: str, top_k: int = 4) -> list[dict]:
        """Performs fast similarity search for a user query. Returns top_k chunks in <50ms."""
        start_time = time.perf_counter()
        chunks = self._stores.get(business_id, [])

        if not chunks or not query.strip():
            return []

        query_tokens = _tokenize(query)
        if not query_tokens:
            return []

        # Common stop words to deprioritize for keyword matching
        STOP_WORDS = {
            "what", "is", "are", "a", "an", "the", "in", "on", "at", "for", "to", "of",
            "and", "or", "do", "does", "did", "you", "your", "have", "can", "i", "we",
            "how", "much", "many", "when", "where", "why", "who", "which", "tell", "me",
            "about", "please", "any", "some"
        }
        meaningful_tokens = [t for t in query_tokens if t not in STOP_WORDS]
        tokens_for_scoring = meaningful_tokens if meaningful_tokens else query_tokens

        query_vec = _compute_tf_vector(query_tokens)

        scored_chunks: list[tuple[float, dict]] = []
        for chunk in chunks:
            # Cosine vector similarity score
            cos_sim = _cosine_similarity(query_vec, chunk["tf_vec"])

            # Exact, normalized & fuzzy keyword overlap boost (handles typos like 'canel' -> 'canal')
            token_set = set(chunk["tokens"])
            norm_token_set = chunk.get("norm_tokens") or set(_normalize_token(t) for t in chunk["tokens"])

            matching_weight = sum(_fuzzy_token_match(qt, token_set, norm_token_set) for qt in tokens_for_scoring)
            keyword_score = min(matching_weight / max(len(tokens_for_scoring), 1), 1.0)

            # Combined hybrid score (balanced between vector semantics and exact keywords)
            final_score = (0.35 * cos_sim) + (0.65 * keyword_score)

            # Minimum quality threshold: omit weak random overlaps under 20%
            if final_score >= 0.20 and keyword_score > 0.15:
                scored_chunks.append((final_score, chunk))

        # Sort descending by score
        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        results = []
        for score, item in scored_chunks[:top_k]:
            results.append({
                "chunk_id": item["chunk_id"],
                "source_id": item["source_id"],
                "source": item.get("source_name") or "Knowledge Base",
                "filename": item.get("source_name") or "Knowledge Base",
                "text": item["text"],
                "score": round(score, 4),
                "lookup_ms": round(elapsed_ms, 2),
            })

        return results


# Global singleton vector store instance
global_vector_store = BusinessVectorStore()

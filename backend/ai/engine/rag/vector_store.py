"""Fast Vector Store & Hybrid Matcher for RAG Knowledge Lookup.
Indexed per business_id. Guarantees sub-50ms vector & keyword similarity lookups.

Ranking: Okapi BM25 over each chunk (plus its source title and section heading), with plural/inflection folding and
typo-tolerant matching of query words the business's documents do not contain ("canel" -> "canal", speech-to-text slips).
When chunks carry embeddings and the query could be embedded, cosine similarity is blended in (hybrid search). Every
result has a 0..1 score and a confidence label; results below the relevance floor are not returned at all, so "nothing
found" is a real answer rather than the least-bad random passage.

The store is in memory and keyed by business_id: a search can only ever see the chunks indexed for that one business."""

import difflib
import math
import time
from collections import Counter
from typing import Dict, List, Optional

import numpy as np

from backend.ai.engine.rag.languages import STOP_WORDS, is_stop, strip_arabic_article, words  # noqa: E402,F401

# Relevance floor. lexical: idf-weighted share of the query's meaningful words found in the chunk. semantic: cosine.
MIN_COVERAGE = 0.5
MIN_COSINE = 0.62
K1, B = 1.2, 0.75


def _tokenize(text: str) -> list[str]:
    """Folded words in any script (accents, Arabic letter variants and Indic/Arabic digits normalised)."""
    return words(text)


def _normalize_token(t: str) -> str:
    """Lightweight suffix normalization for plurals and common inflections (English-style, Latin words only); the Arabic
    article and joined conjunctions are dropped (الرسوم -> رسوم)."""
    t = t.lower()
    if not t.isascii():
        return strip_arabic_article(t)
    if t.endswith("ies") and len(t) > 4:
        return t[:-3] + "y"
    if t.endswith(("ches", "shes", "sses", "xes")) and len(t) > 4:
        return t[:-2]
    if t.endswith("s") and not t.endswith(("ss", "us", "is")) and len(t) > 3:
        return t[:-1]
    if t.endswith("ing") and len(t) > 5:
        return t[:-3]
    return t


def _terms(text: str) -> list[str]:
    return [_normalize_token(t) for t in _tokenize(text)]


def _confidence(score: float) -> str:
    return "high" if score >= 0.6 else "medium" if score >= 0.4 else "low"


class _Index:
    """One business's chunks with BM25 statistics and an optional embedding matrix."""

    def __init__(self, items: List[dict], stamp=None):
        self.items = items
        self.stamp = stamp
        self.tf: List[Counter] = []
        self.lengths: List[int] = []
        df: Counter = Counter()
        for it in items:
            terms = _terms(" ".join(x for x in (it.get("source_name") or "", it.get("heading") or "", it["text"]) if x))
            c = Counter(terms)
            self.tf.append(c)
            self.lengths.append(len(terms) or 1)
            df.update(c.keys())
        self.df = df
        self.n = len(items)
        self.avgdl = (sum(self.lengths) / self.n) if self.n else 1.0
        self.vocab = set(df.keys())
        self._fuzzy_cache: Dict[str, List[str]] = {}
        vecs = [it.get("embedding") for it in items]
        dims = {v.shape[0] for v in vecs if v is not None}
        if len(dims) == 1:
            d = dims.pop()
            self.matrix = np.zeros((self.n, d), dtype=np.float32)
            self.has_vec = np.zeros(self.n, dtype=bool)
            for i, v in enumerate(vecs):
                if v is not None:
                    self.matrix[i] = v
                    self.has_vec[i] = True
            self.embedding_model = next((it.get("embedding_model") for it in items if it.get("embedding") is not None), None)
        else:
            self.matrix = None
            self.has_vec = None
            self.embedding_model = None

    def idf(self, term: str) -> float:
        df = self.df.get(term, 0)
        return math.log(1 + (self.n - df + 0.5) / (df + 0.5))

    def expand(self, term: str) -> List[tuple]:
        """[(vocabulary term, weight)] for a query term: itself, or close spellings when the documents lack it."""
        if term in self.vocab:
            return [(term, 1.0)]
        if len(term) < 4 or term.isdigit():
            return []
        if term not in self._fuzzy_cache:
            close = [v for v in self.vocab if len(v) >= 4 and abs(len(v) - len(term)) <= 2
                     and difflib.SequenceMatcher(None, term, v).ratio() >= 0.8]
            close += [v for v in self.vocab if len(v) >= 5 and len(term) >= 5 and (v.startswith(term) or term.startswith(v)) and v not in close]
            self._fuzzy_cache[term] = close[:3]
        return [(v, 0.85) for v in self._fuzzy_cache[term]]


class BusinessVectorStore:
    def __init__(self):
        # business_id -> list of chunk dicts (the raw items) and their built index
        self._stores: dict[str, list[dict]] = {}
        self._indexes: dict[str, _Index] = {}

    # ---------------------------------------------------------------------------------------------------------- writes
    def index_chunks(self, business_id: str, chunks: list[dict]) -> int:
        """Indexes text chunks for a given business."""
        store = self._stores.setdefault(business_id, [])
        for chunk in chunks:
            store.append({
                "chunk_id": chunk.get("chunk_id"),
                "source_id": chunk.get("source_id"),
                "source_name": chunk.get("source_name", "Knowledge Base"),
                "heading": chunk.get("heading"),
                "text": chunk["text"],
                "meta": chunk.get("meta") or {},
                "embedding": chunk.get("embedding"),
                "embedding_model": chunk.get("embedding_model"),
                "updated_at": chunk.get("updated_at"),
            })
        self._indexes.pop(business_id, None)
        return len(chunks)

    def replace_business(self, business_id: str, chunks: list[dict], stamp=None) -> None:
        """Swaps in a business's full chunk set at once (readers never see a half-built index)."""
        self._stores[business_id] = []
        self.index_chunks(business_id, chunks)
        self._indexes[business_id] = _Index(self._stores[business_id], stamp)

    def clear_business(self, business_id: str) -> None:
        """Clears all indexed chunks for a business."""
        self._stores[business_id] = []
        self._indexes.pop(business_id, None)

    def stamp(self, business_id: str):
        idx = self._indexes.get(business_id)
        return idx.stamp if idx is not None else None

    def _index(self, business_id: str) -> Optional[_Index]:
        idx = self._indexes.get(business_id)
        if idx is None and self._stores.get(business_id):
            idx = self._indexes[business_id] = _Index(self._stores[business_id])
        return idx

    # ---------------------------------------------------------------------------------------------------------- search
    def search(self, business_id: str, query: str, top_k: int = 4, query_vector: Optional[np.ndarray] = None) -> list[dict]:
        """Performs fast similarity search for a user query. Returns top_k chunks in <50ms."""
        start_time = time.perf_counter()
        idx = self._index(business_id)
        if idx is None or not idx.n or not query or not query.strip():
            return []

        tokens = _tokenize(query)
        content = [t for t in tokens if not is_stop(t)] or tokens  # question words and grammar in any language
        meaningful = list(dict.fromkeys(_normalize_token(t) for t in content))
        expanded = {q: idx.expand(q) for q in meaningful}
        q_weights = {q: max(idx.idf(v) for v, _ in exp) if exp else math.log(1 + idx.n) for q, exp in expanded.items()}
        total_weight = sum(q_weights.values()) or 1.0
        bm25_max = sum(q_weights[q] * (K1 + 1) for q in meaningful) or 1.0

        cos = None
        if query_vector is not None and idx.matrix is not None and query_vector.shape[0] == idx.matrix.shape[1]:
            cos = idx.matrix @ query_vector
            cos = np.where(idx.has_vec, cos, 0.0)

        scored: list[tuple] = []
        for i, tf in enumerate(idx.tf):
            covered = 0.0
            bm25 = 0.0
            dl = idx.lengths[i]
            for q, exp in expanded.items():
                best = 0.0
                for term, w in exp:
                    f = tf.get(term, 0)
                    if f:
                        s = idx.idf(term) * f * (K1 + 1) / (f + K1 * (1 - B + B * dl / idx.avgdl)) * w
                        best = max(best, s)
                if best:
                    covered += q_weights[q] * max(w for term, w in exp if tf.get(term))
                    bm25 += best
            coverage = covered / total_weight
            lexical = 0.6 * coverage + 0.4 * min(bm25 / bm25_max, 1.0)
            semantic = float(cos[i]) if cos is not None else None
            if semantic is not None and idx.has_vec[i]:
                sem_norm = min(max((semantic - 0.5) / 0.35, 0.0), 1.0)
                if coverage < MIN_COVERAGE and semantic < MIN_COSINE:
                    continue
                score = 0.55 * lexical + 0.45 * sem_norm
                match = "hybrid" if coverage >= MIN_COVERAGE and semantic >= MIN_COSINE else ("keyword" if coverage >= MIN_COVERAGE else "semantic")
            else:
                if coverage < MIN_COVERAGE:
                    continue
                score = lexical
                match = "keyword"
            scored.append((score, i, match))

        scored.sort(key=lambda x: x[0], reverse=True)
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        results = []
        for score, i, match in scored[:top_k]:
            item = idx.items[i]
            results.append({
                "chunk_id": item["chunk_id"],
                "source_id": item["source_id"],
                "source": item.get("source_name") or "Knowledge Base",
                "filename": item.get("source_name") or "Knowledge Base",
                "text": item["text"],
                "meta": item.get("meta") or {},
                "updated_at": item.get("updated_at"),
                "score": round(score, 4),
                "confidence": _confidence(score),
                "match": match,
                "lookup_ms": round(elapsed_ms, 2),
            })
        return results


# Global singleton vector store instance
global_vector_store = BusinessVectorStore()

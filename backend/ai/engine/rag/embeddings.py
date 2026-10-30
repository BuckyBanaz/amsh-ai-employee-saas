"""Optional semantic embeddings for knowledge chunks (Gemini `gemini-embedding-001`, already a configured provider).

Embeddings are an enhancement, never a requirement: with no GEMINI_API_KEY, KB_EMBEDDINGS=off, or the provider failing,
retrieval falls back to keyword (BM25) search and the document's meta records that it was not embedded. Documents are
embedded in batches of up to 100 with retries on rate limits and server errors; a caller's query is embedded once with a
short timeout (a slow provider must not stall a live call) and cached."""

from __future__ import annotations

import logging
import time
from collections import OrderedDict
from typing import List, Optional

import numpy as np

logger = logging.getLogger(__name__)

API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents"
BATCH = 100


class Embedder:
    model: str = "none"
    dim: int = 0

    def embed_documents(self, texts: List[str]) -> List[Optional[np.ndarray]]:
        raise NotImplementedError

    def embed_query(self, text: str) -> Optional[np.ndarray]:
        raise NotImplementedError


def _unit(v) -> Optional[np.ndarray]:
    a = np.asarray(v, dtype=np.float32)
    n = float(np.linalg.norm(a))
    return a / n if n > 0 else None


class GeminiEmbedder(Embedder):
    def __init__(self, api_key: str, model: str = "gemini-embedding-001", dim: int = 768, query_timeout: float = 1.5):
        self.api_key = api_key
        self.model = model
        self.dim = dim
        self.query_timeout = query_timeout
        self._cache: "OrderedDict[str, np.ndarray]" = OrderedDict()

    def _call(self, texts: List[str], task: str, timeout: float) -> List[Optional[np.ndarray]]:
        import httpx

        body = {"requests": [{"model": f"models/{self.model}", "content": {"parts": [{"text": t[:8000]}]}, "taskType": task,
                              "outputDimensionality": self.dim} for t in texts]}
        resp = httpx.post(API.format(model=self.model), json=body, headers={"x-goog-api-key": self.api_key}, timeout=timeout)
        if resp.status_code != 200:
            raise RuntimeError(f"embedding HTTP {resp.status_code}")
        rows = resp.json().get("embeddings") or []
        if len(rows) != len(texts):
            raise RuntimeError("embedding count mismatch")
        return [_unit(r.get("values") or []) for r in rows]

    def embed_documents(self, texts: List[str]) -> List[Optional[np.ndarray]]:
        out: List[Optional[np.ndarray]] = []
        for i in range(0, len(texts), BATCH):
            batch = texts[i:i + BATCH]
            for attempt in range(3):
                try:
                    out.extend(self._call(batch, "RETRIEVAL_DOCUMENT", timeout=30.0))
                    break
                except Exception as e:
                    if attempt == 2:
                        logger.warning("knowledge embeddings failed for a batch of %d: %s", len(batch), e)
                        out.extend([None] * len(batch))
                    else:
                        time.sleep(1.5 * (attempt + 1) ** 2)  # 1.5 s, 6 s: rides out a per-minute rate limit
        return out

    def embed_query(self, text: str) -> Optional[np.ndarray]:
        key = text.strip().lower()
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        try:
            vec = self._call([text], "RETRIEVAL_QUERY", timeout=self.query_timeout)[0]
        except Exception as e:
            logger.info("query embedding skipped (%s); keyword search only", e)
            return None
        if vec is not None:
            self._cache[key] = vec
            while len(self._cache) > 512:
                self._cache.popitem(last=False)
        return vec


_override: Optional[Embedder] = None
_instance: Optional[Embedder] = None
_instance_key: tuple = ()


def set_embedder(embedder: Optional[Embedder]) -> None:
    """Tests and scripts: use this embedder (None restores the configured one)."""
    global _override
    _override = embedder


def get_embedder() -> Optional[Embedder]:
    if _override is not None:
        return _override
    from backend.server.common.config import get_settings

    s = get_settings()
    mode = (getattr(s, "KB_EMBEDDINGS", "auto") or "auto").lower()
    if mode == "off" or not s.GEMINI_API_KEY:
        return None
    global _instance, _instance_key
    key = (s.GEMINI_API_KEY, s.KB_EMBEDDING_MODEL, s.KB_EMBEDDING_DIM, s.KB_QUERY_EMBED_TIMEOUT)
    if _instance is None or key != _instance_key:
        _instance = GeminiEmbedder(s.GEMINI_API_KEY, s.KB_EMBEDDING_MODEL, s.KB_EMBEDDING_DIM, s.KB_QUERY_EMBED_TIMEOUT)
        _instance_key = key
    return _instance


def to_bytes(vec: Optional[np.ndarray]) -> Optional[bytes]:
    return None if vec is None else np.asarray(vec, dtype=np.float32).tobytes()


def from_bytes(blob: Optional[bytes]) -> Optional[np.ndarray]:
    return None if not blob else np.frombuffer(blob, dtype=np.float32)

"""Chat backends for the agent loop. `ChatBackend` is the seam: production uses Groq and/or Gemini, tests use a fake.

Groq and Gemini both speak the OpenAI chat-completions dialect (tools, streaming), so they share one implementation and
differ only in URL, key, model and a few payload details. `FallbackChatBackend` chains them: when the first provider is
rate limited or down, the turn is answered by the next one, and a provider that says "try again in 12 minutes" is skipped
for that long instead of costing every turn a failed round trip."""

import asyncio
import json
import logging
import re
import time
from typing import Any, AsyncIterator, Callable, Dict, List, Optional, Protocol, Set, Tuple

import httpx

from backend.ai.llm.client import llm_client, pooled_http_client
from backend.ai.realtime import latency

logger = logging.getLogger(__name__)

GEMINI_OPENAI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
MAX_COOLDOWN_SECONDS = 900.0  # never sideline a provider for more than 15 minutes on one error message

# Models that answered "tool calling is not supported". Learned at run time (providers publish no reliable flag), so a
# model picked in the dashboard that cannot call tools is skipped for turns that need tools instead of breaking bookings.
_NO_TOOLS: Set[Tuple[str, str]] = set()
_NO_TOOLS_RE = re.compile(r"tool[^.]{0,30}(?:not supported|unsupported)|does not support[^.]{0,30}tool", re.IGNORECASE)


def tool_calling_status(kind: str, model: str) -> str:
    """'no' if this model has refused tool calls during this process's lifetime, else 'unknown' (not verified)."""
    return "no" if (kind, model) in _NO_TOOLS else "unknown"


class LLMUnavailable(Exception):
    """Raised when the model cannot answer (no key, network, repeated API errors)."""

    def __init__(self, message: str, retry_after: Optional[float] = None, provider: Optional[str] = None) -> None:
        super().__init__(message)
        self.retry_after = retry_after  # seconds the provider asked us to wait, when it said so
        self.provider = provider


class ChatBackend(Protocol):
    async def chat(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Returns {"content": str|None, "tool_calls": [{"id","name","arguments"}]}."""

    def chat_stream(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> AsyncIterator[Dict[str, Any]]:
        """Yields {"type": "text", "delta": str} then one {"type": "final", "content", "tool_calls"}."""


def parse_wait_seconds(text: str) -> Optional[float]:
    """Provider wait hints: 'try again in 12m1.872s', '1h2m3s', '350ms', 'retryDelay": "23s"'. None if absent."""
    m = re.search(r"(?:try again in |retryDelay\"?\s*:\s*\")\s*((?:\d+(?:\.\d+)?(?:h|ms|m|s))+)", text)
    if not m:
        return None
    total = 0.0
    for value, unit in re.findall(r"(\d+(?:\.\d+)?)(h|ms|m|s)", m[1]):
        total += float(value) * {"h": 3600.0, "m": 60.0, "s": 1.0, "ms": 0.001}[unit]
    return total


class OpenAICompatBackend:
    """Shared machinery for OpenAI-style chat completions with tool calling."""

    provider = "openai-compat"
    kind = "openai"  # "groq" / "gemini": the dashboard's model value is f"{kind}:{model}"

    def __init__(
        self,
        model: Optional[str] = None,
        timeout: float = 8.0,
        max_tokens: int = 400,
        max_attempts: int = 3,
        max_retry_wait: float = 4.0,  # riding out a short rate-limit window beats switching persona mid-call
        temperature: Optional[float] = None,
    ) -> None:
        # Owner's "creativity" slider (Behavior tab, 0-1). Clamped: very high values break tool-call reliability.
        self.temperature = 0.5 if temperature is None else min(max(temperature, 0.1), 0.8)
        self.model = model or self.default_model()
        self.timeout = timeout
        self.max_tokens = max_tokens
        self.max_attempts = max_attempts
        self.max_retry_wait = max_retry_wait  # live calls cannot wait long; evals raise this to ride out rate limits
        self.usage = {"calls": 0, "prompt_tokens": 0, "completion_tokens": 0, "rate_limited": 0}
        # Set by the engine: sink(provider, model, prompt_tokens, completion_tokens, estimated) so spend is attributed to a clinic.
        self.usage_sink: Optional[Callable[[str, str, int, int, bool], None]] = None

    # ---- provider hooks -------------------------------------------------------------------------------------
    def default_model(self) -> str:
        raise NotImplementedError

    def api_url(self) -> str:
        raise NotImplementedError

    def api_key(self) -> Optional[str]:
        raise NotImplementedError

    def client(self) -> httpx.AsyncClient:
        raise NotImplementedError

    def extra_payload(self) -> Dict[str, Any]:
        return {}

    def prepare_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return messages

    # ---- shared ---------------------------------------------------------------------------------------------
    def _record_usage(self, usage: Optional[Dict[str, Any]], estimated: bool = False) -> None:
        if usage:
            prompt, completion = int(usage.get("prompt_tokens") or 0), int(usage.get("completion_tokens") or 0)
            self.usage["calls"] += 1
            self.usage["prompt_tokens"] += prompt
            self.usage["completion_tokens"] += completion
            if self.usage_sink:
                try:
                    self.usage_sink(self.provider, self.model, prompt, completion, estimated)
                except Exception:  # metering must never break a reply
                    logger.debug("usage sink failed", exc_info=True)

    @staticmethod
    def _estimate_tokens(chars: int) -> int:
        return max(1, chars // 4)  # about four characters per token; streamed replies carry no provider count

    @staticmethod
    def _retry_delay(resp: Any) -> float:
        """Seconds the provider asks us to wait (Retry-After header, else the hint in the body). Defaults to 1s."""
        header = resp.headers.get("retry-after")
        if header:
            try:
                return float(header)
            except ValueError:
                pass
        return parse_wait_seconds(resp.text) or 1.0

    def _payload(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]], stream: bool) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": self.prepare_messages(messages),
            "temperature": self.temperature,  # default 0.5: some variety so replies do not sound canned
            "max_tokens": self.max_tokens,
            "stream": stream,
            **self.extra_payload(),
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        return payload

    def _headers(self) -> Dict[str, str]:
        key = self.api_key()
        if not key:
            raise LLMUnavailable(f"{self.provider}: API key is not configured", provider=self.provider)
        return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    @staticmethod
    def _parse_message(message: Dict[str, Any]) -> Dict[str, Any]:
        calls = [
            {
                "id": c.get("id") or f"call_{i}",
                "name": c["function"]["name"],
                "arguments": c["function"].get("arguments") or "{}",
                "extra_content": c.get("extra_content"),  # Gemini 3: thought_signature that must be echoed back
            }
            for i, c in enumerate(message.get("tool_calls") or [])
        ]
        return {"content": (message.get("content") or "").strip() or None, "tool_calls": calls}

    async def chat(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> Dict[str, Any]:
        headers = self._headers()
        last_error: Optional[str] = None
        retry_after: Optional[float] = None
        for attempt in range(self.max_attempts):  # retries cover transient 429/5xx and malformed tool-call generations
            try:
                resp = await self.client().post(
                    self.api_url(), headers=headers, json=self._payload(messages, tools, stream=False), timeout=self.timeout
                )
            except Exception as e:
                last_error = f"{type(e).__name__}: {e}"
                continue
            if resp.status_code == 200:
                body = resp.json()
                self._record_usage(body.get("usage"))
                return self._parse_message(body["choices"][0]["message"])
            last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
            if resp.status_code == 400 and tools and _NO_TOOLS_RE.search(resp.text):
                _NO_TOOLS.add((self.kind, self.model))  # remembered: never asked for tool turns again
                raise LLMUnavailable(f"{self.provider}: this model does not support tool calling", provider=self.provider)
            if resp.status_code == 429:
                self.usage["rate_limited"] += 1
                wait = retry_after = self._retry_delay(resp)
                if wait > self.max_retry_wait or attempt == self.max_attempts - 1:
                    break  # a long wait (e.g. a daily cap) is not worth blocking the caller for
                await asyncio.sleep(wait + 0.1)
            elif resp.status_code not in (400, 500, 502, 503):
                break
        raise LLMUnavailable(f"{self.provider}: {last_error or 'unknown error'}", retry_after=retry_after, provider=self.provider)

    async def chat_stream(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> AsyncIterator[Dict[str, Any]]:
        headers = self._headers()
        text_parts: List[str] = []
        acc: Dict[int, Dict[str, Any]] = {}
        # Latency marks (no-op outside a measured live turn). First "token" counts any delta, including hidden reasoning
        # and tool-call fragments; first "content" is the first word that can be spoken. The gap is reasoning cost.
        latency.mark("llm_request_start", provider=self.provider, tools=bool(tools))
        first_token = first_content = False
        try:
            async with self.client().stream(
                "POST", self.api_url(), headers=headers, json=self._payload(messages, tools, stream=True), timeout=self.timeout
            ) as resp:
                if resp.status_code != 200:
                    body = (await resp.aread()).decode("utf-8", "ignore")[:300]
                    if resp.status_code == 400 and tools and _NO_TOOLS_RE.search(body):
                        _NO_TOOLS.add((self.kind, self.model))
                    retry = parse_wait_seconds(body) if resp.status_code == 429 else None
                    raise LLMUnavailable(f"{self.provider}: HTTP {resp.status_code}: {body[:200]}", retry_after=retry, provider=self.provider)
                async for line in resp.aiter_lines():
                    delta = parse_sse_line(line)
                    if delta is None:
                        continue
                    if not first_token and (delta.get("content") or delta.get("reasoning") or delta.get("tool_calls")):
                        first_token = True
                        latency.mark("llm_first_token", provider=self.provider)
                    if delta.get("content"):
                        if not first_content:
                            first_content = True
                            latency.mark("llm_first_content", provider=self.provider)
                        text_parts.append(delta["content"])
                        yield {"type": "text", "delta": delta["content"]}
                    for tc in delta.get("tool_calls") or []:
                        slot = acc.setdefault(tc.get("index", 0), {"id": None, "name": "", "arguments": "", "extra_content": None})
                        slot["id"] = tc.get("id") or slot["id"]
                        slot["extra_content"] = tc.get("extra_content") or slot["extra_content"]
                        fn = tc.get("function") or {}
                        slot["name"] += fn.get("name") or ""
                        slot["arguments"] += fn.get("arguments") or ""
        except LLMUnavailable:
            raise
        except Exception as e:
            raise LLMUnavailable(f"{self.provider}: {type(e).__name__}: {e}", provider=self.provider) from e
        calls = [
            {"id": c["id"] or f"call_{i}", "name": c["name"], "arguments": c["arguments"] or "{}", "extra_content": c["extra_content"]}
            for i, c in sorted(acc.items())
        ]
        if self.usage_sink:  # streamed turns report no usage: count from text length, and say so
            sent = sum(len(str(m.get("content") or "")) + len(json.dumps(m.get("tool_calls") or [], default=str)) for m in messages) + len(json.dumps(tools, default=str))
            produced = sum(len(p) for p in text_parts) + sum(len(c["arguments"]) + len(c["name"]) for c in acc.values())
            self._record_usage({"prompt_tokens": self._estimate_tokens(sent), "completion_tokens": self._estimate_tokens(produced)}, estimated=True)
        yield {"type": "final", "content": "".join(text_parts).strip() or None, "tool_calls": calls}


class GroqChatBackend(OpenAICompatBackend):
    """Groq: shares the app's pooled httpx client. Any Groq chat model can be used; rate limits are per model, so each
    model in the chain is its own provider (own cooldown)."""

    provider = "groq"
    kind = "groq"

    def default_model(self) -> str:
        return llm_client.model

    def api_url(self) -> str:
        return llm_client.api_url

    def api_key(self) -> Optional[str]:
        return llm_client.api_key

    def client(self) -> httpx.AsyncClient:
        return llm_client._client

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        # gpt-oss counts hidden reasoning tokens against max_tokens, so leave headroom above the reply
        self.max_tokens = max(self.max_tokens, 400)
        # The default model keeps the plain name "groq" (logs, cooldown key); other models are "groq:<model>".
        self.provider = "groq" if self.model == llm_client.model else f"groq:{self.model}"

    def extra_payload(self) -> Dict[str, Any]:
        model = self.model.lower()
        if "gpt-oss" in model:
            return {"reasoning_effort": "low"}  # a reasoning model; a receptionist reply needs little thought
        if "qwen" in model:
            # Measured on Groq: tool calls fail often by default; with thinking off and one call at a time they held up.
            return {"reasoning_effort": "none", "parallel_tool_calls": False}
        return {}  # other models reject reasoning parameters

    def prepare_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """History may hold tool calls Gemini produced; Groq does not know Gemini's extra_content, so drop it."""
        if not any(c.get("extra_content") for m in messages for c in (m.get("tool_calls") or [])):
            return messages
        return [
            {**m, "tool_calls": [{k: v for k, v in c.items() if k != "extra_content"} for c in m["tool_calls"]]} if m.get("tool_calls") else m
            for m in messages
        ]


_gemini_client: Optional[httpx.AsyncClient] = None


class GeminiChatBackend(OpenAICompatBackend):
    """Google Gemini through its OpenAI-compatible endpoint (same tool-calling and streaming format as Groq)."""

    provider = "gemini"
    kind = "gemini"

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        # Like Groq: the configured default model is plain "gemini", any other model is "gemini:<model>" (own cooldown).
        if self.model != self.default_model():
            self.provider = f"gemini:{self.model}"

    def default_model(self) -> str:
        from backend.server.common.config import get_settings

        # Google retires models quickly (gemini-2.5-flash already rejects new users): keep GEMINI_MODEL configurable.
        # Default measured at ~1.25 s per turn with tools (gemini-3.8-flash: ~2 s; thinking is on by default and slow).
        return getattr(get_settings(), "GEMINI_MODEL", None) or "gemini-3.1-flash-lite"

    def extra_payload(self) -> Dict[str, Any]:
        # Thinking off for the flash family: a receptionist reply does not need it and it costs latency.
        return {"reasoning_effort": "none"} if "flash" in self.model.lower() else {}

    def api_url(self) -> str:
        return GEMINI_OPENAI_URL

    def api_key(self) -> Optional[str]:
        from backend.server.common.config import get_settings

        return getattr(get_settings(), "GEMINI_API_KEY", None)

    def client(self) -> httpx.AsyncClient:
        return pooled_http_client(timeout=10.0)  # long keep-alive: no TLS handshake per turn

    # Gemini 3 validates a thought_signature on every function call in the history. Calls the model made itself carry the
    # real one (echoed back); calls made by another provider (Groq) get Google's documented "skip validation" marker.
    SKIP_SIGNATURE = {"google": {"thought_signature": "skip_thought_signature_validator"}}

    def prepare_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Adapts shared history for Gemini: function names on tool results, and a thought_signature on tool calls."""
        names = {c["id"]: c["function"]["name"] for m in messages for c in (m.get("tool_calls") or [])}
        out: List[Dict[str, Any]] = []
        for m in messages:
            if m.get("role") == "tool" and m.get("tool_call_id") in names and "name" not in m:
                m = {**m, "name": names[m["tool_call_id"]]}
            elif m.get("tool_calls"):
                m = {**m, "tool_calls": [c if c.get("extra_content") else {**c, "extra_content": self.SKIP_SIGNATURE} for c in m["tool_calls"]]}
            out.append(m)
        return out


# Process-wide: which providers are sidelined and until when. Backends are created per call, so this must live here.
_COOLDOWN_UNTIL: Dict[str, float] = {}


def reset_cooldowns() -> None:
    _COOLDOWN_UNTIL.clear()


class FallbackChatBackend:
    """Try providers in order. A provider that fails is sidelined for as long as it asked (capped), so a daily cap on the
    first provider does not slow every later turn. If every provider fails, the error lists all of them."""

    def __init__(self, backends: List[OpenAICompatBackend]) -> None:
        self.backends = backends
        self.last_provider: Optional[str] = None
        self.usage = {"calls": 0, "prompt_tokens": 0, "completion_tokens": 0, "rate_limited": 0}

    def _order(self, needs_tools: bool = False) -> List[OpenAICompatBackend]:
        now = time.monotonic()
        pool = self.backends
        if needs_tools:  # skip models known not to support tool calling (unless that would leave nothing to ask)
            pool = [b for b in pool if (b.kind, b.model) not in _NO_TOOLS] or pool
        ready = [b for b in pool if _COOLDOWN_UNTIL.get(b.provider, 0.0) <= now]
        # If everything is cooling down, still try them (soonest to recover first) rather than fail without asking.
        return ready or sorted(pool, key=lambda b: _COOLDOWN_UNTIL.get(b.provider, 0.0))

    @staticmethod
    def _sideline(backend: OpenAICompatBackend, error: LLMUnavailable) -> None:
        seconds = min(max(error.retry_after or 20.0, 5.0), MAX_COOLDOWN_SECONDS)
        _COOLDOWN_UNTIL[backend.provider] = time.monotonic() + seconds
        logger.warning("LLM provider %s sidelined for %.0fs: %s", backend.provider, seconds, str(error)[:160])

    def _fold_usage(self) -> None:
        for key in self.usage:
            self.usage[key] = sum(b.usage[key] for b in self.backends)

    async def chat(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> Dict[str, Any]:
        errors: List[str] = []
        for backend in self._order(bool(tools)):
            try:
                result = await backend.chat(messages, tools)
                self.last_provider = backend.provider
                self._fold_usage()
                return result
            except LLMUnavailable as e:
                self._sideline(backend, e)
                errors.append(str(e))
        self._fold_usage()
        raise LLMUnavailable(" | ".join(errors) or "no LLM provider configured", retry_after=None)

    async def chat_stream(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> AsyncIterator[Dict[str, Any]]:
        errors: List[str] = []
        for backend in self._order(bool(tools)):
            spoke = False
            try:
                async for event in backend.chat_stream(messages, tools):
                    spoke = spoke or event["type"] == "text"
                    yield event
                self.last_provider = backend.provider
                self._fold_usage()
                return
            except LLMUnavailable as e:
                self._sideline(backend, e)
                errors.append(str(e))
                if spoke:  # words already reached the caller: switching voices mid-sentence would be worse than failing
                    raise
        self._fold_usage()
        raise LLMUnavailable(" | ".join(errors) or "no LLM provider configured")


def parse_provider_spec(spec: str) -> List[Dict[str, Optional[str]]]:
    """'groq,groq:openai/gpt-oss-120b,gemini' -> [{'kind':'groq','model':None}, {'kind':'groq','model':'openai/gpt-oss-120b'},
    {'kind':'gemini','model':None}]. Case of model names is preserved; unknown kinds are ignored."""
    out: List[Dict[str, Optional[str]]] = []
    for raw in (spec or "").split(","):
        raw = raw.strip()
        if not raw:
            continue
        kind, _, model = raw.partition(":")
        if kind.lower() in ("groq", "gemini"):
            out.append({"kind": kind.lower(), "model": model.strip() or None})
    return out


def build_chat_backend(temperature: Optional[float] = None, preferred: Optional[str] = None, **kwargs: Any) -> ChatBackend:
    """Backend for a call, from LLM_PROVIDERS (entries: `groq`, `groq:<model>`, `gemini`, `gemini:<model>`), skipping
    providers without an API key. One provider -> that backend; several -> a fallback chain in that order (a provider
    that is not last fails fast on a short rate limit so the next one answers quickly); none -> Groq (fails clearly).
    `preferred` is the model the owner picked in the dashboard (`groq:<model>` / `gemini:<model>`): it goes first and the
    configured chain stays behind it as the fallback. Old free-text labels ("Groq LLaMA 3.3 70B") are ignored."""
    from backend.server.common.config import get_settings

    classes = {"groq": GroqChatBackend, "gemini": GeminiChatBackend}
    entries = parse_provider_spec(getattr(get_settings(), "LLM_PROVIDERS", "groq,gemini"))
    picked = [e for e in parse_provider_spec(preferred or "") if e["model"]] if preferred else []
    entries = picked[:1] + entries
    backends: List[OpenAICompatBackend] = []
    for i, entry in enumerate(entries):
        fast_fail = {"max_attempts": 2, "max_retry_wait": 1.0} if i < len(entries) - 1 else {}
        backend = classes[entry["kind"]](model=entry["model"], temperature=temperature, **{**fast_fail, **kwargs})
        if backend.api_key() and backend.provider not in [b.provider for b in backends]:
            backends.append(backend)
    if not backends:
        return GroqChatBackend(temperature=temperature, **kwargs)
    if len(backends) > 1:  # the last one left standing may take a little longer to ride out a rate limit
        backends[-1].max_attempts, backends[-1].max_retry_wait = 3, 4.0
    return backends[0] if len(backends) == 1 else FallbackChatBackend(backends)


def parse_sse_line(line: str) -> Optional[Dict[str, Any]]:
    """One SSE line -> the choice delta dict, or None for keep-alives, [DONE], and non-data lines."""
    if not line.startswith("data:"):
        return None
    data = line[5:].strip()
    if not data or data == "[DONE]":
        return None
    try:
        choices = json.loads(data).get("choices") or []
    except ValueError:
        return None
    return (choices[0].get("delta") or {}) if choices else None

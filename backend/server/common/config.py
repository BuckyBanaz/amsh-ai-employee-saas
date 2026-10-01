"""Central app settings, read from environment variables (.env in local dev,
real env vars in containers). Nothing here should hardcode a vertical or a
provider — see AI_Receptionist_Project_Structure_Spec.md §20.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "Amsh Backend"
    ENV: str = "development"
    DEBUG: bool = True

    # Database (Postgres in Docker; SQLAlchemy makes the driver swappable)
    DATABASE_URL: str = "postgresql+psycopg2://amsh:amsh@postgres:5432/amsh"

    # Redis (session/call state)
    REDIS_URL: str = "redis://redis:6379/0"

    # Auth
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    # Email (password reset, invites): Resend. Without a key the message is only logged (development).
    RESEND_API_KEY: str | None = None
    EMAIL_FROM: str = "AMSh <no-reply@amsh.ai>"
    FRONTEND_URL: str = "http://localhost:3000"  # base of the links inside emails

    # CORS — the two Next.js frontends
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]

    # Conversation engine rollout (DOCS/16): state_machine (legacy, default) | shadow (agent runs silently
    # beside legacy and is only logged) | llm_agent. A tenant can override via Agent.config["engine"].
    CONVERSATION_ENGINE: str = "state_machine"
    # Development conveniences that are unsafe with several customers: an unmatched phone call is given to the newest
    # business, and the old hard-coded WhatsApp verify tokens are accepted. Set to false in production.
    ALLOW_DEV_FALLBACKS: bool = True
    # Appointment reminders message real patients, so the background loop is off unless this is true AND the clinic enabled it.
    REMINDERS_ENABLED: bool = False
    REMINDER_INTERVAL_SECONDS: int = 300

    # Third-party providers — intentionally optional/unset until real keys
    # are supplied. Nothing in the realtime/engine layer should be built
    # assuming these exist; check for None and fail loudly at the call site.
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_PHONE_NUMBER: str | None = None
    GROQ_API_KEY: str | None = None
    # Default Groq model for the agent and legacy NLU. gpt-oss-20b is a reasoning model: it emits hidden reasoning tokens
    # before the first spoken word (see `llm_reasoning` in the [LATENCY] log). A non-reasoning model such as
    # llama-3.3-70b-versatile skips that step but must be checked for tool-calling reliability before switching.
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    # Voice latency (see backend/ai/realtime/latency.py for the per-turn [LATENCY] log).
    # Start TTS on the first safe clause (", " after >= 4 words, no numbers/questions) instead of the first full sentence.
    VOICE_EARLY_CHUNKING: bool = True
    # How long pooled HTTPS connections to Groq/Gemini/Cartesia stay open while idle. httpx's default is 5 s, shorter
    # than a typical caller utterance, so every turn used to pay a fresh TCP+TLS handshake to each provider.
    PROVIDER_KEEPALIVE_SECONDS: float = 120.0
    # Second LLM provider. LLM_PROVIDERS is the order tried (providers without a key are skipped); when the first is
    # rate limited or down, the next one answers the turn.
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"
    # Entries: `groq` (default model), `groq:<model>`, `gemini`. Groq limits are per model, so extra Groq models add
    # capacity. Order matters; the flaky-but-free qwen goes last.
    LLM_PROVIDERS: str = "groq,groq:openai/gpt-oss-120b,gemini,groq:qwen/qwen3.8-27b"
    DEEPGRAM_API_KEY: str | None = None
    ELEVENLABS_API_KEY: str | None = None
    CARTESIA_API_KEY: str | None = None

    # Public HTTPS origin Twilio can reach this server on (ngrok in dev, the
    # real domain in prod). Used to build absolute TwiML action/stream URLs.
    PUBLIC_BASE_URL: str | None = None

    # Exotel — Indian Telephony (+91 calls & SMS)
    EXOTEL_ACCOUNT_SID: str | None = None
    EXOTEL_API_KEY: str | None = None
    EXOTEL_API_TOKEN: str | None = None
    EXOTEL_PHONE_NUMBER: str | None = None
    # Meta WhatsApp Cloud API
    META_WHATSAPP_TOKEN: str | None = None
    META_WHATSAPP_PHONE_NUMBER_ID: str | None = None
    META_WHATSAPP_VERIFY_TOKEN: str = "amsh_wa_verify_token_2026"
    # Embedded Signup (per-business WABA onboarding via FB.login popup)
    META_APP_ID: str = "2495665704244136"
    META_APP_SECRET: str | None = None
    META_GRAPH_VERSION: str = "v23.0"

    # Razorpay Payments
    RAZORPAY_KEY_ID: str | None = None
    RAZORPAY_KEY_SECRET: str | None = None
    RAZORPAY_API_KEY: str | None = None
    RAZORPAY_SECRET_KEY: str | None = None



@lru_cache
def get_settings() -> Settings:
    return Settings()

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

    # CORS — the two Next.js frontends
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]

    # Third-party providers — intentionally optional/unset until real keys
    # are supplied. Nothing in the realtime/engine layer should be built
    # assuming these exist; check for None and fail loudly at the call site.
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_PHONE_NUMBER: str | None = None
    GROQ_API_KEY: str | None = None
    DEEPGRAM_API_KEY: str | None = None
    ELEVENLABS_API_KEY: str | None = None
    CARTESIA_API_KEY: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()

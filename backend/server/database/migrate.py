"""Runs Alembic migrations at startup.

Databases created before Alembic existed (tables from `create_all`, no `alembic_version` table) are stamped at the baseline
revision first, so their existing data is kept and only the newer migrations are applied."""

import logging
from pathlib import Path
from typing import Optional

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from backend.server.database.session import engine as app_engine

logger = logging.getLogger(__name__)

BASELINE_REVISION = "0001"
_BACKEND_DIR = Path(__file__).resolve().parents[2]


def _config(url: Optional[str]) -> Config:
    cfg = Config(str(_BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(_BACKEND_DIR / "migrations"))
    cfg.attributes["configure_logger"] = False  # keep the application's own logging setup
    if url:
        cfg.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    return cfg


def run_migrations(url: Optional[str] = None) -> str:
    """Bring the database to the latest schema. Returns "created", "stamped+upgraded" or "upgraded"."""
    cfg = _config(url)
    eng = create_engine(url) if url else app_engine
    try:
        tables = set(inspect(eng).get_table_names())
    finally:
        if url:
            eng.dispose()
    if "alembic_version" not in tables and "users" in tables:
        logger.info("[MIGRATE] Existing database without migration history: stamping baseline %s", BASELINE_REVISION)
        command.stamp(cfg, BASELINE_REVISION)
        command.upgrade(cfg, "head")
        return "stamped+upgraded"
    command.upgrade(cfg, "head")
    return "created" if "users" not in tables else "upgraded"

"""Languages the agent can speak, for the dashboard's language pickers.

One entry per language pack (`ai/locales/lexicon/<code>.json`): code, English and native name, text direction (the dashboard sets
`dir="rtl"` for Arabic and other right-to-left languages), and whether native filler words exist. Public and read-only: no tenant
data. A language added as a pack file shows up here with no other change.
"""

from typing import Any, Dict, List

from fastapi import APIRouter

from backend.ai.lexicon import language_directory

router = APIRouter(prefix="/api/languages", tags=["languages"])


@router.get("")
def list_languages() -> Dict[str, List[Dict[str, Any]]]:
    return {"languages": language_directory()}

"""Records metered tool use that nothing else keeps (LLM tokens) so the admin spend report can price it.

Never raises and never blocks a live call: the insert runs on a worker thread, and a failure is only logged."""

import asyncio
import logging
import os
from typing import Optional

from backend.server.database.models.spend import UsageEvent

logger = logging.getLogger(__name__)

TEST_CALL_PREFIXES = ("studio_", "webcall_", "sim_", "test_call_")  # the same calls the call log and analytics skip


def is_test_call(call_id: Optional[str]) -> bool:
    return bool(call_id) and str(call_id).startswith(TEST_CALL_PREFIXES)


def _insert(business_id: Optional[str], call_id: Optional[str], provider: str, prompt: int, completion: int, estimated: bool, test: bool) -> None:
    if os.environ.get("AMSH_DISABLE_COST_TRACKING"):
        return
    try:
        from backend.server.database.session import SessionLocal

        with SessionLocal() as db:
            db.add(UsageEvent(business_id=business_id, tool="llm", provider=provider, input_units=int(prompt), output_units=int(completion),
                              estimated=estimated, source="test" if test else "live", call_id=call_id))
            db.commit()
    except Exception as e:  # pragma: no cover - defensive
        logger.warning("[COST] could not record LLM usage: %s", e)


def record_llm(business_id: Optional[str], call_id: Optional[str], provider: str, prompt_tokens: int, completion_tokens: int, estimated: bool = False, test: bool = False) -> None:
    if prompt_tokens <= 0 and completion_tokens <= 0:
        return
    args = (business_id, call_id, provider, prompt_tokens, completion_tokens, estimated, test or is_test_call(call_id))
    try:
        asyncio.get_running_loop().run_in_executor(None, _insert, *args)
    except RuntimeError:  # no running loop (a script or a sync caller)
        _insert(*args)

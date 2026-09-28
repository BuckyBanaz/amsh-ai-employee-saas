"""LLM Agent + Tool Calling engine (see DOCS/16). The LLM converses; validated tools act."""

# Pre-existing import cycle: llm.client -> conversation -> state_machine -> tools -> answer_faq -> llm.client.
# Entering through `conversation` first (as production does) resolves it, so prime it here.
import backend.ai.engine.conversation  # noqa: F401,E402

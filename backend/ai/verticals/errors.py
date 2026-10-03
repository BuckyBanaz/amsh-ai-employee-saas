"""Explicit failures for missing runtime context. The engine never silently falls back to "clinic", India, UTC or any other
guess: a business without the settings it needs is a configuration problem to surface, not to hide."""


class MissingContextError(RuntimeError):
    """A required piece of runtime context (business, vertical, timezone...) is not configured."""


class UnknownVerticalError(MissingContextError, ValueError):
    """The business's vertical has no configuration / operations registered."""

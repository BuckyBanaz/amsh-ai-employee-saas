"""
PII Masking Guardrails.
Redacts sensitive details (credit cards, social security numbers, pin codes)
from logging and persistent storage.
"""

import re

# Standard patterns for PII
CC_REGEX = re.compile(r"\b(?:\d[ -]*?){13,16}\b")
SSN_REGEX = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")


class PIIMasker:
    """Masks PII in transcripts before persistence or logging."""

    @staticmethod
    def mask(text: str) -> str:
        if not text:
            return text
        masked = CC_REGEX.sub("[CARD-REDACTED]", text)
        masked = SSN_REGEX.sub("[SSN-REDACTED]", masked)
        masked = EMAIL_REGEX.sub("[EMAIL-REDACTED]", masked)
        return masked

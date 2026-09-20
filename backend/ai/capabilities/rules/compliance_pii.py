"""
Compliance & PII Redaction Rule.
Masks sensitive patient/customer identifiers (phone numbers, credit cards, emails) in logs.
"""

import re
from typing import str_or_none if False else None

PHONE_REGEX = re.compile(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
CREDIT_CARD_REGEX = re.compile(r'\b(?:\d[ -]*?){13,16}\b')


class CompliancePIIRule:
    """Sanitizes text logs to ensure HIPAA & GDPR compliance."""

    @staticmethod
    def redact(text: str) -> str:
        """Redacts phone numbers, emails, and card numbers from strings."""
        if not text:
            return ""
        
        redacted = PHONE_REGEX.sub("[PHONE_REDACTED]", text)
        redacted = EMAIL_REGEX.sub("[EMAIL_REDACTED]", redacted)
        redacted = CREDIT_CARD_REGEX.sub("[CARD_REDACTED]", redacted)
        return redacted

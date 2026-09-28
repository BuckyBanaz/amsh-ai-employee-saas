"""
Compliance & PII Redaction Rule.
Masks sensitive patient/customer identifiers (phone numbers, credit cards, emails) in logs.
"""

import re

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
CREDIT_CARD_REGEX = re.compile(r"\b(?:\d[ -]?){13,16}\b")
# 10+ digits, optionally with +country code and spaces / dashes / brackets (Indian and international numbers)
PHONE_REGEX = re.compile(r"(?<!\d)\+?\d[\d\s().-]{8,16}\d(?!\d)")


class CompliancePIIRule:
    """Sanitizes text logs to ensure HIPAA & GDPR compliance."""

    @staticmethod
    def redact(text: str) -> str:
        """Redacts emails, card numbers and phone numbers from strings (cards first: they are longer digit runs)."""
        if not text:
            return ""
        redacted = EMAIL_REGEX.sub("[EMAIL_REDACTED]", text)
        redacted = CREDIT_CARD_REGEX.sub("[CARD_REDACTED]", redacted)
        return PHONE_REGEX.sub("[PHONE_REDACTED]", redacted)

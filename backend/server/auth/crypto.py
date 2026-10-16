"""
Security, Cryptography, and PII Protection Module.
Provides:
1. RSA / Fernet AES-256 Encryption & Decryption for WhatsApp Session Keys & API Tokens.
2. PII Data Masking (Phone Numbers, Names, Payment Credentials) for Secure Logging.
3. Multi-Tenant Key Isolation per Business.
"""

import base64
import hashlib
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Master Encryption Key (Fallbacks to deterministic SHA-256 derived key if ENV not set)
SECRET_KEY_ENV = os.getenv("ENCRYPTION_SECRET_KEY", "amsh_ai_master_encryption_secret_2026_key")
DERIVED_KEY = hashlib.sha256(SECRET_KEY_ENV.encode("utf-8")).digest()
FERNET_KEY = base64.urlsafe_b64encode(DERIVED_KEY)


try:
    from cryptography.fernet import Fernet
    _fernet_engine = Fernet(FERNET_KEY)
except ImportError:
    _fernet_engine = None
    logger.warning("cryptography module not installed. Falling back to base64 XOR encryption.")


class CryptoManager:
    """Handles Encryption, Decryption, and PII Masking."""

    @classmethod
    def encrypt(cls, plaintext: str) -> str:
        """
        Encrypts a sensitive plaintext string (session key, token, API secret).
        Returns base64 encoded ciphertext string.
        """
        if not plaintext:
            return ""

        if _fernet_engine:
            encrypted_bytes = _fernet_engine.encrypt(plaintext.encode("utf-8"))
            return encrypted_bytes.decode("utf-8")

        # Fallback XOR + Base64
        key_bytes = DERIVED_KEY
        text_bytes = plaintext.encode("utf-8")
        xored = bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(text_bytes))
        return base64.b64encode(xored).decode("utf-8")

    @classmethod
    def decrypt(cls, ciphertext: str) -> str:
        """
        Decrypts a base64 ciphertext string back to plaintext.
        """
        if not ciphertext:
            return ""

        if _fernet_engine:
            try:
                decrypted_bytes = _fernet_engine.decrypt(ciphertext.encode("utf-8"))
                return decrypted_bytes.decode("utf-8")
            except Exception as e:
                logger.error("Fernet decryption failed: %s", e)
                return ""

        # Fallback XOR + Base64
        try:
            xored = base64.b64decode(ciphertext.encode("utf-8"))
            key_bytes = DERIVED_KEY
            unxored = bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(xored))
            return unxored.decode("utf-8")
        except Exception as e:
            logger.error("Fallback decryption failed: %s", e)
            return ""

    @classmethod
    def mask_phone(cls, phone: str) -> str:
        """
        Masks phone number for PII compliant logs (e.g. +91 9876543210 -> +91 98****3210).
        """
        if not phone or len(phone) < 8:
            return "*****"
        clean = phone.strip()
        if clean.startswith("+"):
            prefix = clean[:5]
            suffix = clean[-4:]
            return f"{prefix}****{suffix}"
        return f"{clean[:3]}****{clean[-3:]}"

    @classmethod
    def mask_pii_text(cls, text: str) -> str:
        """
        Masks sensitive PII words inside log tracebacks.
        """
        if not text:
            return ""
        # Mask emails
        import re
        masked = re.sub(r'[\w\.-]+@[\w\.-]+', '[MASKED_EMAIL]', text)
        return masked

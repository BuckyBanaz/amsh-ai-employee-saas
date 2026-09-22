"""
Verification test script for CryptoManager encryption, decryption, and PII masking.
"""

import os
import sys

sys.path.insert(0, r"c:\Users\Parikshit\Desktop\saas")

from backend.server.auth.crypto import CryptoManager


def test_encryption_decryption():
    print("\n--- 1. Testing Encryption & Decryption ---")
    original_session_token = "wa_sess_secret_token_992182019481"
    
    encrypted = CryptoManager.encrypt(original_session_token)
    print(f"Original Text:  {original_session_token}")
    print(f"Encrypted Text: {encrypted}")
    
    assert encrypted != original_session_token, "Encryption failed: Output matches input"
    
    decrypted = CryptoManager.decrypt(encrypted)
    print(f"Decrypted Text: {decrypted}")
    
    assert decrypted == original_session_token, f"Decryption failed: {decrypted} != {original_session_token}"
    print("SUCCESS: Encryption & Decryption Passed!")


def test_pii_masking():
    print("\n--- 2. Testing PII Phone Masking ---")
    phone = "+91 9876543210"
    masked = CryptoManager.mask_phone(phone)
    print(f"Original Phone: {phone}")
    print(f"Masked Phone:   {masked}")
    
    assert "****" in masked, "Masking failed"
    print("SUCCESS: PII Masking Passed!")


if __name__ == "__main__":
    test_encryption_decryption()
    test_pii_masking()
    print("\nALL CRYPTOGRAPHY & SECURITY TESTS PASSED SUCCESSFULLY!")

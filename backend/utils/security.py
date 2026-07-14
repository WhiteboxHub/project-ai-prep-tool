# backend\utils\security.py
from cryptography.fernet import Fernet
import os
import base64

SECRET_KEY = os.getenv("ENCRYPTION_KEY")

if not SECRET_KEY:
    raise Exception("ENCRYPTION_KEY not set")

# Validate key
try:
    base64.urlsafe_b64decode(SECRET_KEY)
except Exception:
    raise Exception("Invalid ENCRYPTION_KEY. Must be base64 encoded Fernet key.")

cipher = Fernet(SECRET_KEY)

# Fallback WBL keys
FALLBACK_KEYS = [
    b'HIizg-wNBLUCcw5JjCA8JVGKu0WE5Omst8gI59UMqEc=',
    b'7aqK1zhMEO0AF08ewGf1tL6nqY9kA9v8_E00MlsNjLw='
]
fallback_ciphers = [Fernet(k) for k in FALLBACK_KEYS]

def encrypt(text: str) -> str:
    return cipher.encrypt(text.encode()).decode()

def decrypt(token: str) -> str:
    if not token:
        return ""
    try:
        return cipher.decrypt(token.encode()).decode()
    except Exception:
        for f_cipher in fallback_ciphers:
            try:
                return f_cipher.decrypt(token.encode()).decode()
            except Exception:
                continue
        # Final fallback: if decryption fails (e.g. it is already a plain-text API key), return it directly
        return token
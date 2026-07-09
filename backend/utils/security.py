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

# Fallback WBL key used by wbl-backend if ENCRYPTION_KEY is not set
FALLBACK_KEY = b'HIizg-wNBLUCcw5JjCA8JVGKu0WE5Omst8gI59UMqEc='
fallback_cipher = Fernet(FALLBACK_KEY)

def encrypt(text: str) -> str:
    return cipher.encrypt(text.encode()).decode()

def decrypt(token: str) -> str:
    if not token:
        return ""
    try:
        return cipher.decrypt(token.encode()).decode()
    except Exception:
        try:
            # If the primary key fails, try the fallback key (useful for legacy WBL candidate keys)
            return fallback_cipher.decrypt(token.encode()).decode()
        except Exception:
            # Final fallback: if decryption fails (e.g. it is already a plain-text API key), return it directly
            return token
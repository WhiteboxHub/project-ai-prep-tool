# utils/wbl_auth.py
# Verifies JWTs issued by the WBL backend (wbl-backend).
# Both backends share the same SECRET_KEY, so we can validate directly.

import os
from fastapi import HTTPException, Request, status
from jose import jwt, JWTError

WBL_SECRET_KEY = os.getenv("WBL_SECRET_KEY", "")
WBL_JWT_ALGORITHM = os.getenv("WBL_JWT_ALGORITHM", "HS256")


def _extract_token(request: Request) -> str:
    """Pull Bearer token from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1]
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid Authorization header",
    )


def get_wbl_user_email(request: Request) -> str:
    """
    FastAPI dependency.
    Decodes the WBL JWT and returns the user's email (stored in 'sub' claim).
    Raises 401 if the token is missing, invalid, or expired.
    """
    if not WBL_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="WBL_SECRET_KEY not configured on AI prep backend",
        )

    token = _extract_token(request)
    try:
        payload = jwt.decode(token, WBL_SECRET_KEY, algorithms=[WBL_JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired WBL token: {exc}",
        )

    # WBL backend stores the username/email in the 'sub' claim
    email: str = payload.get("sub") or payload.get("uname") or payload.get("user_id")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user identity (sub/uname)",
        )
    return email

"""Password hashing and signed bearer-token authentication."""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any, Dict

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.database.store import get_user_by_id

_PASSWORD_ITERATIONS = 600_000
_TOKEN_LIFETIME_SECONDS = 60 * 60 * 12
_bearer_scheme = HTTPBearer(auto_error=False)


def _secret_key() -> bytes:
    secret = os.getenv("ROUTEMATE_SECRET_KEY")
    if not secret:
        if os.getenv("APP_ENV") == "production":
            raise HTTPException(status_code=503, detail="Authentication is not configured.")
        secret = "local-development-only-change-before-deployment"
    return secret.encode("utf-8")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PASSWORD_ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(
        _PASSWORD_ITERATIONS,
        base64.urlsafe_b64encode(salt).decode("ascii"),
        base64.urlsafe_b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, stored_password: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, digest_text = stored_password.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_text)
        if iterations < 100_000 or iterations > 2_000_000:
            return False
        salt = base64.urlsafe_b64decode(salt_text.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_text.encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def is_password_hash(stored_password: str) -> bool:
    return stored_password.startswith("pbkdf2_sha256$")


def create_access_token(user_id: str, password_change_required: bool = False) -> str:
    payload = {
        "sub": user_id,
        "exp": int(time.time()) + _TOKEN_LIFETIME_SECONDS,
        "iss": "routemate-ai",
        "password_change_required": password_change_required,
    }
    encoded_payload = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).rstrip(b"=").decode("ascii")
    signature = hmac.new(_secret_key(), encoded_payload.encode("ascii"), hashlib.sha256).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b"=").decode("ascii")
    return f"{encoded_payload}.{encoded_signature}"


def _decode_access_token(token: str) -> Dict[str, Any]:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
        expected_signature = hmac.new(
            _secret_key(), encoded_payload.encode("ascii"), hashlib.sha256
        ).digest()
        supplied_signature = base64.urlsafe_b64decode(
            encoded_signature + "=" * (-len(encoded_signature) % 4)
        )
        if not hmac.compare_digest(expected_signature, supplied_signature):
            raise ValueError("Invalid token signature")
        payload = json.loads(
            base64.urlsafe_b64decode(encoded_payload + "=" * (-len(encoded_payload) % 4))
        )
        if payload.get("iss") != "routemate-ai" or int(payload.get("exp", 0)) <= int(time.time()):
            raise ValueError("Expired or invalid token")
        if not isinstance(payload.get("sub"), str) or not payload["sub"]:
            raise ValueError("Invalid token subject")
        return payload
    except (ValueError, TypeError, KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> Dict[str, Any]:
    return _get_authenticated_user(credentials, allow_password_change=False)


def get_user_for_password_change(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> Dict[str, Any]:
    return _get_authenticated_user(credentials, allow_password_change=True)


def _get_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None,
    allow_password_change: bool,
) -> Dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = _decode_access_token(credentials.credentials)
    if payload.get("password_change_required") and not allow_password_change:
        raise HTTPException(status_code=403, detail="Change your password before using this account.")
    user = get_user_by_id(payload["sub"])
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

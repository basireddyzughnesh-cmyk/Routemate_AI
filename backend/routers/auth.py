"""
Authentication and User Profile Router for RouteMate AI.
Handles user sign in, registration, demo accounts, profile updates, and travel settings.
"""

import hmac
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from backend.database.store import (
    get_user_by_email,
    get_user_by_id,
    save_user,
    update_user_profile,
    DEMO_USER
)
from backend.security.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    is_password_hash,
    get_user_for_password_change,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)

class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    travel_style: Optional[str] = "Solo"
    home_city: Optional[str] = "Jaipur, Rajasthan, India"

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    home_city: Optional[str] = None
    bio: Optional[str] = None
    travel_style: Optional[str] = None
    pace: Optional[str] = None
    currency: Optional[str] = None
    units: Optional[str] = None
    accessibility_mode: Optional[bool] = None
    interests: Optional[List[str]] = None

def sanitize_user(user: Dict[str, Any]) -> Dict[str, Any]:
    safe = dict(user)
    safe.pop("password", None)
    return safe

@router.post("/login")
def login(payload: LoginRequest):
    email = str(payload.email).strip().lower()
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    stored_password = user.get("password", "")
    valid_password = verify_password(payload.password, stored_password) if is_password_hash(
        stored_password
    ) else hmac.compare_digest(payload.password.encode("utf-8"), stored_password.encode("utf-8"))
    if not valid_password:
        raise HTTPException(status_code=401, detail="Incorrect password.")

    password_change_required = os.getenv("APP_ENV") == "production" and not is_password_hash(stored_password)
    if password_change_required:
        user["password"] = hash_password(payload.password)
        save_user(user)

    return {
        "status": "success",
        "token": create_access_token(user["id"], password_change_required),
        "password_change_required": password_change_required,
        "user": sanitize_user(user)
    }

@router.post("/demo")
def login_demo():
    if os.getenv("APP_ENV") == "production" and os.getenv("ALLOW_DEMO_LOGIN") != "true":
        raise HTTPException(status_code=403, detail="Demo login is disabled.")
    user = get_user_by_id(DEMO_USER["id"]) or DEMO_USER
    stored_password = user.get("password", "")
    password_change_required = False
    return {
        "status": "success",
        "token": create_access_token(user["id"], password_change_required),
        "password_change_required": password_change_required,
        "user": sanitize_user(user)
    }

@router.post("/register")
def register(payload: RegisterRequest):
    email = str(payload.email).strip().lower()
    existing = get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="Account with this email already exists.")
        
    user_id = f"usr-{uuid.uuid4().hex[:8]}"
    new_user = {
        "id": user_id,
        "name": payload.name.strip(),
        "email": email,
        "password": hash_password(payload.password),
        "avatar": f"https://api.dicebear.com/7.x/initials/svg?seed={payload.name.replace(' ', '+')}&backgroundColor=0b132b,06d6a0",
        "membership": "RouteMate Standard Traveler",
        "home_city": payload.home_city or "Traveler Hub",
        "bio": "Exploring the world with RouteMate AI decision engine.",
        "travel_style": payload.travel_style or "Solo",
        "pace": "Balanced",
        "currency": "USD",
        "units": "km",
        "accessibility_mode": False,
        "interests": ["Culture", "Nature", "Food"],
        "trips_completed": 0,
        "countries_visited": 1,
        "saved_budget_usd": 0.0,
        "created_at": datetime.now().isoformat()
    }
    
    save_user(new_user)
    return {
        "status": "success",
        "token": create_access_token(user_id),
        "user": sanitize_user(new_user)
    }

@router.get("/profile")
def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {"status": "success", "user": sanitize_user(current_user)}

@router.put("/password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: Dict[str, Any] = Depends(get_user_for_password_change),
):
    stored_password = current_user.get("password", "")
    valid_current_password = (
        verify_password(payload.current_password, stored_password)
        if is_password_hash(stored_password)
        else hmac.compare_digest(
            payload.current_password.encode("utf-8"),
            stored_password.encode("utf-8"),
        )
    )
    if not valid_current_password:
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    if hmac.compare_digest(payload.current_password, payload.new_password):
        raise HTTPException(status_code=400, detail="Choose a new password different from your current password.")

    updated = update_user_profile(
        current_user["id"],
        {"password": hash_password(payload.new_password)},
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Account not found.")
    return {
        "status": "success",
        "token": create_access_token(updated["id"]),
        "user": sanitize_user(updated),
    }

@router.put("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    user_id = current_user["id"]
    if "email" in updates:
        updates["email"] = str(updates["email"]).strip().lower()
        existing_user = get_user_by_email(updates["email"])
        if existing_user and existing_user.get("id") != user_id:
            raise HTTPException(status_code=400, detail="An account with this email already exists.")

    updated = update_user_profile(user_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Account not found.")

    return {
        "status": "success",
        "user": sanitize_user(updated)
    }

"""
JSON-backed persistent store for RouteMate AI.
Ensures saved trips, custom expense entries, packing statuses, and user profile data
persist reliably on disk across server sessions.
"""

import json
import os
from typing import List, Dict, Any, Optional

DATA_DIR = os.getenv(
    "ROUTEMATE_DATA_DIR",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage_data"),
)
TRIPS_FILE = os.path.join(DATA_DIR, "saved_trips.json")
PREFS_FILE = os.path.join(DATA_DIR, "user_preferences.json")
USERS_FILE = os.path.join(DATA_DIR, "users.json")

DEMO_USER = {
    "id": "usr-alex-1",
    "name": "Alex Rivera",
    "email": "alex.rivera@routemate.ai",
    "password": "password123",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "membership": "RouteMate Pro Explorer",
    "home_city": "Jaipur, Rajasthan, India",
    "bio": "Curious wanderer & culinary enthusiast. Focused on sustainable journeys and immersive cultural routes.",
    "travel_style": "Couple",
    "pace": "Balanced",
    "currency": "USD",
    "units": "km",
    "accessibility_mode": False,
    "interests": ["Culture", "Food", "Nature", "Photography"],
    "trips_completed": 6,
    "countries_visited": 14,
    "saved_budget_usd": 1820.0,
    "created_at": "2026-01-15T09:30:00Z"
}

def _ensure_dir():
    for path in (TRIPS_FILE, PREFS_FILE, USERS_FILE):
        os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(TRIPS_FILE):
        with open(TRIPS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
    if not os.path.exists(PREFS_FILE):
        default_prefs = {
            "currency": "USD",
            "units": "km",
            "accessibility_mode": False,
            "theme": "light",
            "default_travel_style": "Solo",
            "favorite_destinations": ["jaipur-rajasthan", "kochi-kerala"]
        }
        with open(PREFS_FILE, "w", encoding="utf-8") as f:
            json.dump(default_prefs, f)
    if not os.path.exists(USERS_FILE):
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            production_demo_enabled = (
                os.getenv("APP_ENV") == "production"
                and os.getenv("ALLOW_DEMO_LOGIN") == "true"
            )
            json.dump(
                [DEMO_USER] if os.getenv("APP_ENV") != "production" or production_demo_enabled else [],
                f,
                indent=2,
            )

def get_all_trips(user_id: str) -> List[Dict[str, Any]]:
    _ensure_dir()
    try:
        with open(TRIPS_FILE, "r", encoding="utf-8") as f:
            trips = json.load(f)
        return [
            trip for trip in trips
            if trip.get("owner_id", DEMO_USER["id"]) == user_id
        ]
    except Exception:
        return []

def get_trip_by_id(trip_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    for trip in get_all_trips(user_id):
        if trip.get("trip_id") == trip_id:
            return trip
    return None

def save_trip_record(trip: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    _ensure_dir()
    with open(TRIPS_FILE, "r", encoding="utf-8") as f:
        trips = json.load(f)
    trip["is_saved"] = True
    trip["owner_id"] = user_id
    
    # Check if trip exists to update
    for idx, existing in enumerate(trips):
        if existing.get("trip_id") == trip.get("trip_id") and existing.get("owner_id", DEMO_USER["id"]) == user_id:
            trips[idx] = trip
            with open(TRIPS_FILE, "w", encoding="utf-8") as f:
                json.dump(trips, f, indent=2)
            return trip
            
    trips.append(trip)
    with open(TRIPS_FILE, "w", encoding="utf-8") as f:
        json.dump(trips, f, indent=2)
    return trip

def delete_trip_record(trip_id: str, user_id: str) -> bool:
    _ensure_dir()
    with open(TRIPS_FILE, "r", encoding="utf-8") as f:
        trips = json.load(f)
    filtered = [
        trip for trip in trips
        if not (
            trip.get("trip_id") == trip_id
            and trip.get("owner_id", DEMO_USER["id"]) == user_id
        )
    ]
    if len(filtered) < len(trips):
        with open(TRIPS_FILE, "w", encoding="utf-8") as f:
            json.dump(filtered, f, indent=2)
        return True
    return False

def get_all_users() -> List[Dict[str, Any]]:
    _ensure_dir()
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return [DEMO_USER]

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    users = get_all_users()
    for u in users:
        if u.get("email", "").lower() == email.lower().strip():
            return u
    return None

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    users = get_all_users()
    for u in users:
        if u.get("id") == user_id:
            return u
    return None

def save_user(user: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_dir()
    users = get_all_users()
    for idx, u in enumerate(users):
        if u.get("id") == user.get("id") or u.get("email") == user.get("email"):
            users[idx] = user
            with open(USERS_FILE, "w", encoding="utf-8") as f:
                json.dump(users, f, indent=2)
            return user
            
    users.append(user)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)
    return user

def update_user_profile(user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    _ensure_dir()
    users = get_all_users()
    for idx, u in enumerate(users):
        if u.get("id") == user_id:
            users[idx].update(updates)
            with open(USERS_FILE, "w", encoding="utf-8") as f:
                json.dump(users, f, indent=2)
            return users[idx]
    return None

def get_user_preferences() -> Dict[str, Any]:
    _ensure_dir()
    try:
        with open(PREFS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"currency": "USD", "units": "km", "accessibility_mode": False}

def update_user_preferences(prefs: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_dir()
    current = get_user_preferences()
    current.update(prefs)
    with open(PREFS_FILE, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2)
    return current

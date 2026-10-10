"""
Automated unit and integration test suite for RouteMate AI.
Tests Multi-Attribute Utility scoring, budget calculations,
itinerary generation, replanning logic, and API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.decision_engine import (
    calculate_budget_fit,
    calculate_interest_match,
    calculate_duration_fit,
    evaluate_destinations
)
from backend.data.destinations import DESTINATIONS_DATA

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "RouteMate AI" in data["service"]

def test_destinations_list():
    response = client.get("/api/destinations")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 6
    assert any(d["name"] == "Jaipur" for d in items)
    assert all(d["country"] == "India" for d in items)

def test_destinations_search_filter():
    response = client.get("/api/destinations?q=Kerala")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    assert items[0]["country"] == "India"
    assert items[0]["region"] == "Kerala"

def test_decision_engine_scoring_math():
    # Budget fit test: daily cost 140 with 200 daily budget should yield high score
    score_fit, _ = calculate_budget_fit(140.0, 200.0)
    assert score_fit >= 90.0

    # Over budget test
    score_over, _ = calculate_budget_fit(300.0, 100.0)
    assert score_over < 50.0

    # Interest match test
    score_interests, _ = calculate_interest_match(["Culture", "Food", "History"], ["Culture", "Food"])
    assert score_interests >= 90.0

    # Full destination evaluation
    evaluations = evaluate_destinations(
        destinations=DESTINATIONS_DATA,
        user_interests=["Culture", "Food"],
        total_budget=2000.0,
        duration_days=5,
        travellers_count=1
    )
    assert len(evaluations) > 0
    # Weights should be normalized and scores between 0 and 100
    for ev in evaluations:
        assert 0 <= ev["match_score"] <= 100
        assert len(ev["factor_scores"]) == 5

def test_decision_engine_api_evaluate():
    payload = {
        "user_interests": ["Nature", "Mountains"],
        "total_budget": 3000.0,
        "duration_days": 5,
        "travellers_count": 2,
        "accessibility_needs": False
    }
    response = client.post("/api/decision-engine/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "evaluations" in data
    # Himalayan destinations should score well for Nature & Mountains
    top_dest = data["evaluations"][0]["destination"]["name"]
    assert top_dest in ["Shimla", "Gangtok", "Rishikesh"]

def test_trip_planner_generate():
    payload = {
        "starting_location": "Jaipur, Rajasthan, India",
        "destination_id": "kochi-kerala",
        "discovery_mode": False,
        "start_date": "2026-11-01",
        "end_date": "2026-11-05",
        "travellers_count": 2,
        "total_budget": 2500.0,
        "currency": "USD",
        "interests": ["Culture", "Food"],
        "travel_style": "Couple",
        "transport_preference": "Public Transit / Walking",
        "accessibility_needs": False,
        "pace": "Balanced"
    }
    response = client.post("/api/planner/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    trip = data["trip"]
    assert trip["destination"]["name"] == "Kochi & Fort Kochi"
    assert len(trip["itinerary_days"]) == 5
    assert trip["budget_breakdown"]["total_estimated_usd"] > 0
    assert len(trip["packing_checklist"]) >= 4
    assert len(trip["route_waypoints"]) >= 2

def test_replanning_budget_cut():
    # First generate a trip
    payload = {
        "starting_location": "Mumbai, Maharashtra, India",
        "destination_id": "jaipur-rajasthan",
        "start_date": "2026-10-15",
        "end_date": "2026-10-19",
        "travellers_count": 1,
        "total_budget": 1800.0,
        "currency": "USD",
        "interests": ["Art", "History"],
        "travel_style": "Solo",
        "transport_preference": "Metro",
        "accessibility_needs": False,
        "pace": "Balanced"
    }
    gen_res = client.post("/api/planner/generate", json=payload)
    trip = gen_res.json()["trip"]
    original_cost = trip["budget_breakdown"]["total_estimated_usd"]

    # Replan for budget cut
    replan_payload = {
        "current_trip": trip,
        "instruction_type": "budget_cut",
        "budget_reduction_pct": 20.0
    }
    replan_res = client.post("/api/planner/replan", json=replan_payload)
    assert replan_res.status_code == 200
    updated_trip = replan_res.json()["updated_trip"]
    new_cost = updated_trip["budget_breakdown"]["total_estimated_usd"]
    assert new_cost < original_cost
    assert len(replan_res.json()["changes_made"]) > 0

def test_group_trip_intelligence():
    payload = {
        "destination_id": "goa-india",
        "duration_days": 6,
        "members": [
            {
                "name": "Sarah",
                "interests": ["Beaches", "Relaxation"],
                "budget_limit_usd": 1200.0,
                "travel_style": "Relaxed"
            },
            {
                "name": "Marcus",
                "interests": ["Adventure", "Culture"],
                "budget_limit_usd": 800.0,
                "travel_style": "Active"
            }
        ],
        "split_strategy": "equal"
    }
    response = client.post("/api/group-planner/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()["group_analysis"]
    assert data["group_size"] == 2
    assert len(data["individual_contributions"]) == 2
    assert "consensus_score" in data

def test_ai_assistant_chat():
    payload = {
        "messages": [
            {"role": "user", "content": "How can I reduce my trip budget for Jaipur?"}
        ],
        "currency": "USD"
    }
    response = client.post("/api/assistant/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data["response"]
    assert len(data["response"]["suggested_actions"]) > 0

def test_auth_demo_and_profile_flow(monkeypatch, tmp_path):
    from backend.database import store

    monkeypatch.setattr(store, "USERS_FILE", str(tmp_path / "users.json"))
    store.save_user(dict(store.DEMO_USER))

    # Demo login
    demo_res = client.post("/api/auth/demo")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    assert demo_data["status"] == "success"
    assert demo_data["user"]["name"] == "Alex Rivera"
    assert "token" in demo_data

    # Profile fetch
    headers = {"Authorization": f"Bearer {demo_data['token']}"}
    prof_res = client.get("/api/auth/profile", headers=headers)
    assert prof_res.status_code == 200
    prof = prof_res.json()["user"]
    assert prof["email"] == "alex.rivera@routemate.ai"

    # Profile update
    update_res = client.put("/api/auth/profile", headers=headers, json={
        "home_city": "Seattle, USA",
        "travel_style": "Solo"
    })
    assert update_res.status_code == 200
    updated_user = update_res.json()["user"]
    assert updated_user["home_city"] == "Seattle, USA"
    assert updated_user["travel_style"] == "Solo"

def test_private_endpoints_require_authentication():
    assert client.get("/api/auth/profile").status_code == 401
    assert client.put("/api/auth/profile", json={"name": "Intruder"}).status_code == 401
    assert client.get("/api/trips").status_code == 401
    assert client.get("/api/analytics").status_code == 401

def test_registration_hashes_password_and_login_issues_signed_token(monkeypatch, tmp_path):
    from backend.database import store
    from backend.security.auth import is_password_hash

    monkeypatch.setattr(store, "USERS_FILE", str(tmp_path / "users.json"))
    register_res = client.post("/api/auth/register", json={
        "name": "Test Traveler",
        "email": "traveler@example.com",
        "password": "correct horse battery staple"
    })
    assert register_res.status_code == 200
    registered = register_res.json()
    stored_user = store.get_user_by_email("traveler@example.com")
    assert is_password_hash(stored_user["password"])
    assert "password" not in registered["user"]

    login_res = client.post("/api/auth/login", json={
        "email": "traveler@example.com",
        "password": "correct horse battery staple"
    })
    assert login_res.status_code == 200
    headers = {"Authorization": f"Bearer {login_res.json()['token']}"}
    assert client.get("/api/auth/profile", headers=headers).json()["user"]["email"] == "traveler@example.com"
    assert client.post("/api/auth/login", json={
        "email": "traveler@example.com",
        "password": "incorrect password"
    }).status_code == 401
    assert client.post("/api/auth/login", json={
        "email": "unknown@example.com",
        "password": "some password"
    }).status_code == 401

def test_legacy_account_requires_password_rotation_in_production(monkeypatch, tmp_path):
    from backend.database import store

    monkeypatch.setattr(store, "USERS_FILE", str(tmp_path / "users.json"))
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ROUTEMATE_SECRET_KEY", "test-signing-key-not-for-production")
    store.save_user({
        "id": "usr-legacy-test",
        "name": "Legacy Traveler",
        "email": "legacy@example.com",
        "password": "legacy-password"
    })

    login_res = client.post("/api/auth/login", json={
        "email": "legacy@example.com",
        "password": "legacy-password"
    })
    assert login_res.status_code == 200
    data = login_res.json()
    headers = {"Authorization": f"Bearer {data['token']}"}
    assert data["password_change_required"] is True
    assert client.get("/api/auth/profile", headers=headers).status_code == 403
    assert client.put("/api/auth/password", headers=headers, json={
        "current_password": "legacy-password",
        "new_password": "new-secure-password-2026"
    }).status_code == 200

def test_trip_data_is_private_to_account_owner(monkeypatch, tmp_path):
    from backend.database import store

    monkeypatch.setattr(store, "TRIPS_FILE", str(tmp_path / "trips.json"))
    monkeypatch.setattr(store, "USERS_FILE", str(tmp_path / "users.json"))
    user_one = client.post("/api/auth/register", json={
        "name": "First Traveler",
        "email": "first@example.com",
        "password": "first-account-password"
    }).json()
    user_two = client.post("/api/auth/register", json={
        "name": "Second Traveler",
        "email": "second@example.com",
        "password": "second-account-password"
    }).json()
    headers_one = {"Authorization": f"Bearer {user_one['token']}"}
    headers_two = {"Authorization": f"Bearer {user_two['token']}"}
    trip = {"trip_id": "private-trip", "title": "Private Trip"}

    assert client.post("/api/trips", headers=headers_one, json=trip).status_code == 200
    assert len(client.get("/api/trips", headers=headers_one).json()) == 1
    assert client.get("/api/trips", headers=headers_two).json() == []
    assert client.delete("/api/trips/private-trip", headers=headers_two).status_code == 404

def test_profile_email_can_be_updated_and_must_be_unique(monkeypatch, tmp_path):
    from backend.database import store

    monkeypatch.setattr(store, "USERS_FILE", str(tmp_path / "users.json"))
    store.save_user({
        "id": "usr-email-edit-test",
        "name": "Email Test",
        "email": "old.email@example.com",
        "password": "password123"
    })
    store.save_user({
        "id": "usr-existing-email-test",
        "name": "Existing User",
        "email": "taken.email@example.com",
        "password": "password123"
    })
    login_res = client.post("/api/auth/login", json={
        "email": "old.email@example.com",
        "password": "password123"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['token']}"}

    update_res = client.put(
        "/api/auth/profile",
        headers=headers,
        json={"email": "New.Email@Example.com"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["user"]["email"] == "new.email@example.com"
    assert store.get_user_by_email("new.email@example.com")["id"] == "usr-email-edit-test"

    duplicate_res = client.put(
        "/api/auth/profile",
        headers=headers,
        json={"email": "taken.email@example.com"}
    )
    assert duplicate_res.status_code == 400
    assert duplicate_res.json()["detail"] == "An account with this email already exists."

    invalid_res = client.put(
        "/api/auth/profile",
        headers=headers,
        json={"email": "not-an-email"}
    )
    assert invalid_res.status_code == 422

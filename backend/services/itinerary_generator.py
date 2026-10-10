"""
Itinerary Generator & Route Coordinator for RouteMate AI.
Generates structured day-by-day schedules, category budget allocations,
packing recommendations, and geographical waypoints for map rendering.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import math
from backend.data.destinations import get_destination_by_id, DESTINATIONS_DATA

def calculate_budget_allocation(
    dest_data: Dict[str, Any],
    duration_days: int,
    travellers_count: int,
    total_budget: float,
    currency: str = "USD"
) -> Dict[str, Any]:
    daily_rates = dest_data.get("cost_breakdown_daily", {
        "accommodation": 80.0,
        "food": 40.0,
        "transit": 15.0,
        "activities": 25.0
    })
    
    # Scale realistic base costs
    accom_total = daily_rates["accommodation"] * duration_days * math.ceil(travellers_count / 2)
    food_total = daily_rates["food"] * duration_days * travellers_count
    local_transit = daily_rates["transit"] * duration_days * travellers_count
    
    # Intercity / flight / arrival transit estimate
    transit_arrival = 180.0 * travellers_count
    total_transit = local_transit + transit_arrival
    
    activities_total = daily_rates["activities"] * duration_days * travellers_count
    misc_total = 20.0 * duration_days * travellers_count
    
    total_estimated = round(accom_total + food_total + total_transit + activities_total + misc_total, 2)
    cost_per_person = round(total_estimated / max(1, travellers_count), 2)
    
    is_within = total_estimated <= total_budget
    variance = round(total_budget - total_estimated, 2)
    
    return {
        "transport_usd": round(total_transit, 2),
        "accommodation_usd": round(accom_total, 2),
        "food_usd": round(food_total, 2),
        "activities_usd": round(activities_total, 2),
        "miscellaneous_usd": round(misc_total, 2),
        "total_estimated_usd": total_estimated,
        "cost_per_person_usd": cost_per_person,
        "currency": currency,
        "conversion_rate": 1.0,
        "is_within_budget": is_within,
        "budget_variance_usd": variance,
        "daily_average_usd": round(total_estimated / max(1, duration_days), 2)
    }

def generate_packing_checklist(
    dest_data: Dict[str, Any],
    duration_days: int,
    interests: List[str]
) -> List[Dict[str, Any]]:
    items = [
        {"id": "p-1", "item_name": "Passport & Digital Travel Insurance", "category": "Essentials", "packed": True, "reason": "Mandatory international identification"},
        {"id": "p-2", "item_name": "Universal Power Adapter & Power Bank (10,000mAh)", "category": "Electronics", "packed": False, "reason": "Keep phone & camera charged during day excursions"},
        {"id": "p-3", "item_name": f"{min(duration_days + 1, 7)}x Breathable Outfits & Layered Jacket", "category": "Clothing", "packed": False, "reason": "Flexible layers for changing temperatures"},
        {"id": "p-4", "item_name": "Prescription Meds & Mini First-Aid Kit", "category": "Health & Safety", "packed": False, "reason": "Health essentials & blister pads"}
    ]
    
    # Activity specific
    lower_interests = [i.lower() for i in interests]
    if any(k in lower_interests for k in ["nature", "mountains", "adventure"]):
        items.append({"id": "p-5", "item_name": "Sturdy Waterproof Hiking Shoes", "category": "Activity-specific", "packed": False, "reason": "Uneven nature trail traction"})
        items.append({"id": "p-6", "item_name": "Daypack with Hydration Bladder", "category": "Activity-specific", "packed": False, "reason": "Outdoor exploration comfort"})
        
    if "beaches" in lower_interests or "relaxation" in lower_interests:
        items.append({"id": "p-7", "item_name": "Reef-Safe Sunscreen SPF 50+ & Quick-Dry Towel", "category": "Activity-specific", "packed": False, "reason": "UV protection & eco-compliance"})
        items.append({"id": "p-8", "item_name": "Swimwear & UV Sunglasses", "category": "Clothing", "packed": False, "reason": "Sun & water comfort"})
        
    if "culture" in lower_interests or "history" in lower_interests:
        items.append({"id": "p-9", "item_name": "Modest Temple Attire (Shoulder/Knee Covers)", "category": "Clothing", "packed": False, "reason": "Respect sacred historic sites"})
        items.append({"id": "p-10", "item_name": "Compact Umbrella / Rain Shell", "category": "Essentials", "packed": False, "reason": "Sudden weather changes"})
        
    return items

def generate_itinerary_days(
    dest_data: Dict[str, Any],
    start_date_str: str,
    end_date_str: str,
    pace: str = "Balanced",
    accessibility_needs: bool = False
) -> List[Dict[str, Any]]:
    try:
        s_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        e_date = datetime.strptime(end_date_str, "%Y-%m-%d")
        duration = max(1, (e_date - s_date).days + 1)
    except Exception:
        s_date = datetime.now()
        duration = 4
        
    attractions = dest_data.get("top_attractions", [])
    if not attractions:
        attractions = [
            {
                "id": "center-walk",
                "title": f"Explore {dest_data['name']} Historic Center",
                "category": "Culture",
                "duration_hours": 2.5,
                "cost_usd": 0.0,
                "description": "Orientation walk through the main boulevards and landmarks.",
                "location_name": "City Center",
                "lat": dest_data.get("lat", 0.0),
                "lng": dest_data.get("lng", 0.0),
                "is_indoor": False,
                "accessibility_notes": "Paved sidewalks."
            }
        ]
        
    itinerary_days = []
    
    themes = [
        "Arrival, Orientation & Historic Immersion",
        "Iconic Architecture, Culture & Culinary Highlights",
        "Nature Panorama, Scenic Trails & Scenic Vistas",
        "Artisan Workshops, Local Life & Hidden Gems",
        "Coastal or Mountain Excursion & Sunset Gathering",
        "Leisure, Souvenirs & Farewell Celebration",
        "Deep Exploration & Relaxed Reflection"
    ]
    
    transports = [
        "High-Speed Metro & Walkable Districts",
        "Scenic Lake Ferry / Electric Tramway",
        "Local Train & Designated Walking Path",
        "Hop-On Eco Bus & Pedestrian Boulevards",
        "Regional Express Rail & Private Transfer",
        "Guided Shuttle & Level Promenade Walk"
    ]
    
    for day_idx in range(duration):
        cur_date = s_date + timedelta(days=day_idx)
        cur_date_str = cur_date.strftime("%Y-%m-%d")
        theme_title = themes[day_idx % len(themes)]
        transport_mode = transports[day_idx % len(transports)]
        
        # Select 2-3 activities per day depending on pace
        attr1 = attractions[(day_idx * 2) % len(attractions)]
        attr2 = attractions[(day_idx * 2 + 1) % len(attractions)]
        
        day_activities = [
            {
                "id": f"act-{day_idx+1}-1",
                "title": attr1["title"],
                "time_slot": "Morning (09:00 - 12:30)",
                "duration_hours": attr1["duration_hours"],
                "cost_usd": attr1["cost_usd"],
                "category": attr1["category"],
                "description": attr1["description"],
                "location_name": attr1["location_name"],
                "lat": attr1["lat"],
                "lng": attr1["lng"],
                "is_indoor": attr1["is_indoor"],
                "accessibility_notes": attr1.get("accessibility_notes")
            },
            {
                "id": f"act-{day_idx+1}-2",
                "title": f"Local Cuisine Experience: Flavors of {dest_data['name']}",
                "time_slot": "Afternoon (13:00 - 15:30)",
                "duration_hours": 2.0,
                "cost_usd": 22.0,
                "category": "Food",
                "description": f"Savor regional delicacies at trusted local bistros and market halls.",
                "location_name": f"{dest_data['name']} Culinary Quarter",
                "lat": attr1["lat"] + 0.005,
                "lng": attr1["lng"] + 0.005,
                "is_indoor": True,
                "accessibility_notes": "Step-free entry and wheelchair-accessible seating."
            },
            {
                "id": f"act-{day_idx+1}-3",
                "title": attr2["title"],
                "time_slot": "Late Afternoon & Evening (16:00 - 19:30)",
                "duration_hours": attr2["duration_hours"],
                "cost_usd": attr2["cost_usd"],
                "category": attr2["category"],
                "description": attr2["description"],
                "location_name": attr2["location_name"],
                "lat": attr2["lat"],
                "lng": attr2["lng"],
                "is_indoor": attr2["is_indoor"],
                "accessibility_notes": attr2.get("accessibility_notes")
            }
        ]
        
        # If relaxed pace, drop the 3rd activity on alternate days
        if pace == "Relaxed" and day_idx % 2 == 1:
            day_activities = day_activities[:2]
            
        day_cost = sum(a["cost_usd"] for a in day_activities) + 40.0 # adding daily food baseline
        
        itinerary_days.append({
            "day_number": day_idx + 1,
            "date": cur_date_str,
            "theme": theme_title,
            "activities": day_activities,
            "estimated_day_cost_usd": round(day_cost, 2),
            "recommended_transport": transport_mode,
            "weather_forecast": {
                "temp_c": dest_data["weather_summary"]["temp_c"] + ((day_idx % 3) - 1),
                "condition": dest_data["weather_summary"]["condition"],
                "rain_prob_pct": dest_data["weather_summary"]["rain_prob_pct"]
            },
            "backup_indoor_plan": f"If rain occurs, visit {dest_data['name']}'s Premier Cultural Museum and Covered Artisan Galleria instead of outdoor walks."
        })
        
    return itinerary_days

def create_complete_trip_plan(
    starting_location: str,
    destination_id: Optional[str],
    discovery_mode: bool,
    start_date: str,
    end_date: str,
    travellers_count: int,
    total_budget: float,
    currency: str,
    interests: List[str],
    travel_style: str,
    transport_preference: str,
    accessibility_needs: bool,
    pace: str
) -> Dict[str, Any]:
    """
    Creates a full end-to-end trip plan package.
    """
    if destination_id:
        dest_data = get_destination_by_id(destination_id)
    else:
        # Pick best from destination catalog matching interests & budget
        from backend.services.decision_engine import evaluate_destinations
        evals = evaluate_destinations(
            destinations=DESTINATIONS_DATA,
            user_interests=interests,
            total_budget=total_budget,
            duration_days=4,
            travellers_count=travellers_count,
            accessibility_needs=accessibility_needs
        )
        dest_data = evals[0]["destination"]
        
    # Calculate duration
    try:
        s = datetime.strptime(start_date, "%Y-%m-%d")
        e = datetime.strptime(end_date, "%Y-%m-%d")
        duration_days = max(1, (e - s).days + 1)
    except Exception:
        duration_days = 5
        
    budget_breakdown = calculate_budget_allocation(
        dest_data=dest_data,
        duration_days=duration_days,
        travellers_count=travellers_count,
        total_budget=total_budget,
        currency=currency
    )
    
    itinerary_days = generate_itinerary_days(
        dest_data=dest_data,
        start_date_str=start_date,
        end_date_str=end_date,
        pace=pace,
        accessibility_needs=accessibility_needs
    )
    
    packing_checklist = generate_packing_checklist(
        dest_data=dest_data,
        duration_days=duration_days,
        interests=interests
    )
    
    # Map Route Coordinates / Waypoints
    route_waypoints = []
    # Add destination main marker
    route_waypoints.append({
        "label": f"Base Camp: {dest_data['name']} Central Hub",
        "lat": dest_data["lat"],
        "lng": dest_data["lng"],
        "type": "hub"
    })
    for attr in dest_data.get("top_attractions", []):
        route_waypoints.append({
            "label": attr["title"],
            "lat": attr["lat"],
            "lng": attr["lng"],
            "category": attr["category"],
            "cost_usd": attr["cost_usd"],
            "type": "stop"
        })
        
    trip_id = f"trip-{int(datetime.now().timestamp())}"
    
    return {
        "trip_id": trip_id,
        "title": f"{duration_days}-Day {travel_style} Journey to {dest_data['name']}",
        "destination": dest_data,
        "starting_location": starting_location,
        "start_date": start_date,
        "end_date": end_date,
        "duration_days": duration_days,
        "travellers_count": travellers_count,
        "travel_style": travel_style,
        "interests": interests,
        "pace": pace,
        "transport_preference": transport_preference,
        "accessibility_needs": accessibility_needs,
        "budget_breakdown": budget_breakdown,
        "itinerary_days": itinerary_days,
        "route_waypoints": route_waypoints,
        "packing_checklist": packing_checklist,
        "safety_advisories": dest_data.get("safety_advisories", []),
        "created_at": datetime.now().isoformat(),
        "is_saved": False
    }

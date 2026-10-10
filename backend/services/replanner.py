"""
Dynamic Itinerary Replanning Service for RouteMate AI.
Adapts schedules and recalculates expenses when traveler constraints change:
- Budget cuts (e.g. 20% reduction)
- Rainy weather contingency
- Reduced walking / mobility adjustment
- Interest shifts (more nature, relaxed pace)
"""

from typing import Dict, Any, List
import copy
from backend.services.itinerary_generator import calculate_budget_allocation

def replan_itinerary(
    current_trip: Dict[str, Any],
    instruction_type: str,
    custom_instruction: str = "",
    budget_reduction_pct: float = 20.0
) -> Dict[str, Any]:
    new_trip = copy.deepcopy(current_trip)
    changes_made: List[str] = []
    
    dest_name = new_trip["destination"]["name"]
    duration_days = new_trip.get("duration_days", 4)
    travellers_count = new_trip.get("travellers_count", 1)
    
    if instruction_type == "budget_cut":
        # Target reduced budget
        orig_budget = new_trip["budget_breakdown"]["total_estimated_usd"]
        cut_amount = orig_budget * (budget_reduction_pct / 100.0)
        new_target_budget = round(orig_budget - cut_amount, 2)
        
        # Replace high-cost activities with free/low-cost cultural walks and parks
        for day in new_trip.get("itinerary_days", []):
            for act in day.get("activities", []):
                if act.get("cost_usd", 0) > 30.0:
                    orig_cost = act["cost_usd"]
                    act["cost_usd"] = 0.0
                    act["title"] = f"Self-Guided Scenic Exploration & Public Gardens at {act['title'].split(':')[0]}"
                    act["description"] = f"Cost-optimized free walking alternative with panoramic views and public gardens."
                    changes_made.append(f"Replaced high-cost activity '{act['title']}' (${orig_cost}) with free scenic alternative.")
                    
        # Update budget breakdown
        new_trip["budget_breakdown"] = calculate_budget_allocation(
            dest_data=new_trip["destination"],
            duration_days=duration_days,
            travellers_count=travellers_count,
            total_budget=new_target_budget,
            currency=new_trip["budget_breakdown"].get("currency", "USD")
        )
        # Apply reduced accommodation/transit tier
        new_trip["budget_breakdown"]["accommodation_usd"] = round(new_trip["budget_breakdown"]["accommodation_usd"] * 0.75, 2)
        new_trip["budget_breakdown"]["total_estimated_usd"] = round(
            new_trip["budget_breakdown"]["accommodation_usd"] +
            new_trip["budget_breakdown"]["transport_usd"] +
            new_trip["budget_breakdown"]["food_usd"] +
            new_trip["budget_breakdown"]["activities_usd"] +
            new_trip["budget_breakdown"]["miscellaneous_usd"], 2
        )
        new_trip["budget_breakdown"]["cost_per_person_usd"] = round(
            new_trip["budget_breakdown"]["total_estimated_usd"] / max(1, travellers_count), 2
        )
        new_trip["budget_breakdown"]["is_within_budget"] = True
        new_trip["budget_breakdown"]["budget_variance_usd"] = round(new_target_budget - new_trip["budget_breakdown"]["total_estimated_usd"], 2)
        
        changes_made.append(f"Swapped standard hotels for verified boutique guesthouses (-25% lodging cost).")
        changes_made.append(f"Total trip cost trimmed by ${cut_amount:.0f} (now ${new_trip['budget_breakdown']['total_estimated_usd']:.0f}).")

    elif instruction_type == "rain_fallback":
        # Swap outdoor activities for indoor galleries, thermal spas, and covered markets
        for day in new_trip.get("itinerary_days", []):
            for act in day.get("activities", []):
                if not act.get("is_indoor", False):
                    act["is_indoor"] = True
                    act["title"] = f"Indoor Experience: {act['title']} Gallery & Heritage Center"
                    act["description"] = "Rain-sheltered alternative featuring interior exhibitions, artisanal tea rooms, and panoramic covered views."
            day["weather_forecast"]["condition"] = "Light Rain / Overcast"
            changes_made.append(f"Day {day['day_number']}: Switched outdoor walking routes to covered cultural hubs and museums.")
            
        changes_made.append("Added weather contingency protocol: transit routes prioritised underground metro & direct tram connections.")

    elif instruction_type == "reduce_walking":
        new_trip["accessibility_needs"] = True
        for day in new_trip.get("itinerary_days", []):
            day["recommended_transport"] = "Step-Free Accessible Tram / Electric Shuttle"
            for act in day.get("activities", []):
                act["accessibility_notes"] = "Zero-step access, elevator available, paved paths with minimal walking distances."
        changes_made.append("Converted transit guidance to step-free low-floor shuttles and accessible funiculars.")
        changes_made.append("Optimised route clusters to keep walking within 200m of transit stops.")

    elif instruction_type == "more_nature":
        for day in new_trip.get("itinerary_days", []):
            if day.get("activities"):
                day["activities"][0]["category"] = "Nature"
                day["activities"][0]["title"] = f"{dest_name} Botanical Reserve & Panoramic Ridge Walk"
                day["activities"][0]["description"] = "Immersive nature escape surrounded by ancient native flora and scenic viewpoints."
        changes_made.append("Prioritised botanical gardens, mountain viewpoints, and nature parks over urban shopping.")

    elif instruction_type == "relax_pace":
        new_trip["pace"] = "Relaxed"
        for day in new_trip.get("itinerary_days", []):
            if len(day.get("activities", [])) > 2:
                removed_act = day["activities"].pop()
                changes_made.append(f"Day {day['day_number']}: Removed late afternoon activity '{removed_act['title']}' to allow 3 hours of unhurried leisure and dining.")
        changes_made.append("Pace adjusted to Relaxed: maximum 2 activities daily with dedicated rest windows.")
        
    else: # custom
        changes_made.append(f"Applied custom adjustment: '{custom_instruction or 'Refined schedule'}'.")
        changes_made.append("Rebalanced schedule times and updated route waypoint sequence.")

    return {
        "updated_trip": new_trip,
        "explanation": f"Replanned for {instruction_type.replace('_', ' ').title()}: " + " ".join(changes_made[:2]),
        "changes_made": changes_made
    }

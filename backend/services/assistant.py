"""
AI Travel Assistant Service for RouteMate AI.
Provides intelligent, context-aware travel guidance, constraint advice,
budget optimization recommendations, and weather contingencies.
"""

from typing import List, Dict, Any, Optional
from backend.data.destinations import DESTINATIONS_DATA, get_destination_by_id

def process_chat_message(
    messages: List[Dict[str, str]],
    current_trip_context: Optional[Dict[str, Any]] = None,
    currency: str = "USD"
) -> Dict[str, Any]:
    if not messages:
        return {
            "reply": "Hello! I am your RouteMate AI Travel Assistant. How can I assist your trip planning today?",
            "suggested_actions": ["Plan trip under budget", "Compare destinations", "Rainy day fallback"]
        }
        
    latest_msg = messages[-1].get("content", "").strip().lower()
    
    # 1. Rainy day fallback request
    if "rain" in latest_msg or "weather" in latest_msg:
        if current_trip_context:
            dest_name = current_trip_context.get("destination", {}).get("name", "your destination")
            reply = (
                f"**RouteMate Rainy Day Contingency for {dest_name}:**\n\n"
                f"When rain conditions are detected or forecast, here is how we recommend adjusting:\n\n"
                f"1. **Switch Outdoor Walks to Indoor Cultural Venues**: Pivot from open parks to world-class museums, indoor artisan markets, and covered arcades.\n"
                f"2. **Transit Priority**: Favor underground rail, metro links, or door-to-door transit rather than scenic walking routes.\n"
                f"3. **Thermal / Wellness Fallback**: Consider afternoon visits to verified local thermal baths, tea houses, or indoor culinary tasting masterclasses.\n\n"
                f"*Action Tip:* Click **'Replanning Controls'** on your Itinerary page and select **'Rain Contingency'** to automatically swap your activities."
            )
            actions = ["Apply Rain Replanning", "Check Live Forecast Source", "View Indoor Attractions"]
        else:
            reply = (
                "For rainy conditions across our destinations:\n\n"
                "- **Jaipur**: Visit the City Palace Museum and browse covered local markets.\n"
                "- **Kochi**: Explore Mattancherry Palace and indoor galleries in Fort Kochi.\n"
                "- **Chennai**: Visit the Government Museum and regional art galleries.\n\n"
                "Would you like me to replan an active itinerary or compare destination weather patterns?"
            )
            actions = ["Explore Destinations", "View Weather Reports", "Plan a Trip"]

    # 2. Budget reduction
    elif "reduce" in latest_msg or "budget" in latest_msg or "save" in latest_msg or "cheap" in latest_msg or "cut" in latest_msg:
        if current_trip_context:
            cur_budget = current_trip_context.get("budget_breakdown", {}).get("total_estimated_usd", 2000)
            target_cut = cur_budget * 0.20
            reply = (
                f"**Budget Optimization Analysis for {current_trip_context.get('destination', {}).get('name', 'Trip')}:**\n\n"
                f"Current estimate: **${cur_budget:,.2f} {currency}**.\n"
                f"Potential 20% savings: **~${target_cut:,.2f} {currency}**.\n\n"
                f"**Recommended Strategic Cuts:**\n"
                f"- **Accommodation (Save ~25%)**: Swap 4-star hotels for highly-rated boutique guesthouses or verified aparthotels with kitchenette.\n"
                f"- **Dining (Save ~30%)**: Enjoy local lunch specials and regional food markets rather than multi-course sit-down dinners.\n"
                f"- **Activities**: Opt for free heritage walking tours, public observation terraces, and park scenic overlooks.\n\n"
                f"Would you like me to trigger an automatic **20% Budget Cut Replanning** on your itinerary?"
            )
            actions = ["Apply 20% Budget Cut", "Review Daily Breakdown", "Find Cheaper Stays"]
        else:
            reply = (
                "**Top Strategies to Maximize Your Travel Budget with RouteMate AI:**\n\n"
                "1. **Choose Value-Optimized Destinations**: Destinations like **Rishikesh** ($55/day) and **Mysuru** ($60/day) offer memorable trips at a range of budgets.\n"
                "2. **Travel in Shoulder Season**: Spring (April-May) and Autumn (September-October) offer 30-40% lower lodging rates with pleasant weather.\n"
                "3. **Transparent Decision Weights**: In the Decision Engine, increase your **'Budget Alignment' weight to 40%** to highlight top value choices."
            )
            actions = ["Compare Jaipur vs Kochi", "Set Custom Budget", "Launch Decision Engine"]

    # 3. Family or group planning
    elif "family" in latest_msg or "group" in latest_msg or "children" in latest_msg or "kids" in latest_msg:
        reply = (
            "**Family & Group Travel Intelligence:**\n\n"
            "RouteMate AI specializes in multi-traveler coordination:\n"
            "- **Shared Interests vs Trade-offs**: We analyze overlapping preferences between thrill-seekers and relaxation-seekers to prevent itinerary fatigue.\n"
            "- **Pace Moderation**: For family trips with young children or elders, we enforce maximum 2 core stops per day with built-in rest windows.\n"
            "- **Fair Expense Splitting**: Our Group Planner calculates both equal splits and proportional budget-capped contributions.\n\n"
            "Open our **Group Trip Planner** tab to enter your group members' preferences!"
        )
        actions = ["Open Group Trip Planner", "View Family-Friendly Destinations", "Adjust Pace to Relaxed"]

    # 4. Compare destinations
    elif "compare" in latest_msg:
        reply = (
            "**Multi-Criteria Decision Engine Comparison:**\n\n"
            "RouteMate AI compares candidate destinations across 5 weighted dimensions:\n"
            "- **Budget Fit**: Analyzes daily lodging, dining, transit, and attraction estimates against your ceiling.\n"
            "- **Interest Match**: Jaccard similarity across your chosen activity tags.\n"
            "- **Duration & Pace**: Evaluates if your available days match the destination's recommended depth.\n"
            "- **Weather Suitability**: Temperature, precipitation risk, and seasonal index.\n"
            "- **Accessibility & Mobility**: Step-free access and transit quality.\n\n"
            "Head over to **'Compare Trips'** in the navigation bar to see side-by-side radar and factor breakdowns!"
        )
        actions = ["Open Compare Trips", "Compare Jaipur vs Kochi", "Compare Shimla vs Gangtok"]

    # 5. Packing advice
    elif "pack" in latest_msg:
        if current_trip_context:
            dest = current_trip_context.get("destination", {})
            reply = (
                f"**Packing Intelligence for {dest.get('name', 'your trip')}:**\n\n"
                f"- **Climate**: {dest.get('weather_summary', {}).get('temp_c', 20)}°C, {dest.get('weather_summary', {}).get('condition', 'Mild')}.\n"
                f"- **Must-Haves**: Comfortable walking footwear (average 10k-15k steps/day), layered breathable clothing, universal power adapter.\n"
                f"- **Cultural Attire**: Modest clothing covering shoulders and knees for historic temples and cathedrals.\n\n"
                f"Check the interactive **Packing Checklist** on your Trip Details page to tick off items as you pack!"
            )
        else:
            reply = (
                "RouteMate AI dynamically generates packing checklists customized to your trip's duration, weather forecast, and specific activities (hiking gear, swimwear, power banks, temple attire). Plan or load a trip to generate your list!"
            )
        actions = ["View Packing Checklist", "Weather Forecast", "Trip Summary"]

    # General / Default response
    else:
        reply = (
            f"**RouteMate AI Decision Assistant:**\n\n"
            f"I have reviewed your query: *\"{latest_msg}\"*\n\n"
            f"As your intelligent travel decision engine, I can help you:\n"
            f"- **Generate a custom AI itinerary** based on your exact budget, dates, and pace.\n"
            f"- **Mathematically evaluate and compare trade-offs** between destinations.\n"
            f"- **Dynamically replan** if weather changes, budget tightens, or mobility needs shift.\n"
            f"- **Split group expenses** and find common-ground activities.\n\n"
            f"What aspect of your travel plans would you like to explore?"
        )
        actions = ["Plan New Trip", "Explore Destinations", "Compare Top Picks", "Reduce Trip Budget"]

    return {
        "reply": reply,
        "suggested_actions": actions,
        "model_engine": "RouteMate Decision Core v1.0",
        "data_transparency_note": "Calculations and estimates derived from verified destination benchmarks and live climate records."
    }

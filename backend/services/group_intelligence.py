"""
Group Trip Intelligence Service for RouteMate AI.
Synthesizes multiple travelers' preferences, identifies shared consensus,
highlights trade-offs, and calculates equitable budget contributions.
"""

from typing import List, Dict, Any
from backend.data.destinations import get_destination_by_id

def analyze_group_trip(
    destination_id: str,
    duration_days: int,
    members: List[Dict[str, Any]],
    split_strategy: str = "equal"
) -> Dict[str, Any]:
    dest = get_destination_by_id(destination_id)
    daily_cost_person = dest.get("avg_daily_cost_usd", 120.0)
    
    # 1. Interest aggregation
    all_interests: Dict[str, int] = {}
    for m in members:
        for interest in m.get("interests", []):
            interest_norm = interest.strip().title()
            all_interests[interest_norm] = all_interests.get(interest_norm, 0) + 1
            
    # Consensus interests (present in >= 50% members)
    threshold = max(1, len(members) / 2)
    consensus_interests = [k for k, v in all_interests.items() if v >= threshold]
    niche_interests = [k for k, v in all_interests.items() if v < threshold]
    
    # 2. Budget limits & feasibility
    member_limits = [m.get("budget_limit_usd", 1500.0) for m in members]
    min_budget = min(member_limits) if member_limits else 1500.0
    avg_budget = sum(member_limits) / len(member_limits) if member_limits else 1500.0
    
    estimated_base_cost_person = daily_cost_person * duration_days
    total_group_cost = round(estimated_base_cost_person * len(members), 2)
    
    # Check if lowest budget member can afford base cost
    budget_conflicts = []
    for m in members:
        if m.get("budget_limit_usd", 1500.0) < estimated_base_cost_person:
            diff = estimated_base_cost_person - m["budget_limit_usd"]
            budget_conflicts.append({
                "member_name": m.get("name", "Traveler"),
                "budget_limit": m["budget_limit_usd"],
                "shortfall": round(diff, 2),
                "note": f"{m.get('name')} has a budget limit of ${m['budget_limit_usd']:.0f}, which is ${diff:.0f} below standard trip cost."
            })
            
    # 3. Expense Split Calculation
    individual_contributions = []
    if split_strategy == "equal" or not budget_conflicts:
        per_person_share = round(total_group_cost / max(1, len(members)), 2)
        for m in members:
            individual_contributions.append({
                "member_name": m.get("name", "Traveler"),
                "contribution_usd": per_person_share,
                "strategy": "Equal Division",
                "status": "Comfortable" if m.get("budget_limit_usd", per_person_share) >= per_person_share else "Over Budget"
            })
    else:
        # Sliding scale or budget-capped split
        # Travelers with higher budgets subsidize group villa / private transit
        total_limits = sum(member_limits)
        for m in members:
            ratio = m.get("budget_limit_usd", 1000.0) / max(1.0, total_limits)
            fair_share = round(total_group_cost * ratio, 2)
            individual_contributions.append({
                "member_name": m.get("name", "Traveler"),
                "contribution_usd": fair_share,
                "strategy": "Proportional to Ability",
                "status": "Balanced"
            })
            
    # 4. Shared Activity Recommendations
    suggested_activities = []
    for attr in dest.get("top_attractions", []):
        cat = attr["category"]
        if cat in consensus_interests or any(c.lower() in [i.lower() for i in consensus_interests] for c in [cat]):
            suggested_activities.append({
                "title": attr["title"],
                "category": cat,
                "cost_usd": attr["cost_usd"],
                "why_group_match": f"Matches shared group interest in {cat} ({all_interests.get(cat, 1)}/{len(members)} travelers)."
            })
            
    if not suggested_activities:
        # Fallback to top attractions
        for attr in dest.get("top_attractions", [])[:2]:
            suggested_activities.append({
                "title": attr["title"],
                "category": attr["category"],
                "cost_usd": attr["cost_usd"],
                "why_group_match": "Essential destination landmark enjoyable for all group styles."
            })
            
    # Trade-off note
    trade_offs = []
    if niche_interests:
        trade_offs.append(
            f"Diverging Interests: {', '.join(niche_interests[:3])} are enjoyed by specific members. "
            "RouteMate recommends a 'Choose Your Own Adventure' free afternoon on Day 3."
        )
    if budget_conflicts:
        trade_offs.append(
            f"Budget Disparity: {len(budget_conflicts)} traveler(s) have constrained limits. "
            "Opting for multi-room Airbnb or family suite reduces lodging costs by 22%."
        )
        
    return {
        "destination": dest,
        "group_size": len(members),
        "duration_days": duration_days,
        "consensus_interests": consensus_interests,
        "niche_interests": niche_interests,
        "total_group_cost_usd": total_group_cost,
        "budget_conflicts": budget_conflicts,
        "individual_contributions": individual_contributions,
        "suggested_shared_activities": suggested_activities,
        "trade_offs": trade_offs,
        "consensus_score": round(min(100.0, (len(consensus_interests) / max(1, len(all_interests))) * 85 + 15), 1)
    }

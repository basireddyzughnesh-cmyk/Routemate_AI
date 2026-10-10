"""
AI Travel Decision Engine - Signature Evaluation and Scoring Algorithm.
Implements Multi-Attribute Utility Theory (MAUT) for transparent, explainable destination ranking.
"""

from typing import List, Dict, Any, Optional
import math
from backend.data.destinations import DESTINATIONS_DATA

def calculate_budget_fit(avg_daily_cost: float, user_daily_budget: float) -> tuple[float, str]:
    """
    Score 0-100 based on how well the destination fits user's daily budget.
    """
    if user_daily_budget <= 0:
        return 50.0, "Budget unspecified; estimated standard tier."
    
    ratio = avg_daily_cost / user_daily_budget
    if ratio <= 0.85:
        # Well within budget (comfortable surplus)
        score = 98.0
        explanation = f"Comfortably within budget (${avg_daily_cost:.0f}/day vs your ${user_daily_budget:.0f}/day limit, leaving a generous safety buffer)."
    elif ratio <= 1.05:
        # Near exact match
        score = 90.0 - (ratio - 0.85) * 50
        explanation = f"Ideal budget match (${avg_daily_cost:.0f}/day vs ${user_daily_budget:.0f}/day limit)."
    elif ratio <= 1.30:
        # Slightly exceeds
        score = max(40.0, 80.0 - (ratio - 1.05) * 150)
        explanation = f"Moderately exceeds requested budget by ~{int((ratio - 1.0) * 100)}% (${avg_daily_cost:.0f}/day). Requires budget reallocation."
    else:
        # Significantly exceeds
        score = max(15.0, 40.0 - (ratio - 1.30) * 50)
        explanation = f"Significantly exceeds budget (${avg_daily_cost:.0f}/day vs ${user_daily_budget:.0f}/day limit). High price premium."
    
    return round(score, 1), explanation

def calculate_interest_match(dest_interests: List[str], user_interests: List[str]) -> tuple[float, str]:
    """
    Calculates Jaccard / Overlap coefficient weighted by matches.
    """
    if not user_interests:
        return 80.0, "General exploratory match across all major tourist attractions."
    
    dest_set = set([i.lower() for i in dest_interests])
    user_set = set([i.lower() for i in user_interests])
    
    matched = dest_set.intersection(user_set)
    overlap_ratio = len(matched) / len(user_set) if len(user_set) > 0 else 0.5
    
    score = min(100.0, overlap_ratio * 95.0 + (5.0 if len(matched) > 0 else 0.0))
    
    matched_names = [i.title() for i in matched]
    if matched:
        explanation = f"Direct alignment with {len(matched)} of your key interests: {', '.join(matched_names)}."
    else:
        explanation = f"Offers complementary activities ({', '.join(dest_interests[:3])}), but fewer direct matches to your selected filters."
    
    return round(score, 1), explanation

def calculate_duration_fit(recommended_days: int, user_days: int) -> tuple[float, str]:
    diff = abs(recommended_days - user_days)
    if diff == 0:
        return 98.0, f"Perfect pace: ideal {recommended_days} days matches your trip duration."
    elif diff <= 2:
        return 88.0, f"Great fit: {user_days} days allows thorough exploration (typical ideal is {recommended_days} days)."
    else:
        penalty = min(40, diff * 12)
        score = max(30.0, 85.0 - penalty)
        if user_days < recommended_days:
            explanation = f"Compressed schedule: {user_days} days will feel fast-paced compared to the recommended {recommended_days} days."
        else:
            explanation = f"Extended stay: {user_days} days allows deep slow-travel and surrounding day trips beyond the standard {recommended_days} days."
        return round(score, 1), explanation

def calculate_weather_fit(weather_data: Dict[str, Any]) -> tuple[float, str]:
    prob_rain = weather_data.get("rain_prob_pct", 20)
    temp = weather_data.get("temp_c", 20)
    condition = weather_data.get("condition", "Pleasant")
    
    # Ideal temperature range 18-26 C
    if 16 <= temp <= 27 and prob_rain <= 25:
        score = 96.0
        exp = f"Ideal weather: {temp}°C, {condition}, with only {prob_rain}% precipitation probability."
    elif prob_rain > 40:
        score = 68.0
        exp = f"Moderate rain likelihood ({prob_rain}%). RouteMate will suggest indoor backup activities."
    else:
        score = 85.0
        exp = f"Favorable conditions: {temp}°C, {condition}."
    return round(score, 1), exp

def calculate_accessibility_fit(accessibility_rating: int, requires_accessible: bool) -> tuple[float, str]:
    if not requires_accessible:
        return 90.0, "Universal mobility options available across main areas."
    
    score = float(accessibility_rating)
    if accessibility_rating >= 80:
        exp = f"Excellent accessibility rating ({accessibility_rating}/100): step-free transit, barrier-free access, and adapted public venues."
    elif accessibility_rating >= 60:
        exp = f"Moderate accessibility ({accessibility_rating}/100): major attractions are accessible, but historic streets have partial cobblestones."
    else:
        exp = f"Challenging terrain ({accessibility_rating}/100): significant stairs, steep slopes, or vintage stone pathways require advance logistics."
    return round(score, 1), exp

def evaluate_destinations(
    destinations: List[Dict[str, Any]],
    user_interests: List[str],
    total_budget: float,
    duration_days: int,
    travellers_count: int = 1,
    accessibility_needs: bool = False,
    weights: Optional[Dict[str, float]] = None
) -> List[Dict[str, Any]]:
    """
    Evaluates destinations using the weighted Multi-Attribute Utility formula.
    Match Score = Sum(Factor_Score * Weight)
    """
    if weights is None:
        weights = {
            "budget": 0.30,
            "interest": 0.30,
            "duration": 0.15,
            "weather": 0.15,
            "accessibility": 0.10
        }
    
    # Normalize weights so sum is 1.0
    total_w = sum(weights.values())
    w_budget = weights.get("budget", 0.3) / total_w
    w_interest = weights.get("interest", 0.3) / total_w
    w_duration = weights.get("duration", 0.15) / total_w
    w_weather = weights.get("weather", 0.15) / total_w
    w_access = weights.get("accessibility", 0.10) / total_w
    
    user_daily_budget = (total_budget / max(1, duration_days)) / max(1, travellers_count)
    
    results = []
    
    for dest in destinations:
        avg_daily = dest.get("avg_daily_cost_usd", 150.0)
        estimated_trip_cost = avg_daily * duration_days * travellers_count
        
        # Factor Scores
        b_score, b_exp = calculate_budget_fit(avg_daily, user_daily_budget)
        i_score, i_exp = calculate_interest_match(dest.get("interests", []), user_interests)
        d_score, d_exp = calculate_duration_fit(dest.get("recommended_days", 5), duration_days)
        w_score, w_exp = calculate_weather_fit(dest.get("weather_summary", {}))
        a_score, a_exp = calculate_accessibility_fit(dest.get("accessibility_rating", 75), accessibility_needs)
        
        # Weighted Composite
        overall_score = (
            (b_score * w_budget) +
            (i_score * w_interest) +
            (d_score * w_duration) +
            (w_score * w_weather) +
            (a_score * w_access)
        )
        overall_score = round(overall_score, 1)
        
        factor_scores = [
            {
                "factor_name": "Budget Alignment",
                "raw_score": b_score,
                "weight": round(w_budget, 2),
                "weighted_contribution": round(b_score * w_budget, 1),
                "explanation": b_exp
            },
            {
                "factor_name": "Interests & Activities",
                "raw_score": i_score,
                "weight": round(w_interest, 2),
                "weighted_contribution": round(i_score * w_interest, 1),
                "explanation": i_exp
            },
            {
                "factor_name": "Duration & Pace",
                "raw_score": d_score,
                "weight": round(w_duration, 2),
                "weighted_contribution": round(d_score * w_duration, 1),
                "explanation": d_exp
            },
            {
                "factor_name": "Seasonal Weather",
                "raw_score": w_score,
                "weight": round(w_weather, 2),
                "weighted_contribution": round(w_score * w_weather, 1),
                "explanation": w_exp
            },
            {
                "factor_name": "Accessibility & Mobility",
                "raw_score": a_score,
                "weight": round(w_access, 2),
                "weighted_contribution": round(a_score * w_access, 1),
                "explanation": a_exp
            }
        ]
        
        # Determine Pros and Cons
        pros = []
        cons = []
        
        if b_score >= 85:
            pros.append(f"Highly cost-effective (Est. ${estimated_trip_cost:.0f} vs ${total_budget:.0f} budget)")
        elif b_score < 60:
            cons.append(f"Budget stretch (Est. ${estimated_trip_cost:.0f} exceeds ${total_budget:.0f})")
            
        if i_score >= 85:
            pros.append("Outstanding fit with your selected travel interests")
        elif i_score < 60:
            cons.append("Fewer direct matches to your specific activity priorities")
            
        if dest.get("safety_score", 90) >= 92:
            pros.append(f"Exceptional safety score ({dest.get('safety_score')}/100)")
            
        if dest.get("accessibility_rating", 70) < 60 and accessibility_needs:
            cons.append("Challenging historical terrain with elevation changes or steps")
            
        if not cons:
            cons.append("High season demand may require advance attraction reservations")
            
        # Summary explanation
        why_recommended = (
            f"{dest['name']} achieved a {overall_score}/100 match score. "
            f"{i_exp} {b_exp}"
        )
        
        results.append({
            "destination": dest,
            "match_score": overall_score,
            "factor_scores": factor_scores,
            "pros": pros,
            "cons": cons,
            "why_recommended": why_recommended,
            "estimated_trip_cost_usd": round(estimated_trip_cost, 2),
            "budget_fit_pct": round(min(100.0, (total_budget / max(1, estimated_trip_cost)) * 100), 1)
        })
        
    # Sort descending by match score
    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results

def compare_destinations_detail(
    dest_ids: List[str],
    user_interests: List[str],
    total_budget: float,
    duration_days: int,
    travellers_count: int = 1,
    accessibility_needs: bool = False,
    weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Produces side-by-side comparative analysis with trade-offs between 2-3 destinations.
    """
    candidates = [d for d in DESTINATIONS_DATA if d["id"] in dest_ids]
    if not candidates:
        candidates = DESTINATIONS_DATA[:3]
        
    evaluations = evaluate_destinations(
        destinations=candidates,
        user_interests=user_interests,
        total_budget=total_budget,
        duration_days=duration_days,
        travellers_count=travellers_count,
        accessibility_needs=accessibility_needs,
        weights=weights
    )
    
    winner = evaluations[0]
    runner_up = evaluations[1] if len(evaluations) > 1 else None
    
    trade_off_summary = ""
    if runner_up:
        trade_off_summary = (
            f"Comparison Verdict: {winner['destination']['name']} edges out {runner_up['destination']['name']} "
            f"with a {winner['match_score']} vs {runner_up['match_score']} score. "
            f"Primary trade-off: {winner['destination']['name']} delivers stronger {winner['factor_scores'][1]['factor_name'].lower()} "
            f"while {runner_up['destination']['name']} offers distinct advantages in "
            f"{runner_up['factor_scores'][0]['factor_name'].lower()}."
        )
        
    return {
        "compared_destinations": evaluations,
        "recommended_winner_id": winner["destination"]["id"],
        "trade_off_summary": trade_off_summary,
        "weights_applied": weights or {"budget": 0.3, "interest": 0.3, "duration": 0.15, "weather": 0.15, "accessibility": 0.1}
    }

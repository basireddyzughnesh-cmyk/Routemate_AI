from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from backend.data.destinations import DESTINATIONS_DATA, get_destination_by_id

router = APIRouter(prefix="/api/destinations", tags=["destinations"])

@router.get("", response_model=List[Dict[str, Any]])
def get_destinations(
    q: Optional[str] = Query(None, description="Search query by name, country, or tagline"),
    region: Optional[str] = Query(None, description="Filter by geographic region"),
    max_daily_budget: Optional[float] = Query(None, description="Filter by max daily cost in USD"),
    interest: Optional[str] = Query(None, description="Filter by interest tag"),
    sort_by: Optional[str] = Query("recommended", description="'recommended', 'cost_low', 'cost_high', 'safety', 'accessibility'")
):
    results = list(DESTINATIONS_DATA)
    
    # 1. Search text query
    if q:
        query_lower = q.lower().strip()
        results = [
            d for d in results
            if query_lower in d["name"].lower()
            or query_lower in d["country"].lower()
            or query_lower in d["description"].lower()
            or query_lower in d["tagline"].lower()
            or any(query_lower in i.lower() for i in d.get("interests", []))
        ]
        
    # 2. Region filter
    if region and region.lower() != "all":
        results = [d for d in results if d.get("region", "").lower() == region.lower()]
        
    # 3. Max budget filter
    if max_daily_budget and max_daily_budget > 0:
        results = [d for d in results if d.get("avg_daily_cost_usd", 0) <= max_daily_budget]
        
    # 4. Interest filter
    if interest and interest.lower() != "all":
        results = [
            d for d in results
            if any(i.lower() == interest.lower() for i in d.get("interests", []))
        ]
        
    # 5. Sorting
    if sort_by == "cost_low":
        results.sort(key=lambda x: x.get("avg_daily_cost_usd", 0))
    elif sort_by == "cost_high":
        results.sort(key=lambda x: x.get("avg_daily_cost_usd", 0), reverse=True)
    elif sort_by == "safety":
        results.sort(key=lambda x: x.get("safety_score", 0), reverse=True)
    elif sort_by == "accessibility":
        results.sort(key=lambda x: x.get("accessibility_rating", 0), reverse=True)
        
    return results

@router.get("/{dest_id}", response_model=Dict[str, Any])
def get_destination_detail(dest_id: str):
    dest = get_destination_by_id(dest_id)
    if not dest or (dest["id"] != dest_id and dest_id != "default"):
        # Check exact match
        matches = [d for d in DESTINATIONS_DATA if d["id"] == dest_id]
        if not matches:
            raise HTTPException(status_code=404, detail=f"Destination '{dest_id}' not found.")
        return matches[0]
    return dest

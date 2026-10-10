from fastapi import APIRouter
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.data.destinations import DESTINATIONS_DATA
from backend.services.decision_engine import evaluate_destinations, compare_destinations_detail

router = APIRouter(prefix="/api/decision-engine", tags=["decision-engine"])

class EvaluateRequest(BaseModel):
    user_interests: List[str] = Field(default_factory=lambda: ["Culture", "Food"])
    total_budget: float = 2000.0
    duration_days: int = 5
    travellers_count: int = 1
    accessibility_needs: bool = False
    weights: Optional[Dict[str, float]] = None

class CompareRequest(BaseModel):
    dest_ids: List[str] = Field(default_factory=lambda: ["jaipur-rajasthan", "kochi-kerala"])
    user_interests: List[str] = Field(default_factory=lambda: ["Culture", "Nature"])
    total_budget: float = 2500.0
    duration_days: int = 5
    travellers_count: int = 1
    accessibility_needs: bool = False
    weights: Optional[Dict[str, float]] = None

@router.post("/evaluate")
def evaluate_candidates(payload: EvaluateRequest):
    results = evaluate_destinations(
        destinations=DESTINATIONS_DATA,
        user_interests=payload.user_interests,
        total_budget=payload.total_budget,
        duration_days=payload.duration_days,
        travellers_count=payload.travellers_count,
        accessibility_needs=payload.accessibility_needs,
        weights=payload.weights
    )
    return {
        "status": "success",
        "evaluations": results,
        "total_evaluated": len(results),
        "weights_used": payload.weights or {"budget": 0.3, "interest": 0.3, "duration": 0.15, "weather": 0.15, "accessibility": 0.1}
    }

@router.post("/compare")
def compare_selected(payload: CompareRequest):
    comparison = compare_destinations_detail(
        dest_ids=payload.dest_ids,
        user_interests=payload.user_interests,
        total_budget=payload.total_budget,
        duration_days=payload.duration_days,
        travellers_count=payload.travellers_count,
        accessibility_needs=payload.accessibility_needs,
        weights=payload.weights
    )
    return {
        "status": "success",
        "comparison": comparison
    }

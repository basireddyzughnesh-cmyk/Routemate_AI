from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from datetime import datetime
from backend.models.schemas import TripPlanRequest, ReplanRequest
from backend.services.itinerary_generator import create_complete_trip_plan
from backend.services.replanner import replan_itinerary
from backend.database.store import save_trip_record

router = APIRouter(prefix="/api/planner", tags=["planner"])

@router.post("/generate")
def generate_trip(payload: TripPlanRequest):
    # Validation
    if payload.total_budget <= 0:
        raise HTTPException(status_code=400, detail="Total budget must be greater than 0.")
    if payload.travellers_count < 1:
        raise HTTPException(status_code=400, detail="Traveller count must be at least 1.")
        
    try:
        s_date = datetime.strptime(payload.start_date, "%Y-%m-%d")
        e_date = datetime.strptime(payload.end_date, "%Y-%m-%d")
        if e_date < s_date:
            raise HTTPException(status_code=400, detail="End date cannot be earlier than start date.")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")
        
    plan = create_complete_trip_plan(
        starting_location=payload.starting_location,
        destination_id=payload.destination_id,
        discovery_mode=payload.discovery_mode,
        start_date=payload.start_date,
        end_date=payload.end_date,
        travellers_count=payload.travellers_count,
        total_budget=payload.total_budget,
        currency=payload.currency,
        interests=payload.interests,
        travel_style=payload.travel_style,
        transport_preference=payload.transport_preference,
        accessibility_needs=payload.accessibility_needs,
        pace=payload.pace
    )
    return {
        "status": "success",
        "trip": plan
    }

@router.post("/replan")
def replan_existing_trip(payload: ReplanRequest):
    if not payload.current_trip or "destination" not in payload.current_trip:
        raise HTTPException(status_code=400, detail="Valid current trip object is required for replanning.")
        
    result = replan_itinerary(
        current_trip=payload.current_trip,
        instruction_type=payload.instruction_type,
        custom_instruction=payload.custom_instruction or "",
        budget_reduction_pct=payload.budget_reduction_pct or 20.0
    )
    return {
        "status": "success",
        "updated_trip": result["updated_trip"],
        "explanation": result["explanation"],
        "changes_made": result["changes_made"]
    }

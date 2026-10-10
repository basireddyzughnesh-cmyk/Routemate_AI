from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from backend.models.schemas import GroupPlanRequest
from backend.services.group_intelligence import analyze_group_trip

router = APIRouter(prefix="/api/group-planner", tags=["group-planner"])

@router.post("/calculate")
def calculate_group_plan(payload: GroupPlanRequest):
    if not payload.members or len(payload.members) < 2:
        raise HTTPException(status_code=400, detail="Group trips require at least 2 members.")
        
    members_dict = [m.model_dump() for m in payload.members]
    result = analyze_group_trip(
        destination_id=payload.destination_id,
        duration_days=payload.duration_days,
        members=members_dict,
        split_strategy=payload.split_strategy
    )
    return {
        "status": "success",
        "group_analysis": result
    }

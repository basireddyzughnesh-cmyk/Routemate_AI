from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
from backend.database.store import (
    get_all_trips,
    get_trip_by_id,
    save_trip_record,
    delete_trip_record
)
from backend.security.auth import get_current_user

router = APIRouter(prefix="/api/trips", tags=["trips"])

class ExpenseItemPayload(BaseModel):
    category: str # 'transport', 'accommodation', 'food', 'activities', 'miscellaneous'
    amount: float
    description: str

class TogglePackingPayload(BaseModel):
    item_id: str
    packed: bool

@router.get("", response_model=List[Dict[str, Any]])
def list_saved_trips(current_user: Dict[str, Any] = Depends(get_current_user)):
    return get_all_trips(current_user["id"])

@router.post("", response_model=Dict[str, Any])
def save_trip(trip: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    saved = save_trip_record(trip, current_user["id"])
    return {"status": "success", "trip": saved}

@router.delete("/{trip_id}")
def delete_trip(trip_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    success = delete_trip_record(trip_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail=f"Trip '{trip_id}' not found.")
    return {"status": "success", "message": f"Trip '{trip_id}' deleted."}

@router.post("/{trip_id}/expenses")
def add_custom_expense(
    trip_id: str,
    payload: ExpenseItemPayload,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    target_trip = get_trip_by_id(trip_id, current_user["id"])
    if not target_trip:
        raise HTTPException(status_code=404, detail=f"Trip '{trip_id}' not found.")
        
    if "custom_expenses" not in target_trip:
        target_trip["custom_expenses"] = []
        
    target_trip["custom_expenses"].append({
        "category": payload.category,
        "amount": payload.amount,
        "description": payload.description
    })
    
    # Recalculate actual spent total
    total_spent = sum(e["amount"] for e in target_trip["custom_expenses"])
    target_trip["actual_spent_usd"] = round(total_spent, 2)
    save_trip_record(target_trip, current_user["id"])
    
    return {
        "status": "success",
        "custom_expenses": target_trip["custom_expenses"],
        "actual_spent_usd": target_trip["actual_spent_usd"]
    }

@router.patch("/{trip_id}/packing")
def toggle_packing_item(
    trip_id: str,
    payload: TogglePackingPayload,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    target_trip = get_trip_by_id(trip_id, current_user["id"])
    if not target_trip:
        raise HTTPException(status_code=404, detail=f"Trip '{trip_id}' not found.")
        
    for item in target_trip.get("packing_checklist", []):
        if item.get("id") == payload.item_id:
            item["packed"] = payload.packed
            save_trip_record(target_trip, current_user["id"])
            return {"status": "success", "item": item}
            
    raise HTTPException(status_code=404, detail="Packing item not found.")

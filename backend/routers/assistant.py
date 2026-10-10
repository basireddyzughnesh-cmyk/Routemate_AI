from fastapi import APIRouter
from typing import Dict, Any
from backend.models.schemas import ChatRequest
from backend.services.assistant import process_chat_message

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

@router.post("/chat")
def chat_with_assistant(payload: ChatRequest):
    messages_dict = [m.model_dump() for m in payload.messages]
    result = process_chat_message(
        messages=messages_dict,
        current_trip_context=payload.current_trip_context,
        currency=payload.currency
    )
    return {
        "status": "success",
        "response": result
    }

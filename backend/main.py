"""
RouteMate AI - Your Personal AI Travel Decision Engine
FastAPI Core Application Server
"""

import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.routers import (
    destinations,
    decision_engine,
    planner,
    group_planner,
    assistant,
    trips,
    analytics,
    auth
)

app = FastAPI(
    title="RouteMate AI API",
    description="Your Personal AI Travel Decision Engine - Multi-criteria scoring, budget calculation, route coordination, and adaptive itineraries.",
    version="1.0.0"
)

# Register API Routers
app.include_router(destinations.router)
app.include_router(decision_engine.router)
app.include_router(planner.router)
app.include_router(group_planner.router)
app.include_router(assistant.router)
app.include_router(trips.router)
app.include_router(analytics.router)
app.include_router(auth.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "RouteMate AI Core Decision Engine",
        "version": "1.0.0",
        "supported_currencies": ["USD", "EUR", "INR", "GBP", "JPY", "AUD", "CAD"],
        "engine_mode": "Multi-Attribute Utility Theory (MAUT) + LLM Assistant"
    }

# Mount static files
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "message": "RouteMate AI Server is running.",
        "api_docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

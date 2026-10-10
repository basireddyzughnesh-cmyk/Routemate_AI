from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class DestinationSummary(BaseModel):
    id: str
    name: str
    country: str
    region: str
    tagline: str
    description: str
    image_url: str
    avg_daily_cost_usd: float
    recommended_days: int
    lat: float
    lng: float
    interests: List[str]
    best_seasons: List[str]
    weather_summary: Dict[str, Any]
    accessibility_rating: int # 0 - 100
    sustainability_rating: int # 0 - 100
    safety_level: str # 'Very High', 'High', 'Moderate'

class ActivityItem(BaseModel):
    id: str
    title: str
    time_slot: str # 'Morning', 'Afternoon', 'Evening'
    duration_hours: float
    cost_usd: float
    category: str # 'Culture', 'Nature', 'Food', 'Relaxation', 'Adventure'
    description: str
    location_name: str
    lat: float
    lng: float
    is_indoor: bool = False
    accessibility_notes: Optional[str] = None

class ItineraryDay(BaseModel):
    day_number: int
    date: Optional[str] = None
    theme: str
    activities: List[ActivityItem]
    estimated_day_cost_usd: float
    recommended_transport: str
    weather_forecast: Optional[Dict[str, Any]] = None
    backup_indoor_plan: Optional[str] = None

class BudgetBreakdown(BaseModel):
    transport_usd: float
    accommodation_usd: float
    food_usd: float
    activities_usd: float
    miscellaneous_usd: float
    total_estimated_usd: float
    cost_per_person_usd: float
    currency: str = "USD"
    conversion_rate: float = 1.0 # default USD
    is_within_budget: bool
    budget_variance_usd: float # budget - total

class PackingItem(BaseModel):
    id: str
    item_name: str
    category: str # 'Essentials', 'Clothing', 'Electronics', 'Activity-specific', 'Health & Safety'
    packed: bool = False
    reason: Optional[str] = None

class TripPlanRequest(BaseModel):
    starting_location: str = "Jaipur, Rajasthan, India"
    destination_id: Optional[str] = None # None means AI picks best match
    discovery_mode: bool = False
    start_date: str # YYYY-MM-DD
    end_date: str # YYYY-MM-DD
    travellers_count: int = 1
    total_budget: float = 2500.0
    currency: str = "USD"
    interests: List[str] = Field(default_factory=lambda: ["Culture", "Food", "Sightseeing"])
    travel_style: str = "Solo" # 'Solo', 'Couple', 'Family', 'Friends'
    transport_preference: str = "Public Transit / Walking"
    accessibility_needs: bool = False
    pace: str = "Balanced" # 'Relaxed', 'Balanced', 'Action-Packed'

class PriorityWeights(BaseModel):
    budget_weight: float = 0.30
    interest_weight: float = 0.30
    duration_weight: float = 0.15
    weather_weight: float = 0.15
    accessibility_weight: float = 0.10

class DecisionFactorScore(BaseModel):
    factor_name: str
    raw_score: float # 0 - 100
    weight: float
    weighted_contribution: float
    explanation: str

class EvaluatedDestination(BaseModel):
    destination: DestinationSummary
    match_score: float # 0 - 100
    factor_scores: List[DecisionFactorScore]
    pros: List[str]
    cons: List[str]
    why_recommended: str
    estimated_trip_cost_usd: float
    budget_fit_pct: float

class ReplanRequest(BaseModel):
    current_trip: Dict[str, Any]
    instruction_type: str # 'budget_cut', 'rain_fallback', 'reduce_walking', 'more_nature', 'relax_pace', 'custom'
    custom_instruction: Optional[str] = None
    budget_reduction_pct: Optional[float] = 20.0

class GroupMemberPreference(BaseModel):
    name: str
    interests: List[str]
    budget_limit_usd: float
    travel_style: str
    must_have: Optional[str] = None

class GroupPlanRequest(BaseModel):
    destination_id: str
    duration_days: int
    members: List[GroupMemberPreference]
    split_strategy: str = "equal" # 'equal', 'custom_by_budget'

class ChatMessage(BaseModel):
    role: str # 'user' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    current_trip_context: Optional[Dict[str, Any]] = None
    currency: str = "USD"

export interface WeatherSummary {
  temp_c: number;
  condition: string;
  humidity_pct: number;
  rain_prob_pct: number;
  season_rating: string;
  source: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  title: string;
  time_slot: string;
  duration_hours: number;
  cost_usd: number;
  category: string;
  description: string;
  location_name: string;
  lat: number;
  lng: number;
  is_indoor: boolean;
  accessibility_notes?: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  region: string;
  tagline: string;
  description: string;
  image_url: string;
  avg_daily_cost_usd: number;
  recommended_days: number;
  lat: number;
  lng: number;
  interests: string[];
  weather_summary: WeatherSummary;
  accessibility_rating: number;
  accessibility_details?: string;
  sustainability_rating: number;
  safety_level: string;
  safety_score: number;
  top_attractions: Activity[];
}

export interface ItineraryDay {
  day_number: number;
  date: string;
  theme: string;
  activities: Activity[];
  estimated_day_cost_usd: number;
  recommended_transport: string;
  weather_forecast?: {
    temp_c: number;
    condition: string;
    rain_prob_pct: number;
  };
  backup_indoor_plan?: string;
}

export interface BudgetBreakdown {
  transport_usd: number;
  accommodation_usd: number;
  food_usd: number;
  activities_usd: number;
  miscellaneous_usd: number;
  total_estimated_usd: number;
  cost_per_person_usd: number;
  currency: string;
  conversion_rate: number;
  is_within_budget: boolean;
  budget_variance_usd: number;
}

export interface PackingItem {
  id: string;
  item_name: string;
  category: string;
  packed: boolean;
  reason?: string;
}

export interface RouteWaypoint {
  label: string;
  lat: number;
  lng: number;
  category?: string;
  cost_usd?: number;
  type: string;
}

export interface Trip {
  trip_id: string;
  title: string;
  destination: Destination;
  starting_location: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  travellers_count: number;
  travel_style: string;
  interests: string[];
  pace: string;
  transport_preference: string;
  accessibility_needs: boolean;
  budget_breakdown: BudgetBreakdown;
  itinerary_days: ItineraryDay[];
  route_waypoints: RouteWaypoint[];
  packing_checklist: PackingItem[];
  safety_advisories?: string[];
  actual_spent_usd?: number;
  custom_expenses?: Array<{
    category: string;
    amount: number;
    description: string;
  }>;
  is_saved?: boolean;
}

export interface DecisionFactorScore {
  factor_name: string;
  raw_score: number;
  weight: number;
  weighted_contribution: number;
  explanation: string;
}

export interface EvaluatedDestination {
  destination: Destination;
  match_score: number;
  factor_scores: DecisionFactorScore[];
  pros: string[];
  cons: string[];
  why_recommended: string;
  estimated_trip_cost_usd: number;
  budget_fit_pct: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  membership: string;
  home_city: string;
  bio: string;
  travel_style: string;
  pace: string;
  currency: string;
  units: string;
  accessibility_mode: boolean;
  interests: string[];
  trips_completed: number;
  countries_visited: number;
  saved_budget_usd: number;
}

export interface GroupMember {
  name: string;
  interests: string[];
  budget_limit_usd: number;
  travel_style: string;
}

export interface GroupAnalysis {
  destination: Destination;
  group_size: number;
  duration_days: number;
  consensus_interests: string[];
  niche_interests: string[];
  total_group_cost_usd: number;
  individual_contributions: Array<{
    member_name: string;
    contribution_usd: number;
    strategy: string;
    status: string;
  }>;
  trade_offs: string[];
  consensus_score: number;
}

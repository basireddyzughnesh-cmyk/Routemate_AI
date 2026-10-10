import { Destination, Trip, EvaluatedDestination, UserProfile, GroupAnalysis } from '../types';

const API_BASE = '/api';
let authToken: string | null = localStorage.getItem('routemate_token');

function authenticatedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
  return fetch(input, { ...init, headers });
}

export const api = {
  setAuthToken(token: string | null): void {
    authToken = token;
    if (token) localStorage.setItem('routemate_token', token);
    else localStorage.removeItem('routemate_token');
  },

  async getDestinations(): Promise<Destination[]> {
    const res = await fetch(`${API_BASE}/destinations`);
    return res.json();
  },

  async evaluateDestinations(params: {
    user_interests: string[];
    total_budget: number;
    duration_days: number;
    travellers_count: number;
    weights?: Record<string, number>;
  }): Promise<EvaluatedDestination[]> {
    const res = await fetch(`${API_BASE}/decision-engine/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    return data.evaluations || [];
  },

  async compareDestinations(params: {
    dest_ids: string[];
    user_interests: string[];
    total_budget: number;
    duration_days: number;
    weights?: Record<string, number>;
  }): Promise<{
    compared_destinations: EvaluatedDestination[];
    recommended_winner_id: string;
    trade_off_summary: string;
  }> {
    const res = await fetch(`${API_BASE}/decision-engine/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    return data.comparison;
  },

  async generateTrip(payload: any): Promise<Trip> {
    const res = await fetch(`${API_BASE}/planner/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to generate itinerary');
    }
    const data = await res.json();
    return data.trip;
  },

  async replanTrip(payload: {
    current_trip: Trip;
    instruction_type: string;
    budget_reduction_pct?: number;
  }): Promise<{ updated_trip: Trip; explanation: string; changes_made: string[] }> {
    const res = await fetch(`${API_BASE}/planner/replan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data;
  },

  async getSavedTrips(): Promise<Trip[]> {
    const res = await authenticatedFetch(`${API_BASE}/trips`);
    if (!res.ok) throw new Error('Sign in to view saved trips.');
    return res.json();
  },

  async saveTrip(trip: Trip): Promise<Trip> {
    const res = await authenticatedFetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trip)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to save trip.');
    return data.trip;
  },

  async deleteTrip(tripId: string): Promise<void> {
    const res = await authenticatedFetch(`${API_BASE}/trips/${tripId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete saved trip.');
  },

  async addExpense(tripId: string, expense: { category: string; amount: number; description: string }): Promise<void> {
    const res = await authenticatedFetch(`${API_BASE}/trips/${tripId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    if (!res.ok) throw new Error('Failed to save the expense.');
  },

  async calculateGroupPlan(payload: any): Promise<GroupAnalysis> {
    const res = await fetch(`${API_BASE}/group-planner/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.group_analysis;
  },

  async sendChatMessage(payload: {
    messages: Array<{ role: string; content: string }>;
    current_trip_context?: any;
    currency?: string;
  }): Promise<{ reply: string; suggested_actions: string[] }> {
    const res = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.response;
  },

  async getAnalytics(): Promise<any> {
    const res = await authenticatedFetch(`${API_BASE}/analytics`);
    if (!res.ok) throw new Error('Sign in to view your travel analytics.');
    return res.json();
  },

  async getProfile(): Promise<UserProfile> {
    const res = await authenticatedFetch(`${API_BASE}/auth/profile`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to load profile.');
    return data.user;
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const res = await authenticatedFetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update profile');
    }
    return data.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ user: UserProfile; token: string }> {
    const res = await authenticatedFetch(`${API_BASE}/auth/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to update password.');
    this.setAuthToken(data.token);
    return data;
  },

  async loginDemo(): Promise<{ user: UserProfile; token: string }> {
    const res = await fetch(`${API_BASE}/auth/demo`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Demo login failed.');
    this.setAuthToken(data.token);
    return data;
  },

  async login(credentials: { email: string; password: string }): Promise<{ user: UserProfile; token: string; password_change_required?: boolean }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    this.setAuthToken(data.token);
    return data;
  },

  async register(info: { name: string; email: string; password: string; home_city?: string }): Promise<{ user: UserProfile; token: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    this.setAuthToken(data.token);
    return data;
  }
};

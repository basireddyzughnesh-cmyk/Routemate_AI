import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { api } from './services/api';
import { Destination, Trip, EvaluatedDestination, UserProfile, GroupAnalysis } from './types';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>(['jaipur-rajasthan', 'kochi-kerala', 'goa-india']);
  const [compareEvaluations, setCompareEvaluations] = useState<EvaluatedDestination[]>([]);
  const [compareVerdict, setCompareVerdict] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedDestModal, setSelectedDestModal] = useState<Destination | null>(null);
  const [floatChatOpen, setFloatChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'assistant', content: 'Hi there! I am your RouteMate AI Travel Assistant. How can I assist your trip planning today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [replanningFeedback, setReplanningFeedback] = useState('');
  const [isReplanning, setIsReplanning] = useState(false);

  // Planner Form State
  const [planStartLoc, setPlanStartLoc] = useState('Jaipur, Rajasthan, India');
  const [planDestId, setPlanDestId] = useState('');
  const [planStartDate, setPlanStartDate] = useState('');
  const [planEndDate, setPlanEndDate] = useState('');
  const [planTravellers, setPlanTravellers] = useState(2);
  const [planBudget, setPlanBudget] = useState(2500);
  const [planStyle, setPlanStyle] = useState('Couple');
  const [planPace, setPlanPace] = useState('Balanced');
  const [planAccessibility, setPlanAccessibility] = useState(false);
  const [planInterests, setPlanInterests] = useState<string[]>(['Culture', 'Food', 'Nature']);
  const [isPlanningLoading, setIsPlanningLoading] = useState(false);

  // Group Planner State
  const [groupMembers, setGroupMembers] = useState([
    { name: 'Alex', interests: ['Culture', 'Food'], budget_limit_usd: 1500, travel_style: 'Balanced' },
    { name: 'Taylor', interests: ['Nature', 'Relaxation'], budget_limit_usd: 1200, travel_style: 'Relaxed' },
    { name: 'Jordan', interests: ['Adventure', 'Food'], budget_limit_usd: 900, travel_style: 'Active' }
  ]);
  const [groupDestId, setGroupDestId] = useState('goa-india');
  const [groupDays, setGroupDays] = useState(6);
  const [groupAnalysis, setGroupAnalysis] = useState<GroupAnalysis | null>(null);

  // Compare Weights
  const [weights, setWeights] = useState({ budget: 0.3, interest: 0.3, duration: 0.2, weather: 0.2 });

  // Map Ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Currency Converter Helper
  const CURRENCY_RATES: Record<string, { symbol: string; rate: number }> = {
    USD: { symbol: '$', rate: 1.0 },
    EUR: { symbol: '€', rate: 0.93 },
    INR: { symbol: '₹', rate: 83.2 },
    GBP: { symbol: '£', rate: 0.79 },
    JPY: { symbol: '¥', rate: 154.5 }
  };

  const formatMoney = (usd: number) => {
    const cur = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
    return `${cur.symbol}${Math.round(usd * cur.rate).toLocaleString()}`;
  };

  // Initial Load
  useEffect(() => {
    const today = new Date();
    const s = new Date(today);
    s.setDate(today.getDate() + 14);
    const e = new Date(s);
    e.setDate(s.getDate() + 5);
    setPlanStartDate(s.toISOString().split('T')[0]);
    setPlanEndDate(e.toISOString().split('T')[0]);

    // Load initial data
    api.getDestinations().then(setDestinations).catch(console.error);
    if (localStorage.getItem('routemate_token')) {
      Promise.all([api.getSavedTrips(), api.getProfile()])
        .then(([trips, user]) => {
          setSavedTrips(trips);
          setCurrentUser(user);
        })
        .catch(error => {
          api.setAuthToken(null);
          localStorage.removeItem('routemate_user');
          setCurrentUser(null);
          console.error('Session could not be restored:', error);
        });
    } else {
      localStorage.removeItem('routemate_user');
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfileEmail(currentUser.email);
      setProfileCity(currentUser.home_city);
    }
  }, [currentUser]);

  // Recalculate Compare on selection or weights change
  useEffect(() => {
    if (selectedCompareIds.length > 0) {
      api.compareDestinations({
        dest_ids: selectedCompareIds.slice(0, 3),
        user_interests: planInterests,
        total_budget: planBudget,
        duration_days: 5,
        weights
      }).then(res => {
        setCompareEvaluations(res.compared_destinations || []);
        setCompareVerdict(res.trade_off_summary);
      }).catch(console.error);
    }
  }, [selectedCompareIds, weights]);

  // Leaflet Map Effect for Trip Results
  useEffect(() => {
    if (currentPage === 'trip-result' && activeTrip && mapContainerRef.current) {
      const L = (window as any).L;
      if (!L) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const waypoints = activeTrip.route_waypoints || [];
      if (waypoints.length > 0) {
        const first = waypoints[0];
        const map = L.map(mapContainerRef.current).setView([first.lat, first.lng], 12);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        const group = L.featureGroup();
        const latlngs: any[] = [];

        waypoints.forEach(wp => {
          const ll = [wp.lat, wp.lng];
          latlngs.push(ll);
          L.circleMarker(ll, {
            radius: wp.type === 'hub' ? 10 : 7,
            fillColor: wp.type === 'hub' ? '#102A43' : '#0D9488',
            color: '#FFFFFF',
            weight: 2,
            fillOpacity: 0.95
          }).bindPopup(`<strong>${wp.label}</strong><br>${wp.category || 'Base Hub'}`).addTo(group);
        });

        group.addTo(map);
        if (latlngs.length > 1) {
          L.polyline(latlngs, { color: '#0D9488', weight: 4, dashArray: '6, 8', opacity: 0.85 }).addTo(map);
        }
        map.fitBounds(group.getBounds().pad(0.15));
      }
    }
  }, [currentPage, activeTrip]);

  // Handle Trip Generation
  const handleGenerateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPlanningLoading(true);
    setReplanningFeedback('');
    try {
      const trip = await api.generateTrip({
        starting_location: planStartLoc,
        destination_id: planDestId || null,
        discovery_mode: !planDestId,
        start_date: planStartDate,
        end_date: planEndDate,
        travellers_count: planTravellers,
        total_budget: planBudget,
        currency,
        interests: planInterests,
        travel_style: planStyle,
        transport_preference: 'Public Transit / Walking',
        accessibility_needs: planAccessibility,
        pace: planPace
      });
      setActiveTrip(trip);
      setCurrentPage('trip-result');
    } catch (err: any) {
      alert(`Planning error: ${err.message}`);
    } finally {
      setIsPlanningLoading(false);
    }
  };

  // Handle Replanning
  const handleReplan = async (type: string) => {
    if (!activeTrip || isReplanning) return;
    setIsReplanning(true);
    setReplanningFeedback(`Adapting itinerary for ${type.replace('_', ' ')}...`);
    try {
      const res = await api.replanTrip({
        current_trip: activeTrip,
        instruction_type: type,
        budget_reduction_pct: 20
      });
      setActiveTrip(res.updated_trip);
      setReplanningFeedback(`Replanning Applied: ${res.explanation}`);
    } catch (err: any) {
      setReplanningFeedback(err instanceof Error ? err.message : 'Failed to replan itinerary.');
    } finally {
      setIsReplanning(false);
    }
  };

  // Handle Save Trip
  const handleSaveTrip = async () => {
    if (!activeTrip) return;
    try {
      await api.saveTrip(activeTrip);
      const updated = await api.getSavedTrips();
      setSavedTrips(updated);
      alert('Trip saved to "My Trips" successfully!');
    } catch (err) {
      alert('Failed to save trip.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setProfileSaving(true);
    setProfileError('');
    setProfileSaved(false);
    try {
      const updatedUser = await api.updateProfile({
        name: profileName.trim(),
        email: profileEmail.trim(),
        home_city: profileCity.trim()
      });
      setCurrentUser(updatedUser);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update your profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = () => {
    api.setAuthToken(null);
    localStorage.removeItem('routemate_user');
    setCurrentUser(null);
    setSavedTrips([]);
    setCurrentPage('home');
  };

  // Send Assistant Message
  const handleSendChat = async (text: string) => {
    if (!text.trim()) return;
    const newMsg = { role: 'user', content: text };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    try {
      const res = await api.sendChatMessage({
        messages: [...chatMessages, newMsg],
        current_trip_context: activeTrip,
        currency
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Connection issue. Please try again.' }]);
    }
  };

  // Group Plan Calculation
  const handleGroupAnalyze = async () => {
    try {
      const res = await api.calculateGroupPlan({
        destination_id: groupDestId,
        duration_days: groupDays,
        members: groupMembers,
        split_strategy: 'equal'
      });
      setGroupAnalysis(res);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        currency={currency}
        onCurrencyChange={setCurrency}
        currentUser={currentUser}
        onOpenAuth={(mode) => { setAuthMode(mode); setAuthModalOpen(true); }}
        onLogout={handleLogout}
      />

      <main style={{ flexGrow: 1 }}>
        {/* ==================== HOME PAGE ==================== */}
        {currentPage === 'home' && (
          <div>
            <section style={{ position: 'relative', background: 'linear-gradient(180deg, var(--primary-navy) 0%, var(--secondary-navy) 100%)', color: '#fff', padding: '5rem 0 6.5rem', textAlign: 'center' }}>
              <div className="container" style={{ maxWidth: '840px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', color: 'var(--accent-teal)', marginBottom: '1.5rem' }}>
                  Multi-Attribute Utility Decision Engine v1.0
                </div>
                <h1 style={{ fontSize: '3.25rem', lineHeight: 1.15, marginBottom: '1.25rem', letterSpacing: '-0.03em' }}>
                  Your Journey. Your Choices. <br/><span className="text-gradient">One Intelligent Companion.</span>
                </h1>
                <p style={{ color: '#CBD5E1', fontSize: '1.15rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
                  Discover destinations, compare travel trade-offs, optimise budgets mathematically, and create personalised itineraries with transparent AI reasoning.
                </p>

                {/* Quick Search Card */}
                <div style={{ background: '#FFFFFF', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-xl)', color: '#0F172A', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '1rem', alignItems: 'end', textAlign: 'left' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Starting Location</label>
                    <input type="text" value={planStartLoc} onChange={e => setPlanStartLoc(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Destination</label>
                    <select value={planDestId} onChange={e => setPlanDestId(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <option value="">Auto Discovery (Best Match)</option>
                      {destinations.map(d => <option key={d.id} value={d.id}>{d.name}, {d.country}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Start Date</label>
                    <input type="date" value={planStartDate} onChange={e => setPlanStartDate(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Budget ({currency})</label>
                    <input type="number" value={planBudget} onChange={e => setPlanBudget(Number(e.target.value))} style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }} />
                  </div>
                  <button className="btn btn-primary" style={{ height: '42px' }} onClick={() => setCurrentPage('planner')}>
                    Explore & Plan
                  </button>
                </div>
              </div>
            </section>

            {/* Decision Engine Showcase */}
            <section style={{ padding: '4.5rem 0', backgroundColor: 'var(--bg-main)' }}>
              <div className="container">
                <div style={{ background: 'linear-gradient(135deg, var(--primary-navy), var(--secondary-navy))', borderRadius: 'var(--radius-lg)', padding: '2.5rem', color: '#fff', marginBottom: '4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <span className="badge badge-teal">Signature AI Engine</span>
                      <h2 style={{ fontSize: '1.75rem', color: '#fff', marginTop: '0.35rem' }}>Not Just Where to Go. Discover Where You Should Go.</h2>
                      <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Multi-factor Multi-Attribute Utility Theory (MAUT) decision evaluation.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setCurrentPage('compare')}>Open Decision Matrix</button>
                  </div>

                  <div className="grid-3">
                    {compareEvaluations.slice(0, 3).map((item, idx) => (
                      <div key={item.destination.id} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                          <div>
                            {idx === 0 ? (
                              <span className="badge badge-champagne" style={{ fontSize: '0.7rem' }}>★ Top AI Match</span>
                            ) : (
                              <span className="badge badge-teal" style={{ fontSize: '0.7rem' }}>Rank #{idx + 1}</span>
                            )}
                            <h4 style={{ fontSize: '1.25rem', color: '#fff', marginTop: '0.35rem' }}>{item.destination.name}</h4>
                            <span style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>{item.destination.country}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: idx === 0 ? 'var(--color-highlight)' : 'var(--color-accent)' }}>{item.match_score}</div>
                            <span style={{ fontSize: '0.7rem', color: '#CBD5E1', textTransform: 'uppercase' }}>Match Score</span>
                          </div>
                        </div>

                        <p style={{ fontSize: '0.825rem', color: '#CBD5E1', marginBottom: '1rem', lineHeight: 1.4 }}>{item.why_recommended}</p>

                        <div style={{ marginTop: 'auto' }}>
                          {item.factor_scores.slice(0, 3).map(f => (
                            <div key={f.factor_name} className="score-bar-wrap">
                              <div className="score-bar-header">
                                <span style={{ color: '#CBD5E1' }}>{f.factor_name}</span>
                                <span style={{ color: 'var(--accent-teal)' }}>{Math.round(f.raw_score)}/100</span>
                              </div>
                              <div className="score-track">
                                <div className="score-fill" style={{ width: `${f.raw_score}%` }}></div>
                              </div>
                            </div>
                          ))}
                          <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>Est. 5-Day: <strong>{formatMoney(item.estimated_trip_cost_usd)}</strong></span>
                            <button className="btn btn-sm btn-primary" onClick={() => { setPlanDestId(item.destination.id); setCurrentPage('planner'); }}>Select</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Featured Destinations */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '2rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--teal-dark)' }}>Curated Destinations</span>
                    <h2 style={{ fontSize: '1.85rem' }}>Global Exploration Highlights</h2>
                  </div>
                  <button className="btn btn-outline" onClick={() => setCurrentPage('explore')}>View All Destinations →</button>
                </div>

                <div className="grid-3">
                  {destinations.slice(0, 3).map(d => (
                    <div key={d.id} style={{ background: '#FFFFFF', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ height: '200px', position: 'relative' }}>
                        <img src={d.image_url} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', bottom: '0.85rem', left: '1rem', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600 }}>{d.region}</span>
                        <span className="badge badge-teal" style={{ position: 'absolute', top: '1rem', right: '1rem' }}>{d.safety_score}% Safety</span>
                      </div>
                      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{d.name}, {d.country}</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{d.tagline}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                          <span>Avg: <strong>{formatMoney(d.avg_daily_cost_usd)}/day</strong></span>
                          <span>Duration: <strong>{d.recommended_days} Days</strong></span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => setSelectedDestModal(d)}>View Details</button>
                          <button className="btn btn-sm btn-primary" onClick={() => { setPlanDestId(d.id); setCurrentPage('planner'); }}>Plan Trip</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ==================== EXPLORE PAGE ==================== */}
        {currentPage === 'explore' && (
          <div className="container" style={{ padding: '2.5rem 0' }}>
            <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Explore Global Destinations</h1>
            <p className="text-secondary" style={{ marginBottom: '2rem' }}>Search and compare diverse travel choices with documented benchmark costs.</p>

            <div className="grid-3">
              {destinations.map(d => (
                <div key={d.id} style={{ background: '#FFFFFF', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
                  <img src={d.image_url} alt={d.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <h3 style={{ fontSize: '1.25rem' }}>{d.name}, {d.country}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{d.tagline}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '1rem', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', padding: '0.5rem 0' }}>
                      <span>Daily: <strong>{formatMoney(d.avg_daily_cost_usd)}</strong></span>
                      <span>Weather: <strong>{d.weather_summary.temp_c}°C</strong></span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => setSelectedDestModal(d)}>Details</button>
                      <button className="btn btn-sm btn-primary" onClick={() => { setPlanDestId(d.id); setCurrentPage('planner'); }}>Plan Itinerary</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== AI TRIP PLANNER PAGE ==================== */}
        {currentPage === 'planner' && (
          <div className="container" style={{ padding: '2.5rem 0', maxWidth: '880px' }}>
            <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>AI Trip Planner</h1>
            <p className="text-secondary" style={{ marginBottom: '2rem' }}>Specify your constraints and our decision engine will assemble a custom itinerary.</p>

            <form onSubmit={handleGenerateTrip} style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Departure Base</label>
                  <input type="text" value={planStartLoc} onChange={e => setPlanStartLoc(e.target.value)} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Destination</label>
                  <select value={planDestId} onChange={e => setPlanDestId(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <option value="">AI Discovery Mode (Best Match)</option>
                    {destinations.map(d => <option key={d.id} value={d.id}>{d.name}, {d.country}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Start Date</label>
                  <input type="date" value={planStartDate} onChange={e => setPlanStartDate(e.target.value)} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>End Date</label>
                  <input type="date" value={planEndDate} onChange={e => setPlanEndDate(e.target.value)} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Travellers</label>
                  <input type="number" min="1" max="20" value={planTravellers} onChange={e => setPlanTravellers(Number(e.target.value))} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Total Budget ({currency})</label>
                  <input type="number" value={planBudget} onChange={e => setPlanBudget(Number(e.target.value))} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Travel Style</label>
                  <select value={planStyle} onChange={e => setPlanStyle(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <option value="Solo">Solo Traveler</option>
                    <option value="Couple">Couple / Romantic</option>
                    <option value="Family">Family with Kids</option>
                    <option value="Friends">Friends Getaway</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Pace</label>
                  <select value={planPace} onChange={e => setPlanPace(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <option value="Relaxed">Relaxed (Max 2 stops/day)</option>
                    <option value="Balanced">Balanced (Standard 3 stops/day)</option>
                    <option value="Action-Packed">Action-Packed (High density)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, marginTop: '1.25rem' }}>
                    <input type="checkbox" checked={planAccessibility} onChange={e => setPlanAccessibility(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-teal)' }} />
                    <span>Prioritise Step-Free Accessibility</span>
                  </label>
                </div>
              </div>

              <button type="submit" className="btn btn-lg btn-primary" style={{ width: '100%' }} disabled={isPlanningLoading}>
                {isPlanningLoading ? 'Optimising Routes & Budget...' : 'Generate My AI Trip'}
              </button>
            </form>
          </div>
        )}

        {/* ==================== TRIP RESULTS PAGE ==================== */}
        {currentPage === 'trip-result' && activeTrip && (
          <div className="container" style={{ padding: '2.5rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <button className="btn btn-sm btn-outline" onClick={() => setCurrentPage('planner')}>← Back to Planner</button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-sm btn-navy" onClick={handleSaveTrip}>💾 Save to My Trips</button>
                <button className="btn btn-sm btn-primary" onClick={() => window.print()}>🖨️ Export / Print</button>
              </div>
            </div>

            {/* Trip Header */}
            <div style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-teal">{activeTrip.duration_days} Days • {activeTrip.travel_style}</span>
                <h1 style={{ fontSize: '2rem', margin: '0.5rem 0 0.25rem' }}>{activeTrip.title}</h1>
                <p className="text-secondary">{activeTrip.starting_location} → {activeTrip.destination.name} • {activeTrip.start_date} to {activeTrip.end_date}</p>
              </div>
              <div style={{ background: 'var(--bg-alt)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Estimated Trip Total</span>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary-navy)' }}>{formatMoney(activeTrip.budget_breakdown.total_estimated_usd)}</div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatMoney(activeTrip.budget_breakdown.cost_per_person_usd)} / person</span>
              </div>
            </div>

            {/* Replanning Controls */}
            <div className="replanning-action-bar" style={{ background: 'linear-gradient(135deg, var(--primary-navy), var(--secondary-navy))', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', marginBottom: '2.5rem' }}>
              <div className="replanning-header">
                <div className="replanning-title">
                  <span className="badge badge-teal">Dynamic Replanner</span>
                  <h3 style={{ color: '#fff', fontSize: '1.15rem' }}>Need to Adapt Your Plan?</h3>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Adapt your itinerary with automatic cost & timing recalculation</span>
              </div>
              <div className="replanning-controls">
                <button className="btn btn-sm btn-secondary replanning-control" disabled={isReplanning} onClick={() => handleReplan('budget_cut')}>📉 Reduce Budget by 20%</button>
                <button className="btn btn-sm btn-secondary replanning-control" disabled={isReplanning} onClick={() => handleReplan('rain_fallback')}>🌧️ Rain Weather Contingency</button>
                <button className="btn btn-sm btn-secondary replanning-control" disabled={isReplanning} onClick={() => handleReplan('reduce_walking')}>🚶 Low Walking / Step-Free</button>
                <button className="btn btn-sm btn-secondary replanning-control" disabled={isReplanning} onClick={() => handleReplan('more_nature')}>🌲 More Nature & Scenery</button>
                <button className="btn btn-sm btn-secondary replanning-control" disabled={isReplanning} onClick={() => handleReplan('relax_pace')}>☕ Relax Pace</button>
              </div>
              {replanningFeedback && (
                <div className={`replanning-feedback${replanningFeedback.startsWith('Failed') ? ' is-error' : ''}`} role="status" aria-live="polite">
                  {replanningFeedback}
                </div>
              )}
            </div>

            {/* Main Itinerary & Map Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Day-by-Day Schedule</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {activeTrip.itinerary_days.map(day => (
                    <div key={day.day_number} style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                          <span className="badge badge-navy">Day {day.day_number} • {day.date}</span>
                          <h3 style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>{day.theme}</h3>
                        </div>
                        <span className="badge badge-teal">{formatMoney(day.estimated_day_cost_usd)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {day.activities.map(act => (
                          <div key={act.id} style={{ background: 'var(--bg-alt)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-teal)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong>{act.title}</strong>
                              <span>{formatMoney(act.cost_usd)}</span>
                            </div>
                            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>{act.description}</p>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {act.location_name} • ⏱️ {act.time_slot}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Budget Breakdown</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>✈️ Transit:</span> <strong>{formatMoney(activeTrip.budget_breakdown.transport_usd)}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🏨 Lodging:</span> <strong>{formatMoney(activeTrip.budget_breakdown.accommodation_usd)}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🍽️ Meals:</span> <strong>{formatMoney(activeTrip.budget_breakdown.food_usd)}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🎟️ Activities:</span> <strong>{formatMoney(activeTrip.budget_breakdown.activities_usd)}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', fontWeight: 700 }}>
                      <span>Total:</span> <span>{formatMoney(activeTrip.budget_breakdown.total_estimated_usd)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Interactive Route Map</h3>
                  <div ref={mapContainerRef} style={{ height: '360px', width: '100%', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== COMPARE PAGE ==================== */}
        {currentPage === 'compare' && (
          <div className="container" style={{ padding: '2.5rem 0' }}>
            <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Compare Trips & Trade-offs</h1>
            <p className="text-secondary" style={{ marginBottom: '2rem' }}>Multi-Attribute Utility Theory (MAUT) destination ranking with adjustable factor weights.</p>

            <div style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Decision Factor Weights (Sum = 100%)</h3>
              <div className="grid-4">
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Budget: {Math.round(weights.budget * 100)}%</label>
                  <input type="range" min="10" max="60" value={weights.budget * 100} onChange={e => setWeights(prev => ({ ...prev, budget: Number(e.target.value) / 100 }))} style={{ width: '100%', accentColor: 'var(--accent-teal)' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Interests: {Math.round(weights.interest * 100)}%</label>
                  <input type="range" min="10" max="60" value={weights.interest * 100} onChange={e => setWeights(prev => ({ ...prev, interest: Number(e.target.value) / 100 }))} style={{ width: '100%', accentColor: 'var(--accent-teal)' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Pace: {Math.round(weights.duration * 100)}%</label>
                  <input type="range" min="5" max="40" value={weights.duration * 100} onChange={e => setWeights(prev => ({ ...prev, duration: Number(e.target.value) / 100 }))} style={{ width: '100%', accentColor: 'var(--accent-teal)' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Weather: {Math.round(weights.weather * 100)}%</label>
                  <input type="range" min="5" max="40" value={weights.weather * 100} onChange={e => setWeights(prev => ({ ...prev, weather: Number(e.target.value) / 100 }))} style={{ width: '100%', accentColor: 'var(--accent-teal)' }} />
                </div>
              </div>
            </div>

            <div className="grid-3" style={{ marginBottom: '2rem' }}>
              {compareEvaluations.map((item, idx) => (
                <div key={item.destination.id} style={{ background: '#FFFFFF', border: `2px solid ${idx === 0 ? 'var(--color-accent)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                  {idx === 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span className="badge badge-champagne">★ Premium Top Match</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.35rem', color: 'var(--color-primary)' }}>{item.destination.name}</h3>
                      <span className="text-secondary">{item.destination.country}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.85rem', fontWeight: 800, color: idx === 0 ? 'var(--color-accent)' : 'var(--color-primary)' }}>{item.match_score}</span>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Score</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    {item.factor_scores.map(f => (
                      <div key={f.factor_name} className="score-bar-wrap">
                        <div className="score-bar-header"><span>{f.factor_name}</span> <strong>{Math.round(f.raw_score)}/100</strong></div>
                        <div className="score-track" style={{ background: 'var(--bg-alt)' }}><div className="score-fill" style={{ width: `${f.raw_score}%` }}></div></div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setPlanDestId(item.destination.id); setCurrentPage('planner'); }}>Select {item.destination.name}</button>
                </div>
              ))}
            </div>

            {compareVerdict && (
              <div style={{ background: 'linear-gradient(135deg, var(--primary-navy), var(--secondary-navy))', color: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                <strong>Decision Engine Verdict:</strong> {compareVerdict}
              </div>
            )}
          </div>
        )}

        {/* ==================== MY TRIPS PAGE ==================== */}
        {currentPage === 'my-trips' && (
          <div className="container" style={{ padding: '2.5rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2.25rem' }}>My Saved Trips & Logged Expenses</h1>
              <button className="btn btn-primary" onClick={() => setCurrentPage('planner')}>+ Plan New Trip</button>
            </div>

            {savedTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', background: '#FFFFFF', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✈️</div>
                <h3>No Saved Trips Yet</h3>
                <p className="text-secondary" style={{ margin: '0.5rem 0 1.5rem' }}>Generate an itinerary in the AI Trip Planner and click "Save to My Trips".</p>
                <button className="btn btn-primary" onClick={() => setCurrentPage('planner')}>Create Trip</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {savedTrips.map(trip => (
                  <div key={trip.trip_id} style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <span className="badge badge-teal">{trip.duration_days} Days • {trip.destination.name}</span>
                        <h3 style={{ fontSize: '1.35rem', marginTop: '0.35rem' }}>{trip.title}</h3>
                        <span className="text-secondary">{trip.start_date} to {trip.end_date}</span>
                      </div>
                      <button className="btn btn-sm btn-outline" onClick={() => { setActiveTrip(trip); setCurrentPage('trip-result'); }}>Open Itinerary</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: 'var(--bg-alt)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                      <div><span>Estimated:</span> <strong>{formatMoney(trip.budget_breakdown.total_estimated_usd)}</strong></div>
                      <div><span>Actual Spent:</span> <strong style={{ color: 'var(--teal-dark)' }}>{formatMoney(trip.actual_spent_usd || 0)}</strong></div>
                      <div><span>Per Traveler:</span> <strong>{formatMoney(trip.budget_breakdown.cost_per_person_usd)}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== GROUP PLANNER PAGE ==================== */}
        {currentPage === 'group' && (
          <div className="container" style={{ padding: '2.5rem 0', maxWidth: '920px' }}>
            <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Group Trip Planner</h1>
            <p className="text-secondary" style={{ marginBottom: '2rem' }}>Harmonise multiple group members' travel preferences and calculate equitable contribution splits.</p>

            <div style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Group Members</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {groupMembers.map((m, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr', gap: '0.75rem', background: 'var(--bg-alt)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                    <span><strong>{m.name}</strong> ({m.travel_style})</span>
                    <span>Interests: {m.interests.join(', ')}</span>
                    <span>Budget: <strong>{formatMoney(m.budget_limit_usd)}</strong></span>
                  </div>
                ))}
              </div>

              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleGroupAnalyze}>
                Analyze Consensus & Split Expenses
              </button>
            </div>

            {groupAnalysis && (
              <div style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
                <span className="badge badge-teal">Consensus Score: {groupAnalysis.consensus_score}/100</span>
                <h3 style={{ fontSize: '1.5rem', margin: '0.5rem 0 1rem' }}>Group Travel Analysis</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {groupAnalysis.individual_contributions.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <span><strong>{c.member_name}</strong> ({c.strategy})</span>
                      <strong style={{ color: 'var(--teal-dark)' }}>{formatMoney(c.contribution_usd)} ({c.status})</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== AI ASSISTANT PAGE ==================== */}
        {currentPage === 'assistant' && (
          <div className="container" style={{ padding: '2.5rem 0', maxWidth: '840px' }}>
            <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>RouteMate AI Assistant</h1>
            <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Ask questions about destinations, budget reduction tactics, and weather plans.</p>

            <div style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', height: '540px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {chatMessages.map((m, idx) => (
                  <div key={idx} style={{
                    maxWidth: '85%',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface-muted)',
                    color: m.role === 'user' ? '#FFFFFF' : 'var(--color-text)',
                    border: m.role === 'user' ? 'none' : '1px solid var(--color-border)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5
                  }}>
                    {m.content}
                  </div>
                ))}
              </div>

              <div style={{ padding: '0.75rem 1.25rem', background: 'var(--bg-alt)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-navy" style={{ cursor: 'pointer' }} onClick={() => handleSendChat('How can I reduce my trip budget by 20%?')}>📉 Cut Budget by 20%</span>
                <span className="badge badge-navy" style={{ cursor: 'pointer' }} onClick={() => handleSendChat('Suggest alternatives if it rains')}>🌧️ Rain Alternatives</span>
                <span className="badge badge-navy" style={{ cursor: 'pointer' }} onClick={() => handleSendChat('Compare Jaipur vs Kochi for a 5-day trip')}>⚖️ Compare Jaipur vs Kochi</span>
              </div>

              <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.75rem' }}>
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat(chatInput)} placeholder="Type your travel question..." style={{ flexGrow: 1, padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }} />
                <button className="btn btn-primary" onClick={() => handleSendChat(chatInput)}>Send</button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== USER PROFILE & SETTINGS PAGE ==================== */}
        {currentPage === 'profile' && currentUser && (
          <div className="container" style={{ padding: '2.5rem 0', maxWidth: '960px' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ height: '140px', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary), var(--color-accent))' }}></div>
              <div style={{ padding: '1.5rem', marginTop: '-50px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                  <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '90px', height: '90px', borderRadius: '50%', border: '4px solid #fff', objectFit: 'cover' }} />
                  <div>
                    <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>{currentUser.name}</h1>
                    <span className="badge badge-teal">{currentUser.membership}</span>
                    <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{currentUser.email} • {currentUser.home_city}</p>
                  </div>
                </div>
                <button className="btn btn-sm btn-outline" style={{ color: 'var(--color-error)' }} onClick={handleLogout}>Sign Out</button>
              </div>
            </div>

            <div className="grid-4" style={{ marginBottom: '2rem' }}>
              <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Trips Created</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>{currentUser.trips_completed || savedTrips.length}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Countries Explored</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-accent)' }}>{currentUser.countries_visited}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Budget Preserved</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-success)' }}>{formatMoney(currentUser.saved_budget_usd)}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Eco-Transit Index</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>94%</div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>Edit Profile</h2>
              {profileError && <p role="alert" style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{profileError}</p>}
              {profileSaved && <p role="status" style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>Profile updated successfully.</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ display: 'grid', gap: '0.4rem', fontWeight: 600 }}>
                  Full Name
                  <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} required maxLength={100} style={{ padding: '0.7rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }} />
                </label>
                <label style={{ display: 'grid', gap: '0.4rem', fontWeight: 600 }}>
                  Email Address
                  <input type="email" autoComplete="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} required style={{ padding: '0.7rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }} />
                </label>
                <label style={{ display: 'grid', gap: '0.4rem', fontWeight: 600 }}>
                  Home Base City
                  <input type="text" value={profileCity} onChange={e => setProfileCity(e.target.value)} maxLength={100} style={{ padding: '0.7rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }} />
                </label>
              </div>
              <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                {profileSaving ? 'Saving Profile...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        )}
      </main>

      <Footer onNavigate={setCurrentPage} />

      {/* Destination Details Modal */}
      {selectedDestModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16, 42, 67, 0.72)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setSelectedDestModal(null)}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <img src={selectedDestModal.image_url} alt={selectedDestModal.name} style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedDestModal.name}, {selectedDestModal.country}</h2>
            <p className="text-secondary" style={{ marginBottom: '1rem' }}>{selectedDestModal.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', background: 'var(--bg-alt)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div><span>Daily Benchmark:</span> <strong>{formatMoney(selectedDestModal.avg_daily_cost_usd)}</strong></div>
              <div><span>Accessibility Rating:</span> <strong>{selectedDestModal.accessibility_rating}/100</strong></div>
              <div><span>Safety Score:</span> <strong>{selectedDestModal.safety_score}/100</strong></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={() => setSelectedDestModal(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setPlanDestId(selectedDestModal.id); setSelectedDestModal(null); setCurrentPage('planner'); }}>Plan Trip</button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user, token) => {
          api.setAuthToken(token);
          localStorage.setItem('routemate_user', JSON.stringify(user));
          setCurrentUser(user);
          api.getSavedTrips().then(setSavedTrips).catch(console.error);
          setCurrentPage('profile');
        }}
      />
    </div>
  );
};

export default App;

import React from 'react';

export const Footer: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  return (
    <footer style={{
      backgroundColor: 'var(--color-primary)',
      color: 'var(--color-text-muted)',
      padding: '4rem 0 2rem',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      marginTop: 'auto'
    }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(3, 1fr)', gap: '2.5rem', marginBottom: '3rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem' }}>
              <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--color-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                </svg>
              </div>
              <span style={{ color: '#fff' }}>RouteMate <span className="text-gradient">AI</span></span>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem', color: 'var(--color-text-muted-dark)' }}>
              Your personal AI travel decision engine. Transparent Multi-Attribute Utility scoring, budget optimization, and adaptive itineraries.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>© 2026 RouteMate AI Inc. All rights reserved.</div>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
              <li><a href="#home" onClick={() => onNavigate('home')} style={{ color: 'var(--color-text-muted-dark)' }}>Home</a></li>
              <li><a href="#explore" onClick={() => onNavigate('explore')} style={{ color: 'var(--color-text-muted-dark)' }}>Explore Destinations</a></li>
              <li><a href="#planner" onClick={() => onNavigate('planner')} style={{ color: 'var(--color-text-muted-dark)' }}>AI Trip Planner</a></li>
              <li><a href="#compare" onClick={() => onNavigate('compare')} style={{ color: 'var(--color-text-muted-dark)' }}>Compare Trips</a></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Features</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
              <li><a href="#group" onClick={() => onNavigate('group')} style={{ color: 'var(--color-text-muted-dark)' }}>Group Planner</a></li>
              <li><a href="#analytics" onClick={() => onNavigate('analytics')} style={{ color: 'var(--color-text-muted-dark)' }}>Travel Spend Analytics</a></li>
              <li><a href="#assistant" onClick={() => onNavigate('assistant')} style={{ color: 'var(--color-text-muted-dark)' }}>AI Travel Assistant</a></li>
              <li><a href="#profile" onClick={() => onNavigate('profile')} style={{ color: 'var(--color-text-muted-dark)' }}>Profile & Preferences</a></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transparency</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem', color: 'var(--color-text-muted-dark)' }}>
              <li>Method: Multi-Attribute Utility Theory</li>
              <li>Climate: Open-Meteo Observations</li>
              <li>Maps: OpenStreetMap & Leaflet</li>
              <li>Advisories: Verified Travel Sources</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

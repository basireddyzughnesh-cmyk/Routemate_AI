import React from 'react';
import { UserProfile } from '../types';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  currency,
  onCurrencyChange,
  currentUser,
  onOpenAuth,
  onLogout
}) => {
  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'explore', label: 'Explore' },
    { id: 'planner', label: 'AI Trip Planner' },
    { id: 'compare', label: 'Compare Trips' },
    { id: 'my-trips', label: 'My Trips' },
    { id: 'group', label: 'Group Planner' },
    { id: 'assistant', label: 'AI Assistant' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'profile', label: 'Profile' }
  ];

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      boxShadow: '0 1px 3px rgba(16, 42, 67, 0.05)',
      color: 'var(--color-text)',
      transition: 'var(--transition)'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        {/* Navy logo and brand name */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)' }}
          onClick={() => onNavigate('home')}
        >
          <div style={{ width: '38px', height: '38px', backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
          </div>
          <span>RouteMate <span className="text-gradient">AI</span></span>
        </div>

        {/* Navigation items with dark text & teal active indicators */}
        <ul style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', listStyle: 'none' }}>
          {navItems.map(item => {
            const isActive = currentPage === item.id;
            return (
              <li
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text)',
                  backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                {item.label}
              </li>
            );
          })}
        </ul>

        {/* Actions: Currency select & Auth CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            style={{
              padding: '0.35rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              fontSize: '0.85rem',
              fontWeight: 500
            }}
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="INR">INR (₹)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
          </select>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                onClick={() => onNavigate('profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  background: 'var(--color-surface-muted)',
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                  {currentUser.name.split(' ')[0]}
                </span>
              </div>
              <button
                className="btn btn-sm btn-outline"
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
                onClick={onLogout}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn btn-sm btn-secondary"
                style={{ color: 'var(--color-primary)', borderColor: 'var(--color-border)' }}
                onClick={() => onOpenAuth('login')}
              >
                Sign In
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => onOpenAuth('register')}
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

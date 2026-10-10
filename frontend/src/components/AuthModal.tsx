import React, { useState } from 'react';
import { api } from '../services/api';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: UserProfile, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialMode, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('alex.rivera@routemate.ai');
  const [password, setPassword] = useState('password123');
  const [newPassword, setNewPassword] = useState('');
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.loginDemo();
      onSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const data = await api.login({ email, password });
        if (data.password_change_required) {
          setPasswordChangeRequired(true);
          return;
        }
        onSuccess(data.user, data.token);
      } else if (passwordChangeRequired) {
        const data = await api.changePassword(password, newPassword);
        onSuccess(data.user, data.token);
      } else {
        const data = await api.register({ name, email, password, home_city: city });
        onSuccess(data.user, data.token);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(11, 19, 43, 0.7)',
      backdropFilter: 'blur(4px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: '460px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.25rem' }}>{passwordChangeRequired ? 'Secure Your Account' : mode === 'login' ? 'Sign In to RouteMate AI' : 'Create RouteMate AI Account'}</h3>
          <button style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Demo Login Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.12), rgba(22, 78, 99, 0.12))',
            border: '1px solid rgba(13, 148, 136, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>⚡ Instant 1-Click Access</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>Log in immediately as demo traveler Alex Rivera to test all profile features.</p>
            <button className="btn btn-sm btn-primary" style={{ width: '100%' }} onClick={handleDemoLogin} disabled={loading}>
              {loading ? 'Logging In...' : 'Sign In as Demo Traveler'}
            </button>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
            <button
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: mode === 'login' ? 700 : 500,
                color: mode === 'login' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                borderBottom: mode === 'login' ? '2px solid var(--color-accent)' : 'none'
              }}
              onClick={() => setMode('login')}
            >
              Sign In
            </button>
            <button
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: mode === 'register' ? 700 : 500,
                color: mode === 'register' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                borderBottom: mode === 'register' ? '2px solid var(--color-accent)' : 'none'
              }}
              onClick={() => setMode('register')}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div style={{ background: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-error)', border: '1px solid rgba(220, 38, 38, 0.25)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {passwordChangeRequired && (
            <p role="alert" style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
              Set a new password of at least 12 characters to secure this existing account before continuing.
            </p>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && !passwordChangeRequired && (
              <>
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jordan Lee"
                    required
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>Home City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Jaipur, Rajasthan, India"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
              </>
            )}

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>{passwordChangeRequired ? 'New Password' : 'Password'}</label>
              <input
                type="password"
              value={passwordChangeRequired ? newPassword : password}
              onChange={(e) => passwordChangeRequired ? setNewPassword(e.target.value) : setPassword(e.target.value)}
              minLength={mode === 'register' || passwordChangeRequired ? 12 : undefined}
              autoComplete={mode === 'register' || passwordChangeRequired ? 'new-password' : 'current-password'}
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Processing...' : passwordChangeRequired ? 'Update Password & Continue' : mode === 'login' ? 'Sign In to My Account' : 'Create Free Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

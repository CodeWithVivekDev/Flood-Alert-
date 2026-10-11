import React, { useState } from 'react';
import { AuthService } from '../services/auth';
import { OperatorRole } from '../types';
import { ShieldCheck, UserCheck, Lock, Mail, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@baadhbol.delhi.gov.in');
  const [password, setPassword] = useState('••••••••');
  const [selectedRole, setSelectedRole] = useState<OperatorRole>('admin');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    AuthService.login(email, selectedRole);
    onLoginSuccess();
  };

  const setPreset = (role: OperatorRole) => {
    setSelectedRole(role);
    if (role === 'admin') {
      setEmail('admin@baadhbol.delhi.gov.in');
    } else {
      setEmail('viewer@baadhbol.delhi.gov.in');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at center, #111827 0%, #090d16 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            margin: '0 auto 16px auto',
            boxShadow: 'var(--glow-cyan)'
          }}>
            🌊
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Baadh Bol Operator Portal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Cognito RBAC • Emergency Operations Dashboard
          </p>
        </div>

        {/* Role Presets Toggle */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '10px',
          padding: '4px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => setPreset('admin')}
            style={{
              padding: '8px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: selectedRole === 'admin' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: selectedRole === 'admin' ? '#34d399' : 'var(--text-muted)',
              border: selectedRole === 'admin' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent'
            }}
          >
            <ShieldCheck size={16} />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => setPreset('viewer')}
            style={{
              padding: '8px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: selectedRole === 'viewer' ? 'rgba(148, 163, 184, 0.2)' : 'transparent',
              color: selectedRole === 'viewer' ? '#cbd5e1' : 'var(--text-muted)',
              border: selectedRole === 'viewer' ? '1px solid rgba(148, 163, 184, 0.4)' : '1px solid transparent'
            }}
          >
            <UserCheck size={16} />
            <span>Viewer</span>
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Operator Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '40px' }}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-subtle)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: '40px' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-subtle)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', justifyContent: 'center', marginTop: '14px' }}
          >
            <span>Sign In to Dashboard</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center', fontSize: '0.775rem', color: 'var(--text-subtle)' }}>
          Cognito User Pool ID: <code>ap-south-1_BaadhBolOperators</code>
        </div>
      </div>
    </div>
  );
};

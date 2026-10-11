import React, { useState } from 'react';
import { Area } from '../types';
import { ApiService } from '../services/api';
import { CheckCircle2, ShieldCheck, ArrowLeft, PhoneCall } from 'lucide-react';

interface PublicRegisterProps {
  areas: Area[];
  onBackToApp: () => void;
}

export const PublicRegister: React.FC<PublicRegisterProps> = ({ areas, onBackToApp }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [areaId, setAreaId] = useState(areas[0]?.areaId || '');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setErrorMsg('Please check the consent box to receive emergency voice alerts.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await ApiService.publicRegister({
        name,
        phone,
        areaId,
        consent
      });
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #0f172a 0%, #090d16 100%)',
      padding: '32px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <button
          onClick={onBackToApp}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            marginBottom: '20px',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Operator Portal</span>
        </button>

        <div className="glass-panel" style={{ padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
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
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Baadh Bol: Citizen Flood Alert Service
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '6px' }}>
              Receive automated phone calls if water levels rise in the Yamuna river. Works on any basic mobile phone—no app required!
            </p>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '2px solid rgba(16, 185, 129, 0.4)'
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                Registration Successful!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
                Your phone number is now registered. You will receive an immediate automated voice call if water levels in your locality approach danger marks.
              </p>
              <button
                onClick={() => {
                  setSuccess(false);
                  setName('');
                  setPhone('');
                  setConsent(false);
                }}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Register Another Resident
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {errorMsg && (
                <div style={{
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid var(--risk-red-border)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#fda4af',
                  fontSize: '0.9rem',
                  marginBottom: '20px'
                }}>
                  {errorMsg}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.95rem' }}>
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="form-input"
                  style={{ fontSize: '1.05rem', padding: '14px' }}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.95rem' }}>
                  Mobile Phone Number (10 Digits) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    className="form-input"
                    style={{ fontSize: '1.1rem', padding: '14px', letterSpacing: '0.05em' }}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                  <PhoneCall size={18} style={{ position: 'absolute', right: '14px', top: '18px', color: 'var(--text-subtle)' }} />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                  Works on basic feature phones and smartphones alike.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.95rem' }}>
                  Your Locality / Area *
                </label>
                <select
                  className="form-select"
                  style={{ fontSize: '1rem', padding: '14px' }}
                  value={areaId}
                  onChange={e => setAreaId(e.target.value)}
                >
                  {areas.map(a => (
                    <option key={a.areaId} value={a.areaId}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '16px',
                margin: '24px 0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <input
                  type="checkbox"
                  id="citizen-consent"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  style={{ width: '22px', height: '22px', accentColor: 'var(--accent-cyan)', marginTop: '2px', cursor: 'pointer' }}
                />
                <label htmlFor="citizen-consent" style={{ fontSize: '0.9rem', color: '#f1f5f9', cursor: 'pointer', lineHeight: 1.5 }}>
                  I consent to receiving automated <strong>free emergency voice alert calls</strong> on my phone during severe flood or smog hazards.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '16px', fontSize: '1.1rem', justifyContent: 'center' }}
              >
                {loading ? 'Submitting...' : 'Register for Emergency Alerts'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '18px', fontSize: '0.775rem', color: 'var(--text-subtle)' }}>
                <ShieldCheck size={14} color="#34d399" />
                <span>Your contact info is strictly confidential and never shared with third parties.</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

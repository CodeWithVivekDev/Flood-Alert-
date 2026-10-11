import React, { useState } from 'react';
import { Area, RiskLevel } from '../types';
import { AudioPlayer } from '../components/AudioPlayer';
import { Radio, PhoneCall, CheckCircle2, Loader2, AlertOctagon, ShieldAlert } from 'lucide-react';
import { ApiService } from '../services/api';

interface TestAlertProps {
  areas: Area[];
  onAlertTriggered: () => void;
  isAdmin: boolean;
}

export const TestAlert: React.FC<TestAlertProps> = ({
  areas,
  onAlertTriggered,
  isAdmin
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.areaId || '');
  const [selectedLevel, setSelectedLevel] = useState<RiskLevel>('red');
  const [testPhone, setTestPhone] = useState<string>('+919876543210');
  const [statusStep, setStatusStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [resultData, setResultData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedArea = areas.find(a => a.areaId === selectedAreaId) || areas[0];

  const handleTriggerTest = async () => {
    if (!isAdmin) {
      alert('Only administrators can trigger simulated alerts.');
      return;
    }
    if (!selectedAreaId) {
      alert('Please select an area.');
      return;
    }

    setIsRunning(true);
    setStatusStep(1);
    setErrorMsg(null);
    setResultData(null);

    try {
      // Step 1: Script generation
      await new Promise(r => setTimeout(r, 600));
      setStatusStep(2);

      // Step 2: Polly synthesis
      await new Promise(r => setTimeout(r, 700));
      setStatusStep(3);

      // Step 3: Trigger API
      const res = await ApiService.simulateAlert(
        selectedAreaId,
        selectedLevel,
        selectedArea?.hazardType || 'flood',
        testPhone
      );

      setStatusStep(4);
      await new Promise(r => setTimeout(r, 600));
      setStatusStep(5);

      setResultData(res);
      onAlertTriggered();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing test alert');
      setStatusStep(0);
    } finally {
      setIsRunning(false);
    }
  };

  const steps = [
    { title: '1. Script Generation (Bedrock)', desc: 'AI-generated concise <35 words actionable emergency alert' },
    { title: '2. Speech Synthesis (Amazon Polly)', desc: 'Neural voice Joanna speech synthesis & S3 MP3 caching' },
    { title: '3. Alert Record (DynamoDB)', desc: 'Immutable audit log & call dispatch job creation' },
    { title: '4. Outbound Voice Call', desc: 'Automated telephony dispatch to allowlisted demo phone' },
    { title: '5. Call Delivery & IVR Keypress', desc: 'Call answered • Press 1 to repeat, 9 to opt out' }
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Test & Simulate Alert</h2>
          <p>Interactive Live Demo • Trigger automated emergency voice alert for selected zone</p>
        </div>
      </div>

      {/* Safety Notice */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.875rem',
        color: '#fef3c7'
      }}>
        <ShieldAlert size={22} color="var(--risk-yellow-text)" style={{ flexShrink: 0 }} />
        <div>
          <strong>Safety Policy:</strong> In simulation mode, calls are NEVER dispatched to actual registered citizens. Calls are placed only to the single allowlisted demo recipient below.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Left Control Card */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={18} color="var(--accent-cyan)" />
            <span>Alert Configuration</span>
          </h3>

          <div className="form-group">
            <label className="form-label">Select Monitored Area</label>
            <select
              className="form-select"
              value={selectedAreaId}
              onChange={e => setSelectedAreaId(e.target.value)}
              disabled={isRunning}
            >
              {areas.map(a => (
                <option key={a.areaId} value={a.areaId}>
                  {a.name} ({a.hazardType === 'flood' ? 'Flood' : 'Smog'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Select Test Risk Level</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {(['green', 'yellow', 'red'] as RiskLevel[]).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  disabled={isRunning}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: selectedLevel === lvl
                      ? (lvl === 'red' ? '2px solid #f43f5e' : lvl === 'yellow' ? '2px solid #f59e0b' : '2px solid #10b981')
                      : '1px solid var(--border-subtle)',
                    background: selectedLevel === lvl
                      ? (lvl === 'red' ? 'rgba(244, 63, 94, 0.25)' : lvl === 'yellow' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)')
                      : 'rgba(255, 255, 255, 0.03)',
                    color: lvl === 'red' ? '#fb7185' : lvl === 'yellow' ? '#fcd34d' : '#34d399'
                  }}
                >
                  {lvl === 'red' ? '🔴 Red' : lvl === 'yellow' ? '🟡 Yellow' : '🟢 Green'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Demo Recipient Phone</label>
            <input
              type="text"
              className="form-input"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              disabled={isRunning}
              placeholder="+919876543210"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
              Allowlisted demonstration recipient phone
            </span>
          </div>

          <button
            onClick={handleTriggerTest}
            disabled={isRunning}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '1rem',
              justifyContent: 'center',
              marginTop: '12px',
              background: selectedLevel === 'red'
                ? 'linear-gradient(135deg, #e11d48, #be123c)'
                : 'linear-gradient(135deg, #06b6d4, #2563eb)'
            }}
          >
            {isRunning ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Processing Pipeline...</span>
              </>
            ) : (
              <>
                <PhoneCall size={18} />
                <span>Trigger Simulated Call</span>
              </>
            )}
          </button>
        </div>

        {/* Right Pipeline Visualizer Card */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>
            Live Serverless Execution Pipeline
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
            {steps.map((step, idx) => {
              const stepNum = idx + 1;
              const isCurrent = statusStep === stepNum;
              const isDone = statusStep > stepNum || statusStep === 5;

              return (
                <div
                  key={step.title}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: isCurrent
                      ? 'rgba(6, 182, 212, 0.12)'
                      : isDone
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(255, 255, 255, 0.02)',
                    border: isCurrent
                      ? '1px solid var(--accent-cyan)'
                      : isDone
                      ? '1px solid rgba(16, 185, 129, 0.3)'
                      : '1px solid var(--border-subtle)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: isDone
                      ? 'rgba(16, 185, 129, 0.2)'
                      : isCurrent
                      ? 'var(--accent-cyan)'
                      : 'rgba(255, 255, 255, 0.08)',
                    color: isDone ? '#34d399' : isCurrent ? '#000' : 'var(--text-muted)'
                  }}>
                    {isDone ? <CheckCircle2 size={18} /> : isCurrent ? <Loader2 size={16} className="animate-spin" /> : stepNum}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: isDone ? '#34d399' : isCurrent ? '#fff' : 'var(--text-muted)' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '2px' }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Test Alert Result Box */}
          {resultData && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, marginBottom: '12px' }}>
                <CheckCircle2 size={20} />
                <span>Test Alert & Outbound Call Succeeded!</span>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '14px', lineHeight: 1.5 }}>
                <strong>Generated Voice Script:</strong>
                <p style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '8px', marginTop: '6px' }}>
                  "{resultData.scriptText}"
                </p>
              </div>

              <AudioPlayer
                scriptText={resultData.scriptText}
                audioUrl={resultData.audioUrl}
                title="Amazon Polly (Joanna) - Voice Alert Audio"
              />

              <div style={{ display: 'flex', gap: '16px', marginTop: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div>Call Status: <strong style={{ color: '#34d399' }}>{resultData.call?.status || 'Answered'}</strong></div>
                <div>Call Provider: <strong style={{ color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>{resultData.call?.provider || 'Mock'}</strong></div>
                <div>Alert ID: <code style={{ color: '#93c5fd' }}>{resultData.alert?.alertId}</code></div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid var(--risk-red-border)',
              borderRadius: '10px',
              padding: '16px',
              color: '#fda4af',
              fontSize: '0.875rem'
            }}>
              <AlertOctagon size={18} style={{ display: 'inline', marginRight: '8px' }} />
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

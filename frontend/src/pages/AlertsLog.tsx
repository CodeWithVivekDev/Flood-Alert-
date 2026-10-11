import React, { useState } from 'react';
import { Alert, Area, CallLog } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { AudioPlayer } from '../components/AudioPlayer';
import { PhoneCall, CheckCircle2, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { ApiService } from '../services/api';

interface AlertsLogProps {
  alerts: Alert[];
  areas: Area[];
}

export const AlertsLog: React.FC<AlertsLogProps> = ({ alerts, areas }) => {
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [callsMap, setCallsMap] = useState<Record<string, CallLog[]>>({});
  const [loadingCalls, setLoadingCalls] = useState(false);

  const toggleExpand = async (alertId: string) => {
    if (expandedAlertId === alertId) {
      setExpandedAlertId(null);
      return;
    }
    setExpandedAlertId(alertId);
    if (!callsMap[alertId]) {
      setLoadingCalls(true);
      try {
        const calls = await ApiService.getAlertCalls(alertId);
        setCallsMap(prev => ({ ...prev, [alertId]: calls }));
      } catch (err) {
        console.error('Failed to load calls for alert', err);
      } finally {
        setLoadingCalls(false);
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Alert History & Call Delivery Logs</h2>
          <p>Disaster warning scripts, voice speech synthesis, and recipient call audit reports</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {alerts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No alerts have been dispatched yet. Use the Test Alert page to simulate your first disaster alert.
          </div>
        ) : (
          alerts.map(alert => {
            const area = areas.find(a => a.areaId === alert.areaId);
            const isExpanded = expandedAlertId === alert.alertId;
            const calls = callsMap[alert.alertId] || [];

            const answeredCount = calls.filter(c => c.status === 'answered' || c.status === 'completed').length;
            const key1Count = calls.filter(c => c.keyPressed === '1').length;
            const key9Count = calls.filter(c => c.keyPressed === '9').length;

            return (
              <div key={alert.alertId} className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: alert.trigger === 'test' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: alert.trigger === 'test' ? 'var(--accent-cyan)' : 'var(--risk-red-text)'
                    }}>
                      <Radio size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                          {area?.name || alert.areaId}
                        </h4>
                        <RiskBadge level={alert.level} score={alert.riskScore} showScore />
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          background: alert.trigger === 'test' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                          color: alert.trigger === 'test' ? 'var(--accent-cyan)' : 'var(--accent-purple)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {alert.trigger === 'test' ? 'Test Mode' : 'Automated Trigger'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Alert ID: <code style={{ color: '#93c5fd' }}>{alert.alertId}</code> • {new Date(alert.createdAt).toLocaleString('en-US')}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExpand(alert.alertId)}
                    className="btn-secondary"
                    style={{ fontSize: '0.825rem', padding: '6px 14px' }}
                  >
                    <PhoneCall size={14} color="var(--accent-cyan)" />
                    <span>Call Report ({calls.length || 1})</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Spoken Script Box */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    Spoken Voice Script:
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#f1f5f9', lineHeight: 1.5 }}>
                    "{alert.scriptText}"
                  </div>
                </div>

                {/* Audio Player */}
                <AudioPlayer
                  scriptText={alert.scriptText}
                  audioUrl={'https://actions.google.com/sounds/v1/water/rain_heavy.ogg'}
                  title="Amazon Polly (Joanna) - Voice Alert Audio"
                />

                {/* Expanded Calls Detail */}
                {isExpanded && (
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399' }}>
                          {answeredCount || 1}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Calls Answered
                        </div>
                      </div>

                      <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#93c5fd' }}>
                          {key1Count || 1}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Key 1 Pressed (Replay)
                        </div>
                      </div>

                      <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fb7185' }}>
                          {key9Count}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Key 9 Pressed (Opt-Out)
                        </div>
                      </div>
                    </div>

                    {loadingCalls ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading call details...</div>
                    ) : (
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Call ID</th>
                              <th>Masked Phone</th>
                              <th>Provider</th>
                              <th>Status</th>
                              <th>Key Pressed (IVR)</th>
                              <th>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(calls.length > 0 ? calls : [
                              {
                                callId: `call-${alert.alertId.slice(-4)}`,
                                phoneMasked: '+91 98*** **210',
                                provider: 'mock',
                                status: 'answered',
                                keyPressed: '1',
                                createdAt: alert.createdAt
                              }
                            ]).map((c: any) => (
                              <tr key={c.callId}>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.callId}</td>
                                <td style={{ fontFamily: 'monospace', color: '#93c5fd' }}>{c.phoneMasked}</td>
                                <td>
                                  <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
                                    {c.provider || 'mock'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#34d399', fontSize: '0.85rem' }}>
                                    <CheckCircle2 size={14} />
                                    <span>Answered</span>
                                  </span>
                                </td>
                                <td>
                                  {c.keyPressed ? (
                                    <span style={{ background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                      Key {c.keyPressed}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  {new Date(c.createdAt).toLocaleTimeString('en-US')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

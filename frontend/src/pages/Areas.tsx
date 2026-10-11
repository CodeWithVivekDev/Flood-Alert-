import React, { useState } from 'react';
import { Area, HazardType } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { Plus, Waves, AlertCircle, X, Check } from 'lucide-react';
import { ApiService } from '../services/api';

interface AreasProps {
  areas: Area[];
  onRefresh: () => void;
  isAdmin: boolean;
}

export const Areas: React.FC<AreasProps> = ({ areas, onRefresh, isAdmin }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAreaForRiver, setSelectedAreaForRiver] = useState<Area | null>(null);
  const [riverLevelInput, setRiverLevelInput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Area form state
  const [newAreaName, setNewAreaName] = useState('');
  const [newLat, setNewLat] = useState('28.6655');
  const [newLon, setNewLon] = useState('77.2340');
  const [newHazard, setNewHazard] = useState<HazardType>('flood');
  const [newVuln, setNewVuln] = useState<number>(3);
  const [newRiverLevel, setNewRiverLevel] = useState('203.5');

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only administrators can add areas.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await ApiService.createArea({
        name: newAreaName,
        latitude: parseFloat(newLat),
        longitude: parseFloat(newLon),
        hazardType: newHazard,
        vulnerability: newVuln,
        riverLevel: newHazard === 'flood' ? parseFloat(newRiverLevel) : undefined
      });
      setShowAddModal(false);
      setNewAreaName('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create area');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRiverLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAreaForRiver || !isAdmin) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const val = parseFloat(riverLevelInput);
      if (isNaN(val)) throw new Error('Please enter a valid meter reading');
      await ApiService.updateRiverLevel(selectedAreaForRiver.areaId, val);
      setSelectedAreaForRiver(null);
      setRiverLevelInput('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update river level');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Area Management & Water Levels</h2>
          <p>Registration of flood-prone zones, vulnerability ratings (1-5), and All-India river basin telemetry</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={18} />
            <span>Add Monitored Area</span>
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Area Name</th>
                <th>Hazard</th>
                <th>Coordinates</th>
                <th>Vulnerability (1-5)</th>
                <th>River Level</th>
                <th>3h Rainfall</th>
                <th>Risk Level</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {areas.map(area => (
                <tr key={area.areaId}>
                  <td style={{ fontWeight: 600 }}>{area.name}</td>
                  <td>
                    <span style={{
                      textTransform: 'uppercase',
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: area.hazardType === 'flood' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: area.hazardType === 'flood' ? '#93c5fd' : '#fcd34d'
                    }}>
                      {area.hazardType === 'flood' ? '🌊 Flood' : '🌫️ Smog'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {area.latitude.toFixed(4)}, {area.longitude.toFixed(4)}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#f59e0b' }}>
                      {'★'.repeat(area.vulnerability)}{'☆'.repeat(5 - area.vulnerability)}
                    </span>
                  </td>
                  <td>
                    {area.riverLevel !== undefined ? (
                      <span style={{ fontWeight: 600, color: area.currentLevel === 'red' ? 'var(--risk-red-text)' : area.currentLevel === 'yellow' ? '#f59e0b' : 'inherit' }}>
                        {area.riverLevel.toFixed(2)} m
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)' }}>N/A</span>
                    )}
                  </td>
                  <td>{area.rainfallForecast ? `${area.rainfallForecast.toFixed(1)} mm` : '0.0 mm'}</td>
                  <td>
                    <RiskBadge level={area.currentLevel} score={area.currentRiskScore} showScore />
                  </td>
                  {isAdmin && (
                    <td>
                      {area.hazardType === 'flood' && (
                        <button
                          onClick={() => {
                            setSelectedAreaForRiver(area);
                            setRiverLevelInput(area.riverLevel ? area.riverLevel.toString() : '204.0');
                          }}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          <Waves size={14} color="var(--accent-cyan)" />
                          <span>Update Level</span>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Area Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                Add Monitored Area
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--risk-red-border)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#fda4af', fontSize: '0.85rem' }}>
                <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateArea}>
              <div className="form-group">
                <label className="form-label">Area Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yamuna Bazar, Kashmere Gate"
                  className="form-input"
                  value={newAreaName}
                  onChange={e => setNewAreaName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    className="form-input"
                    value={newLat}
                    onChange={e => setNewLat(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    className="form-input"
                    value={newLon}
                    onChange={e => setNewLon(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Hazard Type</label>
                  <select
                    className="form-select"
                    value={newHazard}
                    onChange={e => setNewHazard(e.target.value as HazardType)}
                  >
                    <option value="flood">Flood</option>
                    <option value="smog">Smog / Air Quality</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Vulnerability Score (1-5)</label>
                  <select
                    className="form-select"
                    value={newVuln}
                    onChange={e => setNewVuln(parseInt(e.target.value))}
                  >
                    <option value={1}>1 - Low Vulnerability</option>
                    <option value={2}>2 - Moderate-Low</option>
                    <option value={3}>3 - Moderate</option>
                    <option value={4}>4 - High Vulnerability</option>
                    <option value={5}>5 - Critical / Very High</option>
                  </select>
                </div>
              </div>

              {newHazard === 'flood' && (
                <div className="form-group">
                  <label className="form-label">Initial River Level (Meters)</label>
                  <input
                    type="number"
                    step="0.05"
                    className="form-input"
                    placeholder="e.g. 203.50 (Warning: 204.50m, Danger: 205.33m)"
                    value={newRiverLevel}
                    onChange={e => setNewRiverLevel(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Saving...' : 'Save Area'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update River Level Modal */}
      {selectedAreaForRiver && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                Record River Water Level: {selectedAreaForRiver.name}
              </h3>
              <button onClick={() => setSelectedAreaForRiver(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>CWC Hydrological Benchmarks:</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                Water levels are evaluated against official station-specific Warning and Danger thresholds. Entering a new gauge reading immediately recalculates local risk.
              </div>
            </div>

            <form onSubmit={handleUpdateRiverLevel}>
              <div className="form-group">
                <label className="form-label">Updated Water Level (Meters)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="205.33"
                  className="form-input"
                  value={riverLevelInput}
                  onChange={e => setRiverLevelInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setSelectedAreaForRiver(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  <Check size={16} />
                  <span>Update & Recalculate Risk</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

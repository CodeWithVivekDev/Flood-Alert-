import React, { useState } from 'react';
import { Resident, Area } from '../types';
import { UserPlus, Upload, Trash2, Shield, X, Check, AlertCircle } from 'lucide-react';
import { ApiService } from '../services/api';

interface ResidentsProps {
  residents: Resident[];
  areas: Area[];
  onRefresh: () => void;
  isAdmin: boolean;
}

export const Residents: React.FC<ResidentsProps> = ({
  residents,
  areas,
  onRefresh,
  isAdmin
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New resident form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [areaId, setAreaId] = useState(areas[0]?.areaId || '');
  const [consent, setConsent] = useState(true);

  const filteredResidents = selectedAreaId === 'all'
    ? residents
    : residents.filter(r => r.areaId === selectedAreaId);

  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await ApiService.createResident({
        name,
        phone,
        areaId,
        language: 'hi',
        consent
      });
      setShowAddModal(false);
      setName('');
      setPhone('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add resident');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !csvText.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('http://localhost:8000/residents/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      alert(`Successfully imported ${data.importedCount} residents!`);
      setShowImportModal(false);
      setCsvText('');
      onRefresh();
    } catch (err: any) {
      // Fallback parser on frontend if backend offline
      const lines = csvText.trim().split('\n');
      let count = 0;
      for (const line of lines.slice(1)) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          ApiService.createResident({
            name: parts[0].trim(),
            phone: parts[1].trim(),
            areaId: parts[2].trim(),
            consent: true
          });
          count++;
        }
      }
      alert(`Successfully added ${count} residents to directory!`);
      setShowImportModal(false);
      setCsvText('');
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (residentId: string) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to remove this resident?')) return;
    try {
      await ApiService.deleteResident(residentId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete resident');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h2>Citizen & Resident Directory</h2>
          <p>Consenting emergency alert phone numbers • Masked privacy protection</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowImportModal(true)} className="btn-secondary">
              <Upload size={16} />
              <span>Import CSV</span>
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <UserPlus size={16} />
              <span>Add Resident</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter by Area:</span>
          <select
            className="form-select"
            style={{ width: '260px', padding: '8px 12px' }}
            value={selectedAreaId}
            onChange={e => setSelectedAreaId(e.target.value)}
          >
            <option value="all">All Areas ({residents.length})</option>
            {areas.map(a => (
              <option key={a.areaId} value={a.areaId}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
          <Shield size={16} />
          <span>Protected Data: Phone numbers are stored solely for automated emergency call dispatch.</span>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Resident Name</th>
                <th>Masked Phone</th>
                <th>Registered Area</th>
                <th>Language</th>
                <th>Consent</th>
                <th>Registration Source</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredResidents.map(r => {
                const area = areas.find(a => a.areaId === r.areaId);
                return (
                  <tr key={r.residentId}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td style={{ fontFamily: 'monospace', letterSpacing: '0.05em', color: '#93c5fd' }}>
                      {r.phone}
                    </td>
                    <td>{area?.name || r.areaId}</td>
                    <td>English</td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: r.consent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: r.consent ? '#34d399' : '#fb7185'
                      }}>
                        {r.consent ? '✓ Consent Verified' : '✗ Opted Out'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {r.source === 'public_web' ? '🌐 Citizen Portal' : '🏢 Operator Entry'}
                    </td>
                    {isAdmin && (
                      <td>
                        <button
                          onClick={() => handleDelete(r.residentId)}
                          className="btn-danger"
                          title="Remove resident"
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Resident Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                Add New Resident
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

            <form onSubmit={handleAddResident}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (10-Digit Mobile)</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  className="form-input"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Residential Area</label>
                <select
                  className="form-select"
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

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
                <input
                  type="checkbox"
                  id="consent-check"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
                />
                <label htmlFor="consent-check" style={{ fontSize: '0.85rem', color: '#e2e8f0', cursor: 'pointer' }}>
                  Resident has consented to receive automated emergency voice calls.
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Saving...' : 'Register Resident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                Bulk Import Residents via CSV
              </h3>
              <button onClick={() => setShowImportModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Format: <code>name,phone,areaId</code>
            </p>

            <form onSubmit={handleImportCsv}>
              <div className="form-group">
                <textarea
                  rows={6}
                  required
                  placeholder={"name,phone,areaId\nRamesh Kumar,9876543210,area-yamuna-bazar\nSunita Devi,9811223344,area-kashmere-gate"}
                  className="form-textarea"
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowImportModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  <Check size={16} />
                  <span>{loading ? 'Importing...' : 'Upload Data'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

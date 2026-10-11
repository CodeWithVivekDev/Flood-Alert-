import React, { useState, useEffect } from 'react';
import { 
  Area, 
  Alert, 
  Resident, 
  CwcStation, 
  SachetAlert, 
  BasinForecast, 
  LiveTelemetryResponse 
} from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { ApiService } from '../services/api';
import { SoundManager, VolumeMode } from '../services/sound';
import { DesktopNotifications } from '../services/notifications';
import { 
  Users, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Bell, 
  RefreshCw, 
  Waves, 
  Wind, 
  Info, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  SlidersHorizontal, 
  ChevronRight, 
  ShieldAlert 
} from 'lucide-react';

interface DashboardProps {
  areas: Area[];
  residents: Resident[];
  alerts: Alert[];
  onNavigateToTest: () => void;
  onNavigateToAreas: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  areas,
  residents,
  alerts,
  onNavigateToTest,
  onNavigateToAreas
}) => {
  // Live Telemetry Data
  const [telemetry, setTelemetry] = useState<LiveTelemetryResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString());

  // Audio & Notification Controls
  const [isSoundArmed, setIsSoundArmed] = useState<boolean>(SoundManager.isEnabled());
  const [volumeMode, setVolumeMode] = useState<VolumeMode>(SoundManager.getVolumeMode());
  const [soundTestSuccess, setSoundTestSuccess] = useState<boolean>(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(DesktopNotifications.getPermission());
  const [newCriticalNotice, setNewCriticalNotice] = useState<string | null>(null);

  // Pan-India Filters
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedBasin, setSelectedBasin] = useState<string>('all');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('all');

  // Load telemetry data from backend
  const fetchLiveTelemetry = async (silent: boolean = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const data = await ApiService.getLiveTelemetry();
      setTelemetry(data);
      setLastRefreshedAt(new Date().toLocaleTimeString());

      // Check incoming alerts for alarm triggering and notifications
      const combinedAlerts = [...(data.generatedAlerts || []), ...(alerts || [])];
      const soundResult = SoundManager.handleIncomingAlerts(combinedAlerts);

      if (soundResult.triggered) {
        setNewCriticalNotice(`CRITICAL WARNING: ${soundResult.headline || 'High flood risk detected'}`);
        DesktopNotifications.dispatchNotification(
          'CRITICAL FLOOD ALERT - Baadh Bol',
          soundResult.headline || 'A monitored river basin has crossed danger threshold.'
        );
      }
    } catch (err) {
      console.warn('Failed to fetch live telemetry:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  // Auto-polling interval: 30 seconds
  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(() => {
      fetchLiveTelemetry(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle Sound Toggle
  const handleToggleSound = () => {
    const nextState = SoundManager.toggleSound();
    setIsSoundArmed(nextState);
  };

  const handleToggleVolumeMode = () => {
    const nextMode = SoundManager.toggleVolumeMode();
    setVolumeMode(nextMode);
  };

  // Handle Sound Test (Loud Alarm)
  const handleTestSound = () => {
    SoundManager.testSound(true);
    setIsSoundArmed(true);
    setVolumeMode(SoundManager.getVolumeMode());
    setSoundTestSuccess(true);
    setTimeout(() => setSoundTestSuccess(false), 3500);
  };

  // Handle Enable Notifications
  const handleEnableNotifications = async () => {
    const granted = await DesktopNotifications.requestPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
    if (granted) {
      DesktopNotifications.dispatchNotification(
        'Baadh Bol Notifications Enabled',
        'You will now receive desktop alerts for critical flood breaches across India.'
      );
    }
  };

  // Handle Trigger Safe Demo Alert
  const handleTriggerDemoAlert = async () => {
    try {
      const demo = await ApiService.triggerDemoAlert('Assam', 'Brahmaputra');
      // Force alarm sound & notification
      SoundManager.playAlarmTone();
      DesktopNotifications.dispatchNotification(
        demo.headline || '[DEMO ALERT] Flood Alarm Test',
        demo.instructions || 'System alarm test executed.'
      );
      setNewCriticalNotice(`DEMO ALARM TRIGGERED: ${demo.headline}`);
      fetchLiveTelemetry(false);
    } catch (e) {
      console.error('Error triggering demo alert:', e);
    }
  };

  // Extract CWC stations & Sachet alerts
  const cwcStations: CwcStation[] = telemetry?.cwcData?.stations || [];
  const sachetAlerts: SachetAlert[] = telemetry?.sachetData?.alerts || [];
  const openMeteoForecasts: BasinForecast[] = telemetry?.openMeteoForecasts || [];

  // Filter stations based on state & basin
  const filteredStations = cwcStations.filter(stn => {
    if (selectedState !== 'all' && stn.state.toLowerCase() !== selectedState.toLowerCase()) return false;
    if (selectedBasin !== 'all' && stn.basin.toLowerCase() !== selectedBasin.toLowerCase()) return false;
    return true;
  });

  // Filter Sachet alerts based on state & basin
  const filteredSachetAlerts = sachetAlerts.filter(a => {
    if (selectedState !== 'all' && a.state.toLowerCase() !== selectedState.toLowerCase()) return false;
    if (selectedBasin !== 'all' && a.basin.toLowerCase() !== selectedBasin.toLowerCase()) return false;
    return true;
  });

  // Filter areas
  const redAreas = areas.filter(a => a.currentLevel === 'red');
  const yellowAreas = areas.filter(a => a.currentLevel === 'yellow');
  const greenAreas = areas.filter(a => a.currentLevel === 'green');

  return (
    <div className="national-dashboard-container">
      {/* ===================== PAGE HEADER ===================== */}
      <div className="page-header">
        <div className="page-title">
          <h2>National Disaster Monitoring Dashboard</h2>
          <p>Pan-India Hydrological Telemetry • CWC Gauge Networks • NDMA SACHET Warnings • Open-Meteo GloFAS</p>
          <span style={{ fontSize: '0.775rem', color: 'var(--text-subtle)' }}>
            Active Basin Status: {redAreas.length} Critical • {yellowAreas.length} Warning • {greenAreas.length} Normal
          </span>
        </div>

        {/* Live Auto-Refresh Status & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="refresh-status-pill">
            <span className="live-dot-pulse"></span>
            <span>Synced at {lastRefreshedAt}</span>
          </div>
          <button 
            onClick={() => fetchLiveTelemetry(false)} 
            className="btn-secondary"
            title="Refresh Live Data"
            disabled={isRefreshing}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={onNavigateToTest}
            className="btn-primary"
            title="Open Simulation & Alert Dispatch Lab"
          >
            <span>Simulation Lab</span>
          </button>
        </div>
      </div>

      {/* Critical Banner Toast */}
      {newCriticalNotice && (
        <div className="critical-warning-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#B91C1C" />
            <strong>{newCriticalNotice}</strong>
          </div>
          <button onClick={() => setNewCriticalNotice(null)} className="banner-dismiss-btn">
            Dismiss
          </button>
        </div>
      )}

      {/* ===================== AUTOMATIC AUDIO & NOTIFICATION TOOLBAR ===================== */}
      <div className="alarm-control-toolbar">
        <div className="toolbar-left">
          <div className="toolbar-label">
            <Volume2 size={18} color="#163C24" />
            <span>EARLY-WARNING BROADCAST CONTROLS</span>
          </div>

          {/* Sound Armed Status & Toggle */}
          <button 
            onClick={handleToggleSound}
            className={`sound-toggle-pill ${isSoundArmed ? 'armed' : 'muted'}`}
            title="Toggle automated audio alarm for critical alerts"
          >
            {isSoundArmed ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{isSoundArmed ? 'Audio Alarm Armed' : 'Audio Alarm Muted'}</span>
          </button>

          {/* Volume Intensity Selector */}
          <button
            onClick={handleToggleVolumeMode}
            className="btn-toolbar-action"
            title="Toggle between Loud Emergency Siren and Standard Chime"
            style={{ fontWeight: 600, borderColor: volumeMode === 'loud' ? '#DC2626' : undefined }}
          >
            <Volume2 size={15} color={volumeMode === 'loud' ? '#DC2626' : '#4B5563'} />
            <span>{volumeMode === 'loud' ? '🚨 Loud Siren Mode' : '🔔 Standard Chime'}</span>
          </button>

          {/* Test Sound Button */}
          <button 
            onClick={handleTestSound}
            className="btn-toolbar-action"
            title="Play high-intensity emergency alarm siren (EAS 960Hz / 853Hz)"
            style={{ fontWeight: 700, background: 'rgba(220, 38, 38, 0.08)', color: '#991B1B', borderColor: '#FCA5A5' }}
          >
            <Volume2 size={15} color="#DC2626" />
            <span>🚨 Test Loud Alarm Siren</span>
          </button>

          {soundTestSuccess && (
            <span className="test-success-pill" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
              ✓ Loud Emergency Siren Active (EAS 960Hz / 853Hz)
            </span>
          )}

          {/* Desktop Notifications Button */}
          {notifPermission !== 'granted' ? (
            <button 
              onClick={handleEnableNotifications}
              className="btn-toolbar-action"
              title="Enable native desktop alerts"
            >
              <Bell size={15} />
              <span>Enable Browser Notifications</span>
            </button>
          ) : (
            <span className="notif-active-badge">
              <CheckCircle2 size={15} color="#15803D" />
              <span>Browser Notifications Active</span>
            </span>
          )}
        </div>

        {/* Safe Demo Alert Mode Button */}
        <div className="toolbar-right">
          <button 
            onClick={handleTriggerDemoAlert}
            className="btn-demo-test"
            title="Safely inject a simulation warning to test sound and notification pipeline"
          >
            <Sparkles size={16} />
            <span>🧪 Test Safe Demo Alert</span>
          </button>
        </div>
      </div>

      {/* ===================== TRUTH IN DATA: SOURCE STATUS BAR ===================== */}
      <div className="source-status-bar">
        <div className="source-bar-header">
          <Info size={15} color="#647B6A" />
          <span>DATA SOURCES &amp; INTEGRITY STATUS (ALL-INDIA)</span>
        </div>
        <div className="source-chips-row">
          <div className="source-chip">
            <span className="source-chip-name">CWC Water Portal</span>
            <span className="source-chip-badge live">● Official Benchmarks Active</span>
            <span className="source-chip-type">Measured Gauges</span>
          </div>
          <div className="source-chip">
            <span className="source-chip-name">NDMA SACHET CAP</span>
            <span className="source-chip-badge official">● Verified Alerts</span>
            <span className="source-chip-type">Official Warnings</span>
          </div>
          <div className="source-chip">
            <span className="source-chip-name">Open-Meteo Flood API</span>
            <span className="source-chip-badge live">● GloFAS Live API</span>
            <span className="source-chip-type">Modelled Predictions</span>
          </div>
          <div className="source-chip">
            <span className="source-chip-name">Open-Meteo Weather</span>
            <span className="source-chip-badge live">● Live API</span>
            <span className="source-chip-type">Weather Forecast</span>
          </div>
        </div>
      </div>

      {/* ===================== METRIC STATS ===================== */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563EB' }}>
            <Waves size={22} />
          </div>
          <div className="stat-val">{cwcStations.length || areas.length}</div>
          <div className="stat-label">Hydrological Stations Monitored</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#DC2626' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="stat-val" style={{ color: '#DC2626' }}>
            {cwcStations.filter(s => s.severity === 'red').length || redAreas.length}
          </div>
          <div className="stat-label">Danger Level Breaches (Red Alert)</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#D97706' }}>
            <ShieldAlert size={22} />
          </div>
          <div className="stat-val" style={{ color: '#D97706' }}>
            {cwcStations.filter(s => s.severity === 'yellow').length || yellowAreas.length}
          </div>
          <div className="stat-label">Warning Level Breaches (Yellow)</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#16A34A' }}>
            <Users size={22} />
          </div>
          <div className="stat-val">{residents.length}</div>
          <div className="stat-label">Registered Enrolled Citizens</div>
        </div>
      </div>

      {/* ===================== PAN-INDIA LOCATION FILTERS ===================== */}
      <div className="filters-card">
        <div className="filters-header">
          <SlidersHorizontal size={16} color="#163C24" />
          <span>FILTER ALL-INDIA BASINS &amp; HAZARD STATIONS</span>
        </div>
        <div className="filters-controls-grid">
          {/* State Filter */}
          <div className="filter-item">
            <label>State / Territory</label>
            <select 
              value={selectedState} 
              onChange={(e) => setSelectedState(e.target.value)}
              className="filter-select"
            >
              <option value="all">All India States</option>
              <option value="assam">Assam</option>
              <option value="delhi">Delhi</option>
              <option value="bihar">Bihar</option>
              <option value="andhra pradesh">Andhra Pradesh</option>
              <option value="odisha">Odisha</option>
              <option value="maharashtra">Maharashtra</option>
              <option value="uttarakhand">Uttarakhand</option>
              <option value="gujarat">Gujarat</option>
            </select>
          </div>

          {/* Basin Filter */}
          <div className="filter-item">
            <label>River Basin</label>
            <select 
              value={selectedBasin} 
              onChange={(e) => setSelectedBasin(e.target.value)}
              className="filter-select"
            >
              <option value="all">All River Basins</option>
              <option value="brahmaputra">Brahmaputra Basin</option>
              <option value="yamuna">Yamuna Basin</option>
              <option value="ganga">Ganga Basin</option>
              <option value="godavari">Godavari Basin</option>
              <option value="mahanadi">Mahanadi Basin</option>
              <option value="krishna">Krishna Basin</option>
              <option value="narmada">Narmada Basin</option>
            </select>
          </div>

          {/* Source Type Filter */}
          <div className="filter-item">
            <label>Data Classification</label>
            <select 
              value={selectedSourceType} 
              onChange={(e) => setSelectedSourceType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Data Classifications</option>
              <option value="official">Official Government Warnings (NDMA)</option>
              <option value="measured">Measured Observations (CWC Gauges)</option>
              <option value="model">Modelled Predictions (Open-Meteo GloFAS)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===================== OFFICIAL DISASTER WARNINGS (NDMA SACHET) ===================== */}
      {(selectedSourceType === 'all' || selectedSourceType === 'official') && filteredSachetAlerts.length > 0 && (
        <div className="official-alerts-section">
          <div className="section-title-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} color="#DC2626" />
              <h3>Official Disaster Warnings (NDMA SACHET CAP Feed)</h3>
            </div>
            <span className="source-tag-pill">Source: National Disaster Management Authority</span>
          </div>

          <div className="sachet-cards-grid">
            {filteredSachetAlerts.map(alert => (
              <div key={alert.sourceId} className={`sachet-alert-card ${alert.severity.toLowerCase()}`}>
                <div className="sachet-card-top">
                  <span className={`cap-severity-badge ${alert.severity.toLowerCase()}`}>
                    {alert.severity.toUpperCase()} SEVERITY
                  </span>
                  <span className="sachet-timestamp">
                    <Clock size={12} />
                    {new Date(alert.sentAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="sachet-headline">{alert.headline}</h4>
                <p className="sachet-desc">{alert.description}</p>
                <div className="sachet-instructions-box">
                  <strong>Recommended Next Steps:</strong>
                  <p>{alert.instruction}</p>
                </div>
                <div className="sachet-footer-meta">
                  <span>📍 {alert.areaDesc}</span>
                  <span>Authority: {alert.sender}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== CWC RIVER WATER-LEVEL STATIONS ===================== */}
      {(selectedSourceType === 'all' || selectedSourceType === 'measured') && (
        <div className="cwc-stations-section">
          <div className="section-title-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Waves size={20} color="#163C24" />
              <h3>CWC Hourly River Water-Level Monitoring (Measured Gauges)</h3>
            </div>
            <span className="source-tag-pill">Source: Central Water Commission (Station Danger Thresholds)</span>
          </div>

          <div className="stations-cards-grid">
            {filteredStations.map(stn => {
              const freeboard = stn.dangerLevelM - stn.measuredLevelM;
              const isOverDanger = stn.measuredLevelM >= stn.dangerLevelM;
              const isOverWarning = stn.measuredLevelM >= stn.warningLevelM;

              return (
                <div key={stn.stationId} className={`station-gauge-card ${stn.severity}`}>
                  <div className="station-card-top">
                    <div>
                      <h4 className="stn-title">{stn.stationName}</h4>
                      <span className="stn-sub">{stn.river} River • {stn.basin} Basin ({stn.state})</span>
                    </div>
                    <span className={`condition-pill ${stn.severity}`}>
                      {stn.statusLabel}
                    </span>
                  </div>

                  {/* Measured Water Level Display */}
                  <div className="level-metric-row">
                    <div className="level-current">
                      <span className="level-num">{stn.measuredLevelM.toFixed(2)}</span>
                      <span className="level-unit">m MSL</span>
                    </div>
                    <div className="level-trend">
                      <span className="trend-badge">
                        Trend: {stn.trend === 'rising' ? '↗ Rising' : stn.trend === 'falling' ? '↘ Falling' : '→ Steady'}
                      </span>
                    </div>
                  </div>

                  {/* Benchmark Comparison Meter */}
                  <div className="gauge-benchmarks-meter">
                    <div className="benchmark-bar-track">
                      <div 
                        className={`benchmark-bar-fill ${stn.severity}`}
                        style={{ width: `${Math.min(100, Math.max(15, ((stn.measuredLevelM - stn.warningLevelM + 2) / 4) * 100))}%` }}
                      ></div>
                    </div>
                    <div className="benchmark-markers">
                      <span>Warning: {stn.warningLevelM.toFixed(2)}m</span>
                      <span>Danger: {stn.dangerLevelM.toFixed(2)}m</span>
                      <span>HFL: {stn.hflM.toFixed(2)}m</span>
                    </div>
                  </div>

                  {/* Margin details */}
                  <div className="station-margin-meta">
                    <span>
                      {isOverDanger 
                        ? `⚠️ Breached Danger Mark by ${Math.abs(freeboard).toFixed(2)}m` 
                        : isOverWarning 
                        ? `Approaching Danger Mark (${freeboard.toFixed(2)}m remaining)`
                        : `Safe Margin: ${freeboard.toFixed(2)}m to Danger`}
                    </span>
                    <span className="updated-tag">
                      {new Date(stn.lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== MODELLED DISCHARGE (OPEN-METEO GLOFAS) ===================== */}
      {(selectedSourceType === 'all' || selectedSourceType === 'model') && openMeteoForecasts.length > 0 && (
        <div className="modelled-forecast-section">
          <div className="section-title-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wind size={20} color="#2563EB" />
              <h3>Open-Meteo GloFAS Modelled River Discharge &amp; Weather Forecasts</h3>
            </div>
            <span className="source-tag-pill model">Type: Modelled Prediction (GloFAS Flood Model)</span>
          </div>

          <div className="glofas-cards-grid">
            {openMeteoForecasts.map((fc, idx) => (
              <div key={idx} className="glofas-card">
                <div className="glofas-card-top">
                  <div>
                    <h4>{fc.locationName}</h4>
                    <span className="glofas-model-flag"> GloFAS Global Hydrological Prediction</span>
                  </div>
                  <span className="data-type-pill">MODEL PREDICTION</span>
                </div>

                <div className="glofas-metrics-row">
                  <div className="glofas-metric-box">
                    <span className="glofas-metric-val">
                      {fc.floodDischarge?.currentDischargeM3s ? `${fc.floodDischarge.currentDischargeM3s} m³/s` : 'Computing...'}
                    </span>
                    <span className="glofas-metric-label">Modelled Discharge (Today)</span>
                  </div>
                  <div className="glofas-metric-box">
                    <span className="glofas-metric-val">
                      {fc.weatherForecast?.rainfallTodayMm !== undefined ? `${fc.weatherForecast.rainfallTodayMm} mm` : '0.0 mm'}
                    </span>
                    <span className="glofas-metric-label">24h Rainfall Forecast</span>
                  </div>
                </div>

                {/* 7-Day Forecast Points */}
                {fc.floodDischarge?.forecast7Days && (
                  <div className="glofas-mini-table">
                    <span className="mini-table-title">7-Day Discharge Projection:</span>
                    <div className="mini-bars-row">
                      {fc.floodDischarge.forecast7Days.slice(0, 5).map((pt, pIdx) => (
                        <div key={pIdx} className="mini-bar-col">
                          <span className="mini-bar-val">{pt.dischargeM3s ? Math.round(pt.dischargeM3s) : '-'}</span>
                          <div 
                            className="mini-bar-fill"
                            style={{ height: `${Math.min(48, Math.max(12, ((pt.dischargeM3s || 1000) / 4000) * 48))}px` }}
                          ></div>
                          <span className="mini-bar-date">{pt.date.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="glofas-note">
                  * Explicit Notice: This dataset is a numerical prediction from the Copernicus GloFAS model. It is not an in-situ river gauge observation.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== REGIONAL RISK BREAKDOWN & ALGORITHMIC ESTIMATES ===================== */}
      <div className="glass-panel" style={{ padding: '28px', marginTop: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-forest-dark)' }}>
              Regional Basin Summary &amp; Algorithmic Risk Estimates
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              * Calculated scores are algorithmic estimates combining rain forecasts &amp; vulnerability. Official warnings supersede estimates.
            </p>
          </div>
          <button onClick={onNavigateToAreas} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
            <span>Manage All Basins</span>
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Basin &amp; Station</th>
                <th>Hazard</th>
                <th>Measured Level</th>
                <th>Thresholds</th>
                <th>3h Rainfall</th>
                <th>Estimated Risk</th>
                <th>Observation Type</th>
              </tr>
            </thead>
            <tbody>
              {areas.map(area => (
                <tr key={area.areaId}>
                  <td style={{ fontWeight: 700 }}>{area.name}</td>
                  <td>
                    <span className={`hazard-badge ${area.hazardType}`}>
                      {area.hazardType === 'flood' ? '🌊 Flood' : '🌫️ Smog'}
                    </span>
                  </td>
                  <td>
                    {area.riverLevel !== undefined ? (
                      <span style={{ fontWeight: 700, color: area.currentLevel === 'red' ? 'var(--risk-red-text)' : 'inherit' }}>
                        {area.riverLevel.toFixed(2)} m
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)' }}>N/A</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {area.warningLevel ? `W: ${area.warningLevel}m • D: ${area.dangerLevel}m` : 'Standard Gauge'}
                  </td>
                  <td>{area.rainfallForecast ? `${area.rainfallForecast.toFixed(1)} mm` : '0.0 mm'}</td>
                  <td>
                    <RiskBadge level={area.currentLevel} score={area.currentRiskScore} showScore />
                  </td>
                  <td>
                    <span className="table-observation-type">
                      {area.observationType || 'Station Telemetry'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

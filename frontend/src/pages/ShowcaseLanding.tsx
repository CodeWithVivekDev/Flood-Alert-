import React, { useState } from 'react';
import { 
  Play, 
  Volume2, 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Waves
} from 'lucide-react';
import { Area, Alert } from '../types';

interface ShowcaseLandingProps {
  areas: Area[];
  alerts: Alert[];
  onNavigate: (tab: string) => void;
  onQuickSubscribe?: (phone: string) => void;
}

export const ShowcaseLanding: React.FC<ShowcaseLandingProps> = ({
  areas,
  alerts,
  onNavigate,
  onQuickSubscribe
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    setSubscribeSuccess(true);
    if (onQuickSubscribe) {
      onQuickSubscribe(phoneNumber);
    }
    setTimeout(() => {
      setSubscribeSuccess(false);
      setPhoneNumber('');
    }, 5000);
  };

  const playEmergencyVoiceSiren = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (!isPlayingAudio) {
        setIsPlayingAudio(true);
        const text = "Urgent flood warning from Flood Alert. The Yamuna river water level at the Old Railway Bridge has reached 205.80 meters, exceeding the official danger mark of 205.53 meters. High risk in Yamuna Bazar and Kashmere Gate. Please move all livestock, essential medicines, and valuable documents to higher ground immediately. To repeat this message, press 1. To opt out, press 9.";
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.92;
        utter.pitch = 1.0;
        utter.onend = () => setIsPlayingAudio(false);
        utter.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utter);
      } else {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
      }
    }
  };

  // Find primary high-risk areas
  const yamunaArea = areas.find(a => a.name.toLowerCase().includes('yamuna')) || areas[0];
  const smogArea = areas.find(a => a.hazardType === 'smog') || areas[areas.length - 1];
  const yamunaLevel = yamunaArea?.riverLevel ? `${yamunaArea.riverLevel}m` : '205.80m';
  const smogScore = smogArea ? `${smogArea.name} (${smogArea.currentLevel.toUpperCase()})` : 'Anand Vihar (RED)';

  return (
    <div className="showcase-container">
      {/* ===================== HERO SECTION ===================== */}
      <section className="showcase-hero">
        <div className="hero-left-col">
          {/* Live Yamuna Flood Ticker */}
          <div className="hero-ticker-badge" onClick={() => onNavigate('areas')}>
            <span className="ticker-dot"></span>
            <span className="ticker-text">
              <strong>LIVE GAUGE:</strong> {yamunaArea?.name || 'Yamuna'} is <strong>{yamunaLevel}</strong> (Danger Mark: 205.53m) • {smogScore} • {alerts.length} Dispatches
            </span>
            <ArrowRight size={12} />
          </div>

          {/* Eyebrow Tag */}
          <div className="hero-eyebrow">
            <span className="eyebrow-icon">🌊</span>
            <span>NATIONAL FLOOD EARLY-WARNING NETWORK • ALL-INDIA BASINS</span>
          </div>

          {/* Giant Display Headline */}
          <h1 className="hero-title">
            Predict <span className="highlight-nature">Floods</span>,<br />
            Protect <span className="highlight-tomorrow">Tomorrow</span>.
          </h1>

          {/* Subtitle Aligned with Pan-India Baadh Bol */}
          <p className="hero-subtitle">
            We unite Central Water Commission (CWC) river gauges, NDMA SACHET disaster warnings, and automated AI voice broadcasts to shield riverside communities across India—from the Brahmaputra in Assam to the Ganga, Yamuna, Godavari, and Krishna basins.
          </p>

          {/* Inline Phone Registration Form */}
          <form onSubmit={handleSubscribe} className="hero-input-group">
            <input
              type="text"
              placeholder="Enter mobile number (+91 98765 43210)..."
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="hero-input"
            />
            <button type="submit" className="hero-submit-btn">
              <span>Protect Phone</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {subscribeSuccess && (
            <div className="subscribe-success-banner">
              <CheckCircle2 size={18} color="#15803D" />
              <span>Registered! You will receive automated emergency voice calls whenever floodwaters rise.</span>
            </div>
          )}

          {/* Social Proof + Audio Voice Siren Demo Button */}
          <div className="hero-social-row">
            <div className="avatar-group">
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80" alt="Assam Brahmaputra Resident" className="avatar-img" />
              <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80" alt="Delhi Yamuna Resident" className="avatar-img" />
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" alt="Bihar Ganga Resident" className="avatar-img" />
            </div>
            <div className="social-text">
              <strong>15,400+ Riverside Citizens</strong>
              <span>protected across 8 Indian river basins</span>
            </div>

            <button 
              onClick={playEmergencyVoiceSiren}
              className={`listen-story-btn ${isPlayingAudio ? 'playing' : ''}`}
              title="Click to hear Joanna's simulated emergency voice alert"
            >
              <div className="play-icon-circle">
                {isPlayingAudio ? <Volume2 size={16} color="#163C24" /> : <Play size={14} fill="#163C24" color="#163A24" />}
              </div>
              <span>{isPlayingAudio ? 'Broadcasting Alert...' : '▷ Listen Voice Siren'}</span>
            </button>
          </div>
        </div>

        {/* Hero Right Visual Column */}
        <div className="hero-right-col">
          <div className="hero-image-wrapper">
            <img 
              src="/images/hero_aerial_river.jpg" 
              alt="Yamuna & Brahmaputra Basin Aerial View" 
              className="hero-main-image"
            />
            <div className="hero-image-overlay"></div>

            {/* Floating Overlaid Frosted Cards (Pan-India Flood Aligned) */}
            <div className="floating-card floating-card-1" onClick={() => onNavigate('areas')}>
              <div className="floating-card-thumb">
                <img src="/images/mission_river.jpg" alt="Brahmaputra Telemetry" />
              </div>
              <div className="floating-card-body">
                <h4>Guwahati DC Court Gauge</h4>
                <p>Brahmaputra: 49.85m (Warning mark: 49.68m)</p>
              </div>
            </div>

            <div className="floating-card floating-card-2" onClick={() => onNavigate('test-alert')}>
              <div className="floating-card-thumb">
                <img src="/images/initiative_water.jpg" alt="NDMA SACHET CAP Alerts" />
              </div>
              <div className="floating-card-body">
                <h4>NDMA SACHET Warnings</h4>
                <p>CAP v1.2 flood sirens with automated IVR</p>
              </div>
            </div>

            <div className="floating-card floating-card-3" onClick={() => onNavigate('residents')}>
              <div className="floating-card-thumb">
                <img src="/images/mission_community.jpg" alt="Voice Alert Delivery" />
              </div>
              <div className="floating-card-body">
                <h4>Universal Voice Broadcast</h4>
                <p>Direct calls to 15,000+ basic button phones in &lt; 45s</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Bottom Metrics Row (Pan-India River Benchmarks) */}
      <div className="hero-metrics-bar">
        <div className="metric-pill-card">
          <span className="metric-pill-val">8 Basins</span>
          <span className="metric-pill-label">National River Systems Tracked</span>
        </div>
        <div className="metric-pill-divider"></div>
        <div className="metric-pill-card">
          <span className="metric-pill-val">15,400+</span>
          <span className="metric-pill-label">Enrolled Riverside Citizens</span>
        </div>
        <div className="metric-pill-divider"></div>
        <div className="metric-pill-card">
          <span className="metric-pill-val">100%</span>
          <span className="metric-pill-label">Universal Phone Ring (No App Needed)</span>
        </div>
        <div className="metric-pill-divider"></div>
        <div className="metric-pill-card">
          <span className="metric-pill-val">&lt; 45s</span>
          <span className="metric-pill-label">Emergency Siren Dispatch Latency</span>
        </div>
      </div>

      {/* ===================== MISSION SECTION ===================== */}
      <section className="showcase-mission">
        <div className="mission-left-col">
          <div className="section-eyebrow">
            <span>🛡️</span>
            <span>PAN-INDIA DISASTER DEFENSE ARCHITECTURE</span>
          </div>
          <h2 className="section-title">
            Shielding India's <span className="highlight-nature">Riverside</span> Communities Before Waters Rise.
          </h2>
          <p className="section-description">
            When upstream barrages release heavy monsoon discharge or Himalayan tributaries breach danger thresholds, hours make the difference between safe evacuation and catastrophe. Flood Alert bypasses the need for smartphones or internet by dispatching automated voice calls directly to citizens' phones, repeating critical evacuation instructions with keypress IVR.
          </p>
          <div className="mission-actions">
            <button onClick={() => onNavigate('areas')} className="btn-dark-pill">
              <span>Explore River Gauges</span>
              <ArrowRight size={16} />
            </button>
            <button onClick={() => onNavigate('test-alert')} className="btn-outline-pill">
              <span>Simulation Lab</span>
            </button>
          </div>
        </div>

        {/* 3 Tall Vertical Photographic Cards */}
        <div className="mission-right-col">
          {/* Card 1: Hydrology */}
          <div className="tall-mission-card" onClick={() => onNavigate('areas')}>
            <img src="/images/mission_river.jpg" alt="Yamuna Hydrological Telemetry" className="tall-card-bg" />
            <div className="tall-card-content">
              <div className="tall-card-icon-circle">
                <Waves size={20} color="#163C24" />
              </div>
              <h3 className="tall-card-title">Hydrological Gauges &amp; Barrage Tracking</h3>
              <p className="tall-card-desc">Real-time CWC river gauges tracking floodwaters from Hathnikund Barrage to Wazirabad &amp; Old Railway Bridge.</p>
            </div>
          </div>

          {/* Card 2: NDMA SACHET Emergency Warnings */}
          <div className="tall-mission-card" onClick={() => onNavigate('dashboard')}>
            <img src="/images/mission_climate.jpg" alt="Emergency Siren Station" className="tall-card-bg" />
            <div className="tall-card-content">
              <div className="tall-card-icon-circle">
                <Volume2 size={20} color="#163C24" />
              </div>
              <h3 className="tall-card-title">High-Decibel Siren Alarms &amp; NDMA Feeds</h3>
              <p className="tall-card-desc">Automated loud sirens and official NDMA CAP v1.2 flood alerts triggered the instant water levels breach station danger marks.</p>
            </div>
          </div>

          {/* Card 3: Voice Calls */}
          <div className="tall-mission-card" onClick={() => onNavigate('residents')}>
            <img src="/images/mission_community.jpg" alt="Grassroots Citizen Voice" className="tall-card-bg" />
            <div className="tall-card-content">
              <div className="tall-card-icon-circle">
                <Users size={20} color="#163C24" />
              </div>
              <h3 className="tall-card-title">Zero-App Voice Broadcasting</h3>
              <p className="tall-card-desc">Direct phone ring on basic handsets with IVR keypad repeat (Press 1 to repeat, Press 9 to opt out).</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== TRUST LOGO BAR ===================== */}
      <section className="showcase-trust-bar">
        <span className="trust-label">OFFICIAL TELEMETRY FEEDS &amp; ARCHITECTURAL INTEGRATIONS</span>
        <div className="trust-logos">
          <div className="trust-logo-item">
            <span className="trust-dot">●</span>
            <span>Central Water Commission (CWC)</span>
          </div>
          <div className="trust-logo-item">
            <span className="trust-dot">●</span>
            <span>NDMA SACHET (CAP v1.2 Feed)</span>
          </div>
          <div className="trust-logo-item">
            <span className="trust-dot">●</span>
            <span>Open-Meteo &amp; GloFAS Hydrology</span>
          </div>
          <div className="trust-logo-item">
            <span className="trust-dot">●</span>
            <span>State Disaster Management Authorities</span>
          </div>
          <div className="trust-logo-item">
            <span className="trust-dot">●</span>
            <span>AWS Bedrock &amp; Polly Neural</span>
          </div>
          <div className="trust-logo-item">
            <span className="trust-dot">●</span>
            <span>Automated Telephony Network</span>
          </div>
        </div>
      </section>

      {/* ===================== INITIATIVES SECTION ===================== */}
      <section className="showcase-initiatives">
        <div className="initiatives-header-row">
          <div className="section-eyebrow">
            <span>🛡️</span>
            <span>FRONTLINE HAZARD OPERATIONS</span>
          </div>
        </div>

        <div className="initiatives-grid">
          {/* Card 1: River Gauge Telemetry */}
          <div className="initiative-card">
            <div className="initiative-img-box">
              <img src="/images/initiative_water.jpg" alt="CWC Hydrological Gauge Station" />
              <span className="initiative-tag">CWC Gauge Telemetry</span>
            </div>
            <div className="initiative-body">
              <h3>Brahmaputra &amp; Yamuna Gauge Watch</h3>
              <p>Sub-meter hydrological river sensors tracking river levels across Guwahati, Delhi, and Patna hours before floodplains are submerged.</p>
              <button onClick={() => onNavigate('areas')} className="initiative-link">
                <span>View Live Water Levels</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Card 2: Barrage Discharge Monitoring */}
          <div className="initiative-card">
            <div className="initiative-img-box">
              <img src="/images/initiative_forest.jpg" alt="Barrage Sluice Gates Surge" />
              <span className="initiative-tag">Barrage Discharge Watch</span>
            </div>
            <div className="initiative-body">
              <h3>Monsoon Barrage &amp; Spillway Surge</h3>
              <p>Continuous monitoring of massive upstream barrage releases from Hathnikund, Farakka, and Dowleswaram to compute downstream lead time.</p>
              <button onClick={() => onNavigate('dashboard')} className="initiative-link">
                <span>Monitor Basin Flow</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Card 3: Community Early-Warning Sirens */}
          <div className="initiative-card">
            <div className="initiative-img-box">
              <img src="/images/initiative_community.jpg" alt="Riverside Community Early Warning" />
              <span className="initiative-tag">Civil Defense Network</span>
            </div>
            <div className="initiative-body">
              <h3>Doorstep Sirens &amp; Evacuation Alerts</h3>
              <p>Automated high-decibel phone sirens dispatched to riverside settlements, ensuring every resident receives verifiable spoken warnings in Hindi &amp; Assamese.</p>
              <button onClick={() => onNavigate('residents')} className="initiative-link">
                <span>Open Citizen Directory</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Right Column: Text & Lime Callout Card */}
          <div className="initiatives-callout-col">
            <h2 className="callout-heading">
              Real Telemetry. Real Sirens.<br />Zero Delay.
            </h2>
            <p className="callout-paragraph">
              Discover how our automated hydrology engine turns raw CWC river sensor spikes and NDMA disaster warnings into instant life-saving voice calls directly into citizens' hands.
            </p>
            <button onClick={() => onNavigate('alerts')} className="callout-text-link">
              <span>View Alert Broadcast Logs</span>
              <ArrowRight size={16} />
            </button>

            {/* The Signature Electric Lime Callout Card */}
            <div className="lime-highlight-card">
              <h3>Register for Flood Emergency Alerts</h3>
              <p>Subscribe your mobile number to receive automated early-warning voice calls and loud siren alarms whenever river levels cross official danger thresholds.</p>

              <form onSubmit={handleSubscribe} className="lime-input-row">
                <input
                  type="text"
                  placeholder="Enter mobile number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="lime-input"
                />
                <button type="submit" className="lime-submit-btn">
                  <span>Subscribe</span>
                  <ArrowRight size={14} />
                </button>
              </form>

              <div className="lime-social-footer">
                <div className="avatar-group-small">
                  <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&q=80" alt="avatar" />
                  <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=80&q=80" alt="avatar" />
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80" alt="avatar" />
                </div>
                <span>Verified for Brahmaputra, Ganga, Yamuna &amp; National River Basins</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="showcase-footer">
        <div className="footer-top-row">
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <span className="footer-brand-icon">🌊</span>
              <span className="footer-brand-name">Flood Alert</span>
            </div>
            <p className="footer-brand-desc">
              National Flood Early-Warning &amp; Disaster Alert System for India (बाढ़ बोल). Dedicated to protecting riverside communities and floodplains across major Indian river basins through automated telemetry.
            </p>
          </div>

          <div className="footer-links-col">
            <h4>Explore</h4>
            <ul>
              <li><button onClick={() => onNavigate('overview')}>Mission Overview</button></li>
              <li><button onClick={() => onNavigate('dashboard')}>Live Telemetry</button></li>
              <li><button onClick={() => onNavigate('areas')}>River Gauges</button></li>
              <li><button onClick={() => onNavigate('residents')}>Protected Directory</button></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4>Operations</h4>
            <ul>
              <li><button onClick={() => onNavigate('register')}>Register Phone</button></li>
              <li><button onClick={() => onNavigate('test-alert')}>Simulation Lab</button></li>
              <li><a href="tel:1077">Disaster Helpline (1077)</a></li>
              <li><button onClick={() => onNavigate('alerts')}>Broadcast Audits</button></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4>Benchmarks</h4>
            <ul>
              <li><a href="#warning">Guwahati Danger: 50.05m</a></li>
              <li><a href="#danger">Delhi Danger: 205.53m</a></li>
              <li><a href="#ganga">Patna Danger: 49.00m</a></li>
              <li><a href="#ndma">NDMA CAP v1.2 Protocol</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4>Emergency Response</h4>
            <div className="footer-social-icons">
              <span className="social-circle" title="Delhi Disaster Management">🏛️</span>
              <span className="social-circle" title="Central Water Commission">🌊</span>
              <span className="social-circle" title="Automated Voice Siren">📞</span>
              <span className="social-circle" title="IMD Radar">🛰️</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom-row">
          <p>© 2026 Flood Alert (बाढ़ बोल) / Delhi Disaster Resilience Initiative. Powered by AWS Cloud &amp; CWC Telemetry. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

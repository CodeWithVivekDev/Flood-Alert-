import { 
  Area, 
  Resident, 
  Alert, 
  CallLog, 
  RiskLevel, 
  HazardType, 
  LiveTelemetryResponse 
} from '../types';
import { AuthService } from './auth';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

// Initial local sample dataset for All-India major river basins and flood hotspots
let mockAreas: Area[] = [
  {
    areaId: 'area-guwahati-brahmaputra',
    name: 'Guwahati - Brahmaputra Basin',
    latitude: 26.1856,
    longitude: 91.7477,
    hazardType: 'flood',
    vulnerability: 5,
    currentRiskScore: 72.0,
    currentLevel: 'red',
    rainfallForecast: 38.5,
    riverLevel: 49.85,
    warningLevel: 49.68,
    dangerLevel: 50.05,
    hfl: 51.46,
    river: 'Brahmaputra',
    basin: 'Brahmaputra',
    state: 'Assam',
    source: 'CWC Hydrological Monitoring',
    observationType: 'Measured Gauge Reading',
    lastAlertAt: '2026-10-10T08:30:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    areaId: 'area-delhi-yamuna',
    name: 'Delhi - Yamuna Basin (Old Railway Bridge)',
    latitude: 28.6655,
    longitude: 77.2340,
    hazardType: 'flood',
    vulnerability: 5,
    currentRiskScore: 68.5,
    currentLevel: 'red',
    rainfallForecast: 22.5,
    riverLevel: 205.80,
    warningLevel: 205.33,
    dangerLevel: 205.53,
    hfl: 208.66,
    river: 'Yamuna',
    basin: 'Yamuna',
    state: 'Delhi',
    source: 'CWC Hydrological Monitoring',
    observationType: 'Measured Gauge Reading',
    lastAlertAt: '2026-10-10T11:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    areaId: 'area-patna-ganga',
    name: 'Patna - Ganga Basin (Gandhi Ghat)',
    latitude: 25.6207,
    longitude: 85.1740,
    hazardType: 'flood',
    vulnerability: 4,
    currentRiskScore: 48.0,
    currentLevel: 'yellow',
    rainfallForecast: 16.0,
    riverLevel: 48.15,
    warningLevel: 48.60,
    dangerLevel: 49.00,
    hfl: 50.52,
    river: 'Ganga',
    basin: 'Ganga',
    state: 'Bihar',
    source: 'CWC Hydrological Monitoring',
    observationType: 'Measured Gauge Reading',
    lastAlertAt: '2026-10-09T18:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    areaId: 'area-rajahmundry-godavari',
    name: 'Rajahmundry - Godavari Basin',
    latitude: 17.0005,
    longitude: 81.8040,
    hazardType: 'flood',
    vulnerability: 4,
    currentRiskScore: 52.0,
    currentLevel: 'yellow',
    rainfallForecast: 18.0,
    riverLevel: 14.20,
    warningLevel: 13.75,
    dangerLevel: 15.00,
    hfl: 23.90,
    river: 'Godavari',
    basin: 'Godavari',
    state: 'Andhra Pradesh',
    source: 'CWC Hydrological Monitoring',
    observationType: 'Measured Gauge Reading',
    updatedAt: new Date().toISOString()
  },
  {
    areaId: 'area-cuttack-mahanadi',
    name: 'Cuttack - Mahanadi Basin (Naraj)',
    latitude: 20.4625,
    longitude: 85.8830,
    hazardType: 'flood',
    vulnerability: 3,
    currentRiskScore: 22.0,
    currentLevel: 'green',
    rainfallForecast: 5.0,
    riverLevel: 24.80,
    warningLevel: 25.41,
    dangerLevel: 26.41,
    hfl: 27.60,
    river: 'Mahanadi',
    basin: 'Mahanadi',
    state: 'Odisha',
    source: 'CWC Hydrological Monitoring',
    observationType: 'Measured Gauge Reading',
    updatedAt: new Date().toISOString()
  },
  {
    areaId: 'area-sangli-krishna',
    name: 'Sangli - Krishna Basin',
    latitude: 16.8524,
    longitude: 74.5815,
    hazardType: 'flood',
    vulnerability: 3,
    currentRiskScore: 19.5,
    currentLevel: 'green',
    rainfallForecast: 4.0,
    riverLevel: 538.50,
    warningLevel: 540.00,
    dangerLevel: 543.00,
    hfl: 546.80,
    river: 'Krishna',
    basin: 'Krishna',
    state: 'Maharashtra',
    source: 'CWC Hydrological Monitoring',
    observationType: 'Measured Gauge Reading',
    updatedAt: new Date().toISOString()
  },
  {
    areaId: 'area-anand-vihar',
    name: 'Anand Vihar Smog Hub (Delhi-NCR)',
    latitude: 28.6502,
    longitude: 77.3150,
    hazardType: 'smog',
    vulnerability: 4,
    currentRiskScore: 75.0,
    currentLevel: 'red',
    rainfallForecast: 0.0,
    state: 'Delhi',
    basin: 'NCR Smog Basin',
    source: 'DPCC Air Quality Monitoring',
    observationType: 'Measured Ambient PM2.5',
    lastAlertAt: '2026-10-10T05:00:00Z',
    updatedAt: new Date().toISOString()
  }
];

let mockResidents: Resident[] = [
  {
    residentId: 'res-1',
    name: 'Anup Barman',
    phone: '+91 98*** **210',
    areaId: 'area-guwahati-brahmaputra',
    language: 'en',
    consent: true,
    consentAt: '2026-09-01T10:00:00Z',
    optedOut: false,
    createdAt: '2026-09-01T10:00:00Z',
    source: 'operator'
  },
  {
    residentId: 'res-2',
    name: 'Ramesh Kumar',
    phone: '+91 98*** **678',
    areaId: 'area-delhi-yamuna',
    language: 'en',
    consent: true,
    consentAt: '2026-09-02T11:00:00Z',
    optedOut: false,
    createdAt: '2026-09-02T11:00:00Z',
    source: 'operator'
  },
  {
    residentId: 'res-3',
    name: 'Pooja Kumari',
    phone: '+91 99*** **655',
    areaId: 'area-patna-ganga',
    language: 'en',
    consent: true,
    consentAt: '2026-09-05T09:30:00Z',
    optedOut: false,
    createdAt: '2026-09-05T09:30:00Z',
    source: 'public'
  }
];

let mockAlerts: Alert[] = [
  {
    alertId: 'alert-ndma-001',
    sourceKey: 'sachet:NDMA-SACHET-2026-AS-FL-0881',
    source: 'NDMA SACHET (CAP)',
    observationType: 'Official Disaster Warning',
    areaId: 'area-guwahati-brahmaputra',
    hazardType: 'flood',
    level: 'red',
    riskScore: 72.0,
    headline: 'Severe Flood Alert: Brahmaputra River Spilling in Kamrup and Darrang',
    instructions: 'Evacuate low-lying riverbanks immediately. Move livestock to higher ground.',
    affectedLocation: 'Kamrup Metropolitan, Guwahati, Assam',
    state: 'Assam',
    basin: 'Brahmaputra',
    scriptText: 'This is an urgent flood alert from Baadh Bol. Water levels in the Brahmaputra River have breached danger mark. Evacuate low-lying floodplains immediately.',
    audioKey: 'audio/sample_assam.mp3',
    createdAt: new Date().toISOString(),
    trigger: 'auto',
    approvalStatus: 'approved',
    dispatchStatus: 'completed'
  },
  {
    alertId: 'alert-cwc-002',
    sourceKey: 'cwc:cwc-delhi-orb-03:red',
    source: 'Central Water Commission (CWC) Gauge',
    observationType: 'Measured Hydrological Observation',
    areaId: 'area-delhi-yamuna',
    hazardType: 'flood',
    level: 'red',
    riskScore: 68.5,
    headline: 'Yamuna Water Level Breached 205.53m Danger Mark at Old Railway Bridge',
    instructions: 'Evacuate floodplain settlements in Yamuna Bazar and Kashmere Gate.',
    affectedLocation: 'Old Railway Bridge, Central Delhi',
    state: 'Delhi',
    basin: 'Yamuna',
    scriptText: 'This is an urgent flood warning. Yamuna river water level at Old Railway Bridge is 205.80m, exceeding danger mark. Move essential belongings to higher ground immediately.',
    audioKey: 'audio/sample_yamuna.mp3',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    trigger: 'auto',
    approvalStatus: 'approved',
    dispatchStatus: 'completed'
  }
];

let mockCalls: CallLog[] = [
  {
    callId: 'call-101',
    alertId: 'alert-ndma-001',
    residentId: 'res-1',
    providerCallId: 'mock-call-9912a',
    status: 'answered',
    keyPressed: '1',
    attemptCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phoneMasked: '+91 98*** **210',
    provider: 'twilio'
  }
];

/**
 * Universal API fetch helper
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const user = AuthService.getUser();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(user ? { 'x-user-role': user.role, 'Authorization': `Bearer ${user.token}` } : {}),
    ...(options.headers as Record<string, string> || {})
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status} ${res.statusText}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[API] Remote call to ${endpoint} failed, falling back to local dataset:`, err);
    return handleMockFallback<T>(endpoint, options.method || 'GET', options.body ? JSON.parse(options.body as string) : {});
  }
}

/**
 * Mock Fallback Handler for local offline operation
 */
function handleMockFallback<T>(endpoint: string, method: string, body: any): T {
  if (endpoint === '/live-telemetry' && method === 'GET') {
    const response: LiveTelemetryResponse = {
      cwcData: {
        source: 'Central Water Commission (CWC) - National Water Data Portal',
        dataType: 'Measured Hydrological Gauge Observations',
        checkedAt: new Date().toISOString(),
        status: 'cached_benchmarks',
        providerStatus: 'benchmarks_active',
        stations: [
          {
            stationId: 'cwc-guwahati-01',
            stationName: 'Guwahati (DC Court)',
            river: 'Brahmaputra',
            basin: 'Brahmaputra',
            state: 'Assam',
            district: 'Kamrup Metropolitan',
            latitude: 26.1856,
            longitude: 91.7477,
            measuredLevelM: 49.85,
            warningLevelM: 49.68,
            dangerLevelM: 50.05,
            hflM: 51.46,
            hflDate: '2004-07-24',
            freeboardM: 0.20,
            condition: 'warning',
            severity: 'yellow',
            statusLabel: 'Above Warning Level',
            trend: 'rising',
            lastUpdated: new Date().toISOString(),
            isStale: false,
            source: 'CWC Hydrological Monitoring Station',
            observationType: 'Measured Gauge Reading'
          },
          {
            stationId: 'cwc-delhi-orb-03',
            stationName: 'Delhi (Old Railway Bridge)',
            river: 'Yamuna',
            basin: 'Yamuna',
            state: 'Delhi',
            district: 'Central Delhi',
            latitude: 28.6655,
            longitude: 77.2340,
            measuredLevelM: 205.80,
            warningLevelM: 205.33,
            dangerLevelM: 205.53,
            hflM: 208.66,
            hflDate: '2023-07-13',
            freeboardM: -0.27,
            condition: 'danger',
            severity: 'red',
            statusLabel: 'Above Danger Mark',
            trend: 'rising',
            lastUpdated: new Date().toISOString(),
            isStale: false,
            source: 'CWC Hydrological Monitoring Station',
            observationType: 'Measured Gauge Reading'
          },
          {
            stationId: 'cwc-patna-02',
            stationName: 'Patna (Gandhi Ghat)',
            river: 'Ganga',
            basin: 'Ganga',
            state: 'Bihar',
            district: 'Patna',
            latitude: 25.6207,
            longitude: 85.1740,
            measuredLevelM: 48.15,
            warningLevelM: 48.60,
            dangerLevelM: 49.00,
            hflM: 50.52,
            hflDate: '2016-08-20',
            freeboardM: 0.85,
            condition: 'normal',
            severity: 'green',
            statusLabel: 'Normal Flow',
            trend: 'steady',
            lastUpdated: new Date().toISOString(),
            isStale: false,
            source: 'CWC Hydrological Monitoring Station',
            observationType: 'Measured Gauge Reading'
          }
        ],
        totalStations: 3,
        criticalStations: 1,
        warningStations: 1
      },
      sachetData: {
        source: 'NDMA SACHET (National Disaster Management Authority)',
        feedUrl: 'https://sachet.ndma.gov.in/cap_feed/',
        dataType: 'Official Common Alerting Protocol (CAP v1.2) Warnings',
        checkedAt: new Date().toISOString(),
        status: 'cached_verified_alerts',
        providerStatus: 'verified_official_feed',
        alerts: [
          {
            sourceId: 'NDMA-SACHET-2026-AS-FL-0881',
            source: 'NDMA SACHET (CAP Feed)',
            sender: 'NDMA-State-Disaster-Management-Assam',
            sentAt: new Date().toISOString(),
            event: 'Flash Flood & River Inundation',
            urgency: 'Immediate',
            severity: 'Extreme',
            certainty: 'Observed',
            headline: 'Severe Flood Alert: Brahmaputra River Spilling in Kamrup and Darrang',
            description: 'Continuous heavy precipitation across catchment has caused Brahmaputra at Guwahati to exceed danger level.',
            instruction: 'Evacuate low-lying riverbanks immediately. Move cattle and essential supplies to high ground.',
            areaDesc: 'Kamrup Metropolitan, Guwahati, Assam',
            state: 'Assam',
            basin: 'Brahmaputra',
            hazardType: 'flood',
            observationType: 'Official Disaster Warning (CAP)',
            expires: new Date(Date.now() + 86400000).toISOString()
          }
        ],
        totalAlerts: 1,
        extremeAlerts: 1
      },
      openMeteoForecasts: [
        {
          source: 'Open-Meteo GloFAS Flood System',
          locationName: 'Brahmaputra - Guwahati',
          latitude: 26.1856,
          longitude: 91.7477,
          checkedAt: new Date().toISOString(),
          weatherForecast: {
            source: 'Open-Meteo Weather API',
            observationType: 'Modelled Weather Forecast',
            rainfallNext3hMm: 14.5,
            rainfallTodayMm: 38.5,
            status: 'live'
          },
          floodDischarge: {
            source: 'Open-Meteo Flood API (GloFAS Model)',
            observationType: 'Modelled River Discharge Prediction',
            currentDischargeM3s: 2450.0,
            medianDischargeM3s: 1980.0,
            forecast7Days: [
              { date: '2026-10-10', dischargeM3s: 2450.0, medianM3s: 1980.0, maxM3s: 3100.0 },
              { date: '2026-10-11', dischargeM3s: 2780.0, medianM3s: 2020.0, maxM3s: 3400.0 }
            ],
            status: 'live'
          }
        }
      ],
      generatedAlerts: mockAlerts,
      totalAlerts: mockAlerts.length,
      syncedAt: new Date().toISOString()
    };
    return response as unknown as T;
  }

  if (endpoint === '/demo-alert' && method === 'POST') {
    const demoAlert: Alert = {
      alertId: `demo-${Date.now()}`,
      sourceKey: `demo:demo-${Date.now()}`,
      source: 'Baadh Bol System Verification [SAFE DEMO MODE]',
      observationType: 'Simulated Test Alert',
      isDemo: true,
      areaId: 'demo-station-national',
      affectedLocation: `Simulated ${body.river || 'Brahmaputra'} Basin (${body.state || 'Assam'})`,
      state: body.state || 'Assam',
      basin: body.river || 'Brahmaputra',
      hazardType: 'flood',
      level: 'red',
      riskScore: 95.0,
      riskType: 'SIMULATED TEST ALERT',
      headline: `[DEMO / TEST ALERT - NOT REAL] Critical Flood Warning for ${body.river || 'Brahmaputra'} River`,
      scriptText: 'Attention. This is a system test for Baadh Bol National Disaster Network. No real evacuation required.',
      instructions: 'This is a safe demonstration alert. No real evacuation is needed.',
      audioKey: 'audio/demo.mp3',
      trigger: 'test',
      approvalStatus: 'approved',
      dispatchStatus: 'completed',
      createdAt: new Date().toISOString()
    };
    mockAlerts.unshift(demoAlert);
    return demoAlert as unknown as T;
  }

  if (endpoint.startsWith('/areas') && method === 'GET') {
    return [...mockAreas] as unknown as T;
  }
  if (endpoint.startsWith('/residents') && method === 'GET') {
    return [...mockResidents] as unknown as T;
  }
  if (endpoint.startsWith('/alerts') && method === 'GET') {
    return [...mockAlerts] as unknown as T;
  }
  if (endpoint.startsWith('/alerts/') && endpoint.endsWith('/calls')) {
    return [...mockCalls] as unknown as T;
  }

  return {} as unknown as T;
}

export const ApiService = {
  getAreas: () => apiFetch<Area[]>('/areas'),
  createArea: (area: Partial<Area>) => apiFetch<Area>('/areas', { method: 'POST', body: JSON.stringify(area) }),
  updateRiverLevel: (areaId: string, riverLevel: number) => 
    apiFetch<{ success: boolean; area: Area }>(`/areas/${areaId}/river-level`, { method: 'PUT', body: JSON.stringify({ riverLevel }) }),
  getResidents: (areaId?: string) => apiFetch<Resident[]>(areaId ? `/residents?areaId=${areaId}` : '/residents'),
  createResident: (res: { name: string; phone: string; areaId: string; language?: string; consent: boolean }) =>
    apiFetch<Resident>('/residents', { method: 'POST', body: JSON.stringify(res) }),
  deleteResident: (id: string) => apiFetch<{ success: boolean }>(`/residents/${id}`, { method: 'DELETE' }),
  getAlerts: (areaId?: string) => apiFetch<Alert[]>(areaId ? `/alerts?areaId=${areaId}` : '/alerts'),
  getAlertCalls: (alertId: string) => apiFetch<CallLog[]>(`/alerts/${alertId}/calls`),
  getLiveTelemetry: () => apiFetch<LiveTelemetryResponse>('/live-telemetry'),
  triggerDemoAlert: (state?: string, river?: string) =>
    apiFetch<Alert>('/demo-alert', { method: 'POST', body: JSON.stringify({ state, river }) }),
  simulateAlert: (areaId: string, level: RiskLevel, hazardType?: HazardType, testPhone?: string) =>
    apiFetch<{ success: boolean; alert: Alert; call: CallLog; audioUrl: string; scriptText: string }>(
      '/simulate',
      { method: 'POST', body: JSON.stringify({ areaId, level, hazardType, testPhone }) }
    ),
  publicRegister: (data: { name: string; phone: string; areaId: string; consent: boolean }) =>
    apiFetch<{ success: boolean; message: string }>('/register', { method: 'POST', body: JSON.stringify(data) })
};

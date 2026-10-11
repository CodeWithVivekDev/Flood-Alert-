export type HazardType = 'flood' | 'smog';
export type RiskLevel = 'green' | 'yellow' | 'red';
export type OperatorRole = 'admin' | 'viewer';

export interface Area {
  areaId: string;
  name: string;
  latitude: number;
  longitude: number;
  hazardType: HazardType;
  vulnerability: number; // 1 to 5
  currentRiskScore: number;
  currentLevel: RiskLevel;
  rainfallForecast: number;
  riverLevel?: number;
  warningLevel?: number;
  dangerLevel?: number;
  hfl?: number;
  river?: string;
  basin?: string;
  state?: string;
  source?: string;
  observationType?: string;
  lastAlertAt?: string;
  updatedAt: string;
}

export interface Resident {
  residentId: string;
  name: string;
  phone: string; // Masked for privacy: +91 98*** **210
  areaId: string;
  language: string;
  consent: boolean;
  consentAt: string;
  optedOut: boolean;
  createdAt: string;
  source: string;
}

export interface Alert {
  alertId: string;
  areaId: string;
  hazardType: HazardType;
  level: RiskLevel;
  riskScore: number;
  scriptText: string;
  audioKey: string;
  createdAt: string;
  trigger: 'auto' | 'manual' | 'test';
  approvalStatus: 'approved' | 'pending';
  dispatchStatus: 'queued' | 'completed' | 'failed';
  source?: string;
  sourceKey?: string;
  observationType?: string;
  headline?: string;
  instructions?: string;
  affectedLocation?: string;
  state?: string;
  basin?: string;
  isDemo?: boolean;
  riskType?: string;
}

export interface CallLog {
  callId: string;
  alertId: string;
  residentId: string;
  providerCallId: string;
  status: 'initiated' | 'in_progress' | 'answered' | 'no_answer' | 'failed' | 'completed';
  keyPressed?: string | null;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  phoneMasked: string;
  provider: string;
}

export interface OperatorUser {
  email: string;
  role: OperatorRole;
  token?: string;
}

export interface CwcStation {
  stationId: string;
  stationName: string;
  river: string;
  basin: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  measuredLevelM: number;
  warningLevelM: number;
  dangerLevelM: number;
  hflM: number;
  hflDate: string;
  freeboardM: number;
  condition: 'normal' | 'warning' | 'danger' | 'extreme_flood';
  severity: RiskLevel;
  statusLabel: string;
  trend: 'rising' | 'falling' | 'steady';
  lastUpdated: string;
  isStale: boolean;
  source: string;
  observationType: string;
}

export interface SachetAlert {
  sourceId: string;
  source: string;
  sender: string;
  sentAt: string;
  event: string;
  urgency: string;
  severity: string;
  certainty: string;
  headline: string;
  description: string;
  instruction: string;
  areaDesc: string;
  state: string;
  basin: string;
  hazardType: string;
  observationType: string;
  expires: string;
}

export interface ForecastPoint {
  date: string;
  dischargeM3s: number | null;
  medianM3s: number | null;
  maxM3s: number | null;
}

export interface BasinForecast {
  source: string;
  locationName: string;
  latitude: number;
  longitude: number;
  checkedAt: string;
  weatherForecast: {
    source: string;
    observationType: string;
    rainfallNext3hMm: number;
    rainfallTodayMm: number;
    status: string;
    lastUpdated?: string;
  };
  floodDischarge: {
    source: string;
    observationType: string;
    currentDischargeM3s: number | null;
    medianDischargeM3s: number | null;
    forecast7Days: ForecastPoint[];
    status: string;
    lastUpdated?: string;
    modelNote?: string;
  };
}

export interface LiveTelemetryResponse {
  cwcData: {
    source: string;
    dataType: string;
    checkedAt: string;
    status: string;
    providerStatus: string;
    note?: string;
    stations: CwcStation[];
    totalStations: number;
    criticalStations: number;
    warningStations: number;
  };
  sachetData: {
    source: string;
    feedUrl: string;
    dataType: string;
    checkedAt: string;
    status: string;
    providerStatus: string;
    note?: string;
    alerts: SachetAlert[];
    totalAlerts: number;
    extremeAlerts: number;
  };
  openMeteoForecasts: BasinForecast[];
  generatedAlerts: Alert[];
  totalAlerts: number;
  syncedAt: string;
}

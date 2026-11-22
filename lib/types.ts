export type Severity = "info" | "warning" | "critical";

export type AlertKind = "flood" | "fire" | "crowding";

export type AlertSource = "open-meteo" | "firms" | "telemetry";

export type DataSourceMode = "live" | "fixture";

export interface Point {
  lat: number;
  lng: number;
}

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: Severity;
  town: string;
  message: string;
  location: Point;
  issuedAt: string;
  source: AlertSource;
}

export interface Town {
  name: string;
  location: Point;
  population: number;
}

export interface TrainState {
  location: Point;
  passengers: number;
  solarKw: number;
  batteryPct: number;
  progress: number;
}

export interface TownOccupancy {
  town: string;
  occupancyPct: number;
  alternativeTown?: string;
}

export interface TelemetryResponse {
  train: TrainState;
  occupancy: TownOccupancy[];
  updatedAt: string;
}

export interface WeatherHour {
  time: string;
  precipitationMm: number;
  windKph: number;
  temperatureC: number;
}

export interface WeatherResponse {
  town: string;
  location: Point;
  hours: WeatherHour[];
  next6hPrecipitationMm: number;
  source: DataSourceMode;
  fetchedAt: string;
}

export interface FireHotspot {
  id: string;
  location: Point;
  detectedAt: string;
  confidence: string;
  frp: number | null;
}

export interface FiresResponse {
  fires: FireHotspot[];
  source: DataSourceMode;
  fetchedAt: string;
}

export interface AlertsResponse {
  alerts: Alert[];
  generatedAt: string;
}

export interface SubscribeRequest {
  phone: string;
  town: string;
}

export interface SubscribeResponse {
  ok: true;
  phone: string;
  town: string;
}

export interface Subscriber {
  phone: string;
  town: string;
  subscribedAt: string;
}

export interface NotifyRequest {
  alert: Alert;
}

export interface NotifyResponse {
  recipients: number;
  sent: number;
  failed: number;
}

export interface ErrorResponse {
  error: string;
}

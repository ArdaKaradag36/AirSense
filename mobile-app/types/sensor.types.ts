export type AirQualityStatus =
  | "GOOD"
  | "MODERATE"
  | "UNHEALTHY"
  | "HAZARDOUS"
  | "UNKNOWN";

export interface SensorData {
  id?: number;
  temperature: number;
  humidity: number;
  co2_ppm: number;
  voc_index: number;
  air_quality_status: AirQualityStatus;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  received_at: string;
}

export interface SensorHistoryParams {
  serialNumber: string;
  limit?: number;
  period?: string;
}

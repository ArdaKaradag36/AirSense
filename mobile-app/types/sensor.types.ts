export interface SensorData {
  id?: number;
  temperature: number;
  humidity: number;
  co2_ppm: number;
  voc_index: number;
  air_quality_status: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  fullName?: string;
  createdAt: string;
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

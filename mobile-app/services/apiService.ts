import { API_BASE_URL } from "../constants/api";
import { supabase } from "./supabaseClient";
import { AirQualityStatus, SensorData, SensorHistoryParams } from "../types/sensor.types";

const VALID_AIR_QUALITY_STATUSES: readonly AirQualityStatus[] = [
  "GOOD",
  "MODERATE",
  "UNHEALTHY",
  "HAZARDOUS",
  "UNKNOWN",
];

const toAirQualityStatus = (value: unknown): AirQualityStatus => {
  const candidate = String(value ?? "UNKNOWN").toUpperCase();
  return (VALID_AIR_QUALITY_STATUSES as readonly string[]).includes(candidate)
    ? (candidate as AirQualityStatus)
    : "UNKNOWN";
};

/**
 * Loose Coupling Mimari Notu:
 * Uygulamadaki veri erişim katmanı tek bir serviste tutulur.
 * UI ve Context katmanları "hangi protokol" (HTTP/MQTT) veya "hangi backend" (Supabase/TimescaleDB)
 * kullanıldığını bilmez; sadece bu servis fonksiyonlarını çağırır.
 */
const BASE_URL = `${API_BASE_URL}/api/v1`;

const DEFAULT_FETCH_MS = 20_000;

const REGISTER_TOKEN_URL = `${BASE_URL}/register-token`;
const UNREGISTER_TOKEN_URL = `${BASE_URL}/unregister-token`;

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_FETCH_MS
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Aktif Supabase oturumunun JWT access token'ını döndürür.
 * Oturum yoksa veya süresi dolmuşsa null döner; çağıran katman 401 alır.
 */
async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Kimlik doğrulaması gerektiren istekler için Authorization: Bearer başlığını ekler.
 * Token alınamazsa 401 simüle eden bir hata fırlatır; sessizce geçmez.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın. (401)");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const mapSensorData = (item: any): SensorData => ({
  id: item.id,
  temperature: Number(item.temperature ?? 0),
  humidity: Number(item.humidity ?? 0),
  co2_ppm: Number(item.co2_ppm ?? 0),
  voc_index: Number(item.voc_index ?? 0),
  air_quality_status: toAirQualityStatus(item.air_quality_status),
  created_at: String(item.created_at ?? ""),
});

const periodToSinceIso = (period?: string): string | null => {
  if (!period) return null;
  const now = Date.now();
  const offsets: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  };
  const ms = offsets[period];
  if (!ms) return null;
  return new Date(now - ms).toISOString();
};

export const apiService = {
  /** Sensör geçmişi — doğrudan Supabase (RLS); telefon LAN API’sine bağlı değil. */
  async getHistory(params: SensorHistoryParams): Promise<SensorData[]> {
    const limit = params.limit ?? 20;
    let query = supabase
      .from("sensor_readings")
      .select(
        "id, temperature, humidity, co2_ppm, voc_index, air_quality_status, created_at"
      )
      .eq("device_serial", params.serialNumber)
      .order("created_at", { ascending: false })
      .limit(limit);

    const since = periodToSinceIso(params.period);
    if (since) {
      query = query.gte("created_at", since);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Supabase history failed: ${error.message}`);
    }
    return (data ?? []).map(mapSensorData);
  },

  async getLatestData(serialNumber: string): Promise<SensorData | null> {
    const history = await this.getHistory({ serialNumber, limit: 1 });
    return history.length > 0 ? history[0] : null;
  },

  async registerPushToken(token: string): Promise<void> {
    const headers = await authHeaders();
    const response = await fetchWithTimeout(REGISTER_TOKEN_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      throw new Error(`Register token failed with status ${response.status}`);
    }
  },

  async unregisterPushToken(token: string): Promise<void> {
    const headers = await authHeaders();
    const response = await fetchWithTimeout(UNREGISTER_TOKEN_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      throw new Error(`Unregister token failed with status ${response.status}`);
    }
  },
};

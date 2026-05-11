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

const HISTORY_URL        = `${BASE_URL}/history`;
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

export const apiService = {
  async getHistory(params: SensorHistoryParams): Promise<SensorData[]> {
    const query = new URLSearchParams({ serial_number: params.serialNumber });
    if (params.limit)  query.append("limit",  String(params.limit));
    if (params.period) query.append("period", params.period);

    const headers = await authHeaders();
    const response = await fetchWithTimeout(`${HISTORY_URL}?${query.toString()}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`History request failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) return [];
    return payload.map(mapSensorData);
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

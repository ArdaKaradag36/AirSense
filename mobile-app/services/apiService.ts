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
 * Ortam degiskeni notu:
 * Expo istemci tarafinda sadece `EXPO_PUBLIC_` prefix'i ile baslayan degiskenleri okur.
 * Bu nedenle API adresini `.env` icindeki `EXPO_PUBLIC_API_URL` ile yonetiyoruz.
 * Yeni bir bilgisayara gecildiginde veya IP degistiginde sadece `.env` dosyasini guncellemek yeterlidir.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
const HISTORY_URL = `${BASE_URL}/history`;
const REGISTER_TOKEN_URL = `${BASE_URL}/register-token`;
const UNREGISTER_TOKEN_URL = `${BASE_URL}/unregister-token`;

const mapSensorData = (item: any): SensorData => ({
  id: item.id,
  temperature: Number(item.temperature ?? 0),
  humidity: Number(item.humidity ?? 0),
  co2_ppm: Number(item.co2_ppm ?? 0),
  voc_index: Number(item.voc_index ?? 0),
  air_quality_status: toAirQualityStatus(item.air_quality_status),
  created_at: String(item.created_at ?? ""),
});

/**
 * Loose Coupling Mimari Notu:
 * Uygulamadaki veri erişim katmanı tek bir serviste tutulur.
 * UI ve Context katmanları "hangi protokol" (HTTP/MQTT) veya "hangi backend" (Supabase/TimescaleDB)
 * kullanıldığını bilmez; sadece bu servis fonksiyonlarını çağırır.
 * Böylece yarın teknoloji değiştiğinde sadece servis implementasyonu güncellenir,
 * ekranlar ve iş akışı bozulmadan çalışmaya devam eder.
 */
export const apiService = {
  // Bu fonksiyon servis katmanında tanımlanmıştır; yarın MQTT/Supabase entegrasyonu değişse bile çağıran katman aynı kalır.
  async getHistory(params: SensorHistoryParams): Promise<SensorData[]> {
    const query = new URLSearchParams({
      serial_number: params.serialNumber,
    });
    // Gelecek hazirligi: Kullanici bazli veri izolasyonu aktif edildiginde buraya `user_id` query param'i eklenecek.
    // Ornek: query.append("user_id", currentUserId);

    if (params.limit) {
      query.append("limit", String(params.limit));
    }
    if (params.period) {
      query.append("period", params.period);
    }

    const response = await fetch(`${HISTORY_URL}?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`History request failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) return [];
    return payload.map(mapSensorData);
  },

  // Dashboard gibi ekranlar doğrudan backend'e gitmez; bu hazır fonksiyonla son ölçümü alır.
  async getLatestData(serialNumber: string): Promise<SensorData | null> {
    // Gelecek hazirligi: `getHistory` user_id filtresi aldiginda bu fonksiyon da ayni filtreyi transparent sekilde iletecek.
    const history = await this.getHistory({ serialNumber, limit: 1 });
    return history.length > 0 ? history[0] : null;
  },

  // Push token kayıt/silme çağrılarını da merkezi servis katmanına alıyoruz.
  async registerPushToken(token: string): Promise<void> {
    const response = await fetch(REGISTER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error(`Register token failed with status ${response.status}`);
    }
  },

  async unregisterPushToken(token: string): Promise<void> {
    const response = await fetch(UNREGISTER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error(`Unregister token failed with status ${response.status}`);
    }
  },
};

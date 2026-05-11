# AirSense IoT — Mimari Sözleşme

> **Sürüm:** Sprint-1 (Mayıs 2026)  
> **Durum:** Aktif — her yapısal değişiklik bu dokümanı güncellemelidir.

---

## 1. Sistem Genel Görünümü

```
┌───────────────────┐     HTTP POST /api/v1/data      ┌──────────────────────────┐
│  ESP32 Firmware   │  ──(x-api-key header)──────────▶ │  FastAPI Backend         │
│  (C++/PlatformIO) │                                   │  (Python / Uvicorn)      │
│                   │  USB Serial fallback              │                          │
│  Sensörler:       │ ─────────────────────────────▶   │  • Veri doğrulama        │
│  • DHT11          │   (usb_bridge.py okur)            │  • MQ135→VOC/CO2 türetme │
│  • MQ-135         │                                   │  • Supabase insert       │
│  • [Plan: SCD40,  │                                   │  • Expo Push tetikleme   │
│     SGP40]        │                                   └──────────┬───────────────┘
└───────────────────┘                                              │
                                                                   │ supabase-py
                                                                   ▼
                                                    ┌──────────────────────────┐
                                                    │  Supabase (PostgreSQL)   │
                                                    │  • sensor_readings       │
                                                    │  • devices               │
                                                    │  • users (public)        │
                                                    │  • mobile_clients        │
                                                    │  • Auth (JWT)            │
                                                    └──────────┬───────────────┘
                                                               │ supabase-js (anon)
                                                               ▼
                                            ┌──────────────────────────────────┐
                                            │  React Native (Expo)             │
                                            │  • AuthContext (Supabase Auth)   │
                                            │  • SensorContext (polling 10 s)  │
                                            │  • apiService (HTTP + JWT)       │
                                            │  • deviceService (Supabase RPC)  │
                                            └──────────────────────────────────┘
```

---

## 2. Güvenlik Modeli (Sprint-1 Sonrası)

### 2.1 Kimlik Doğrulama Katmanları

| Aktör | Mekanizma | Korunan Endpoint |
|---|---|---|
| ESP32 Cihazı | `x-api-key` başlığı (AIRSENSE_API_SECRET) | `POST /api/v1/data` |
| Mobil Kullanıcı | `Authorization: Bearer <Supabase JWT>` | `GET /api/v1/history`, `POST /api/v1/register-token`, `POST /api/v1/unregister-token` |
| Supabase SDK (Mobil) | Supabase anon key + RLS politikaları | Doğrudan Supabase tabloları |

### 2.2 Secret Management Kuralları

- **Firmware:** Tüm kimlik bilgileri `hardware/src/secrets.h` içinde tutulur. Bu dosya `.gitignore`'dadır; şablon `secrets.h.example` olarak repo'da bulunur.
- **Backend:** Tüm secretlar `backend/.env` içinde ENV değişkeni olarak tutulur. `.gitignore` ile korunur. `AIRSENSE_API_SECRET` eksikse backend başlamayı reddeder.
- **Mobil:** `EXPO_PUBLIC_` değişkenleri `mobile-app/.env` içinde tutulur; service role key veya API secret asla mobil bundle'a dahil edilmez.

### 2.3 CORS Politikası

- `ALLOWED_ORIGINS` ENV değişkeni ile tanımlanır.
- **Wildcard (`*`) production'da yasaktır.**
- Boş bırakılırsa yalnızca `localhost` portlarına izin verilir (geliştirme fallback).

---

## 3. Katman Mimarisi ve Sorumluluklar

```
mobile-app/
├── app/              ← Yalnızca UI mantığı; veri çekmez, hook'ları kullanır
├── context/          ← Durum yönetimi; servis katmanını çağırır
│   ├── AuthContext   ← Supabase oturumu, kullanıcı kimliği
│   └── SensorContext ← Sensör verisi, bildirim durumu, polling
├── services/         ← Tüm I/O buraya kilitli; UI katmanı protokol bilmez
│   ├── apiService    ← Backend HTTP çağrıları (JWT bearer ekler)
│   ├── authService   ← Supabase Auth sarmalayıcı
│   ├── deviceService ← Cihaz zimmetleme, seri no doğrulama
│   └── supabaseClient← Supabase istemci başlatma + safeStorage
└── types/            ← Paylaşılan TypeScript arayüzleri
```

**Kural:** `app/` altındaki dosyalar hiçbir zaman `fetch()`, `supabase.from()` veya `HTTPClient` çağrısı yapmaz. Tüm ağ işlemleri `services/` katmanına delege edilir.

---

## 4. Veri Akışı ve İş Kuralları

### 4.1 Sensör Verisi Hattı

```
ESP32 sensör oku
  → JSON paketle (serial_number, temperature, humidity, mq135_value)
  → HTTP POST /api/v1/data [x-api-key]
  → Backend: MQ135 → VOC index + yaklaşık CO2 ppm türet
  → calculate_status() → GOOD / MODERATE / UNHEALTHY / HAZARDOUS
  → Supabase sensor_readings INSERT
  → HAZARDOUS ise mobile_clients tablosundan Expo token çek → Push bildirim gönder
```

### 4.2 MQ-135 Dönüşüm Skalası (Geçici — SCD40/SGP40 entegrasyonuna kadar)

| MQ-135 ADC | VOC Index | Durum |
|---|---|---|
| 0 – 599 | 0 – 99 | GOOD |
| 600 – 899 | 100 – 199 | MODERATE |
| 900 – 1199 | 200 – 299 | UNHEALTHY |
| ≥ 1200 | 300 – 500 | HAZARDOUS |

> **Not:** Bu dönüşüm ampirik bir tahmindir; SCD40+SGP40 geçişinde `mq135_to_voc_index()` ve `mq135_to_approx_co2_ppm()` fonksiyonları kaldırılacak, donanım doğrudan değerleri iletecektir.

### 4.3 Cihaz Sahipliği Modeli

- Her cihaz `devices` tablosunda `serial_number` (unique) + `user_id` (nullable FK) ile kayıtlıdır.
- Yeni kullanıcı kaydında `user_id = NULL` olan cihaz zimmetlenir (`claimDevice`).
- Backend `/api/v1/history` endpoint'i: Kullanıcı yalnızca `devices.user_id = auth.uid` olan cihazın verisine erişebilir.

---

## 5. Firmware Sözleşmesi

### Zorunlu JSON Yapısı (POST /api/v1/data gövdesi)

```json
{
  "serial_number": "AIRSENSE-PRO-XXX",
  "temperature": 22.5,
  "humidity": 55.0,
  "mq135_value": 750,
  "co2_ppm": null,
  "voc_index": null
}
```

- `serial_number` — `devices` tablosundaki kayıtlı seri numarasıyla eşleşmeli.
- `mq135_value` **veya** `co2_ppm`/`voc_index` gönderilmelidir; ikisi de null ise `status = UNKNOWN` döner.
- Header: `x-api-key: <AIRSENSE_API_SECRET>` — eksikse `401` döner.

### Firmware Tasarım Kuralları

- `loop()` içinde `delay()` **yasaktır.** Tüm zamanlama `millis()` ile non-blocking yapılır.
- Wi-Fi bağlantı kaybında USB serial yayını devam eder; `usb_bridge.py` bu çıktıyı okuyarak backend'e iletebilir.
- Buzzer alarmı doğrudan `loop()` içinde sürülmez; Sprint-2'de Ticker kütüphanesi ile bağımsız hale getirilecektir.

---

## 6. Bilinen Teknik Borçlar ve Sprint Planı

| ID | Açıklama | Etki | Sprint |
|---|---|---|---|
| TD-01 | HTTP cleartext transport | CRITICAL | Sprint-2 |
| TD-02 | Sabit 10 s polling → WebSocket/Supabase Realtime | HIGH | Sprint-2 |
| TD-03 | Rate limiting (POST /api/v1/data) | HIGH | Sprint-2 |
| TD-04 | MQ-135 → SCD40+SGP40 donanım geçişi | MEDIUM | Sprint-3 |
| TD-05 | Firmware Buzzer → Ticker non-blocking | LOW | Sprint-2 |
| TD-06 | Supabase RLS politikalarını sıkılaştır (sensor_readings) | HIGH | Sprint-2 |

### Sprint-2 Öncelikleri (Sıralı)

1. **HTTPS/TLS** — Backend'i reverse proxy (nginx + Let's Encrypt) veya Railway/Fly.io'ya taşı.
2. **Supabase Realtime** — Mobil polling'i `supabase.channel()` aboneliğiyle değiştir; pil ve bandwidth tasarrufu.
3. **Rate Limiting** — FastAPI `slowapi` ile `/api/v1/data` endpoint'ine IP bazlı limit ekle.
4. **RLS Politikaları** — `sensor_readings` tablosuna `user_id` kolonu ekle veya `devices` join politikası yaz.

---

## 7. Yerel Geliştirme Ortamı Kurulumu

### Backend

```bash
cd backend
cp .env.example .env          # Gerçek değerleri doldur
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Firmware

```bash
cd hardware
cp src/secrets.h.example src/secrets.h   # Gerçek Wi-Fi + API key bilgilerini gir
pio run --target upload
```

### Mobile

```bash
cd mobile-app
cp .env.example .env          # Supabase URL + anon key + backend IP gir
npm install
npx expo start
```

---

## 8. Mimari Karar Geçmişi

| Tarih | Karar | Gerekçe |
|---|---|---|
| 2026-05 | Backend `/history` endpoint'i JWT ile korundu | Herkesin serial number tahmin ederek veri çekebilmesi |
| 2026-05 | Firmware secrets.h pattern benimsendi | WiFi şifresi ve API key git geçmişine girmesin |
| 2026-05 | CORS wildcard kaldırıldı | Credential bearing isteklerde wildcard origin XSS riski |
| 2026-05 | `delay()` kaldırıldı, `millis()` non-blocking loop | ESP32 enerji verimliliği ve watchdog tetiklemesi |

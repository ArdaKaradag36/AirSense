#include <Arduino.h>
#include "DHT.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Kimlik bilgileri secrets.h'tan gelir — bu dosya .gitignore'dadır.
// Kopya: hardware/src/secrets.h.example -> hardware/src/secrets.h
#include "secrets.h"

// --- DONANIM AYARLARI ---
#define DHTPIN      4
#define DHTTYPE     DHT11
#define MQ135_PIN   34
#define BUZZER_PIN  13

// --- KALIBRASYON ---
constexpr float SICAKLIK_SAPMASI = 5.0f;
constexpr int   GAZ_ESIK         = 1200;

// --- ZAMANLAMA (non-blocking) ---
constexpr unsigned long OLCUM_ARALIK_MS  = 10000UL;  // 10 sn — delay() kullanilmiyor
constexpr unsigned long WIFI_RETRY_MS    = 30000UL;  // 30 sn sonra yeniden bag. denemesi
constexpr unsigned long HTTP_TIMEOUT_MS  = 8000UL;

// --- GLOBAL DURUM ---
DHT dht(DHTPIN, DHTTYPE);
String serverUrl;

unsigned long sonOlcumZamani  = 0;
unsigned long sonWifiDenemesi = 0;
bool buzzerAktif              = false;

// -------------------------------------------------------
// YARDIMCI: Wi-Fi baglantisini kur (blocking yalnizca setup'ta)
// -------------------------------------------------------
void wifiBaglan() {
  Serial.printf("WiFi Baglaniyor: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int deneme = 0;
  while (WiFi.status() != WL_CONNECTED && deneme < 20) {
    delay(500);
    Serial.print(".");
    deneme++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi Baglandi! IP: %s\n", WiFi.localIP().toString().c_str());
    digitalWrite(BUZZER_PIN, HIGH); delay(100); digitalWrite(BUZZER_PIN, LOW);
  } else {
    Serial.println("WiFi Baglantisi Basarisiz — USB serial fallback aktif.");
  }
}

// -------------------------------------------------------
// YARDIMCI: Sensor olusumu gonder
// -------------------------------------------------------
void httpGonder(const String& jsonVerisi) {
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", DEVICE_API_KEY);

  int kod = http.POST(jsonVerisi);
  if (kod > 0) {
    Serial.printf("HTTP %d — veri gonderildi.\n", kod);
  } else {
    Serial.printf("HTTP hatasi: %d\n", kod);
  }
  http.end();
}

// -------------------------------------------------------
// SETUP
// -------------------------------------------------------
void setup() {
  Serial.begin(115200);

  dht.begin();
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Server URL'yi runtime'da bir kez olustur
  serverUrl = String("http://") + SERVER_HOST + ":" + SERVER_PORT + "/api/v1/data";

  wifiBaglan();
  sonWifiDenemesi = millis();
}

// -------------------------------------------------------
// LOOP — tamamen non-blocking; delay() YOK
// -------------------------------------------------------
void loop() {
  unsigned long simdi = millis();

  // Wi-Fi kopuk ve yeniden deneme suresi gectiyse
  if (WiFi.status() != WL_CONNECTED && (simdi - sonWifiDenemesi >= WIFI_RETRY_MS)) {
    Serial.println("WiFi Kopuk — yeniden baglaniliyor...");
    WiFi.reconnect();
    sonWifiDenemesi = simdi;
  }

  // Olcum zamani geldiyse sensoru oku ve gonder
  if (simdi - sonOlcumZamani >= OLCUM_ARALIK_MS) {
    sonOlcumZamani = simdi;

    float nem          = dht.readHumidity();
    float ham_sicaklik = dht.readTemperature();
    int   ham_gaz      = analogRead(MQ135_PIN);

    if (isnan(nem) || isnan(ham_sicaklik)) {
      Serial.println("DHT11 okunamadi — varsayilan deger kullaniliyor.");
      nem = 0.0f;
      ham_sicaklik = 0.0f;
    }

    // --- ALARM MANTIĞI ---
    bool tehlike = (ham_gaz > GAZ_ESIK);
    if (tehlike && !buzzerAktif) {
      Serial.println("!!! TEHLIKE: YUKSEK HAVA KIRLILIGI !!!");
      buzzerAktif = true;
    } else if (!tehlike && buzzerAktif) {
      buzzerAktif = false;
    }
    // Buzzer'i dogrudan millis() ile surmek yerine basit HIGH/LOW;
    // gercek non-blocking bip icin Ticker kutuphanesi onerilir (Sprint-2).
    digitalWrite(BUZZER_PIN, tehlike ? HIGH : LOW);

    float gercek_sicaklik = ham_sicaklik - SICAKLIK_SAPMASI;

    // --- JSON PAKETLEME ---
    StaticJsonDocument<200> doc;
    doc["serial_number"] = DEVICE_ID;
    doc["temperature"]   = gercek_sicaklik;
    doc["humidity"]      = nem;
    doc["mq135_value"]   = ham_gaz;

    String jsonVerisi;
    serializeJson(doc, jsonVerisi);

    // USB serial — WiFi olmasa bile Python bridge okur
    Serial.println("DATA:" + jsonVerisi);

    // HTTP gonder (sadece WiFi varsa)
    if (WiFi.status() == WL_CONNECTED) {
      httpGonder(jsonVerisi);
    }
  }
}

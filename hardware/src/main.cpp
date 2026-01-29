#include <Arduino.h>
#include "DHT.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- KULLANICI AYARLARI (LÜTFEN DOLDUR) ---
// BURAYA DİKKAT: Evindeki Wi-Fi adını ve şifresini tırnakların içine yazmalısın.
const char* WIFI_SSID = "TurkTelekom_TA735";      // Örn: Superonline_WiFi
const char* WIFI_PASS = "ardaanil0636";    // Örn: 12345678

// Bilgisayarının IP Adresi (ipconfig'den aldığımız adres)
String SERVER_IP = "192.168.1.101"; 

// --- BACKEND GÜVENLİK AYARLARI ---
const char* API_KEY = "airsense-2025-secure-key-v1"; // Backend'deki şifreyle AYNI
const char* DEVICE_ID = "ESP32_SALON_01";            // Bu cihazın kimliği

// --- DONANIM AYARLARI ---
#define DHTPIN 4
#define DHTTYPE DHT11
#define MQ9_PIN 34
String SERVER_URL = "http://" + SERVER_IP + ":8000/api/v1/data"; // Backend adresi

// Kalibrasyon
float sicaklik_sapmasi = 5.0; 
int gaz_esik_degeri = 1200;

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  
  dht.begin();

  // Wi-Fi Bağlantısı
  Serial.print("WiFi Baglaniyor: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int deneme = 0;
  while (WiFi.status() != WL_CONNECTED && deneme < 20) {
    delay(500);
    Serial.print(".");
    deneme++;
  }
  
  if(WiFi.status() == WL_CONNECTED){
    Serial.println("\nWiFi Baglandi! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Baglantisi Basarisiz! (Isim/Sifre kontrol et)");
  }
}

void loop() {
  delay(3000); // 3 saniyede bir veri gönder

  float nem = dht.readHumidity();
  float ham_sicaklik = dht.readTemperature();
  int ham_gaz = analogRead(MQ9_PIN);

  if (isnan(nem) || isnan(ham_sicaklik)) {
    Serial.println("Sensör Okuma Hatası!");
    return;
  }

  // Kalibrasyon
  float gercek_sicaklik = ham_sicaklik - sicaklik_sapmasi;

  // --- JSON PAKETLEME (Backend Modeline Uygun) ---
  StaticJsonDocument<200> doc;
  doc["serial_number"] = DEVICE_ID;     // Backend: serial_number
  doc["temperature"] = gercek_sicaklik; // Backend: temperature
  doc["humidity"] = nem;                // Backend: humidity
  doc["mq9_value"] = ham_gaz;           // Backend: mq9_value (İsim eşleşmeli!)

  String jsonVerisi;
  serializeJson(doc, jsonVerisi);

  // --- SERVER'A GÖNDERME ---
  if(WiFi.status() == WL_CONNECTED){
    HTTPClient http;
    http.begin(SERVER_URL);
    
    // Header Ayarları
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", API_KEY); // Güvenlik anahtarı
    
    int httpResponseCode = http.POST(jsonVerisi);
    
    if(httpResponseCode > 0){
      String response = http.getString();
      Serial.print("Gönderildi (Gaz: ");
      Serial.print(ham_gaz);
      Serial.print(") -> Sunucu Cevabı: ");
      Serial.println(httpResponseCode); // 200 ise başarılı
    } else {
      Serial.print("HATA KODU: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("WiFi Kopuk!");
    WiFi.reconnect();
  }
}
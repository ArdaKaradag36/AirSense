#include <Arduino.h>
#include "DHT.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- KULLANICI AYARLARI ---
const char* WIFI_SSID = "TurkTelekom_TA735";
const char* WIFI_PASS = "ardaanil0636";

// Bilgisayarının IP Adresi
String SERVER_IP = "192.168.1.104"; 

// --- BACKEND GÜVENLİK AYARLARI ---
const char* API_KEY = "airsense-2025-secure-key-v1";
const char* DEVICE_ID = "ESP32_SALON_01";

// --- DONANIM AYARLARI ---
#define DHTPIN 4
#define DHTTYPE DHT11
// DÜZELTME 1: Pin ismini güncelledik (Eskisi MQ9_PIN idi)
#define MQ135_PIN 34     // MQ-135 burada takılı (Analog Giriş)
#define BUZZER_PIN 13    // Buzzer Pini (D13)

String SERVER_URL = "http://" + SERVER_IP + ":8000/api/v1/data";

// Kalibrasyon ve Alarm Eşiği
float sicaklik_sapmasi = 5.0; 
int gaz_esik_degeri = 1200; // Gaz değeri bunu geçerse Buzzer öter!

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  
  // Donanımları Başlat
  dht.begin();
  pinMode(BUZZER_PIN, OUTPUT);     // Buzzer çıkış olarak ayarlandı
  digitalWrite(BUZZER_PIN, LOW);   // Başlangıçta sussun

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
    // Bağlantı başarılı olunca kısa bir "Bip" sesi verelim
    digitalWrite(BUZZER_PIN, HIGH); delay(100); digitalWrite(BUZZER_PIN, LOW);
  } else {
    Serial.println("\nWiFi Baglantisi Basarisiz! (Isim/Sifre kontrol et)");
  }
}

void loop() {
  // Sensörleri Oku
  float nem = dht.readHumidity();
  float ham_sicaklik = dht.readTemperature();
  
  // DÜZELTME 2: Okuma yaptığımız değişkenin ve pinin adını düzelttik
  int ham_gaz = analogRead(MQ135_PIN); 

  if (isnan(nem) || isnan(ham_sicaklik)) {
    Serial.println("Sensör Okuma Hatası!");
    return;
  }

  // --- ALARM MANTIĞI ---
  // Eğer gaz değeri eşiği (1200) geçerse alarm çalsın
  if (ham_gaz > gaz_esik_degeri) {
    Serial.println("!!! TEHLİKE: YÜKSEK HAVA KİRLİLİĞİ !!!");
    // Kesik kesik öttür (Bip-Bip-Bip)
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
  } else {
    // Değer normalse sus
    digitalWrite(BUZZER_PIN, LOW);
  }
  // ------------------------------------

  // Kalibrasyon
  float gercek_sicaklik = ham_sicaklik - sicaklik_sapmasi;

  // --- JSON PAKETLEME ---
  StaticJsonDocument<200> doc;
  doc["serial_number"] = DEVICE_ID;
  doc["temperature"] = gercek_sicaklik;
  doc["humidity"] = nem;
  
  // DÜZELTME 3 (EN ÖNEMLİSİ): Backend artık bu ismi bekliyor!
  doc["mq135_value"] = ham_gaz; 

  String jsonVerisi;
  serializeJson(doc, jsonVerisi);

  // --- SERVER'A GÖNDERME ---
  if(WiFi.status() == WL_CONNECTED){
    HTTPClient http;
    
    // Timeout ayarı korundu (-11 hatası almamak için)
    http.setTimeout(10000); 
    
    http.begin(SERVER_URL);
    
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", API_KEY);
    
    int httpResponseCode = http.POST(jsonVerisi);
    
    if(httpResponseCode > 0){
      String response = http.getString();
      Serial.print("Gönderildi (MQ-135: "); // Log yazısını da düzelttik
      Serial.print(ham_gaz);
      Serial.print(") -> Sunucu Cevabı: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("HATA KODU: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("WiFi Kopuk! Tekrar bağlanılıyor...");
    WiFi.reconnect();
  }
  
  // Döngü gecikmesi
  delay(2500); 
}
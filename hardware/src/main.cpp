#include <Arduino.h>
#include "DHT.h"

// --- AYARLAR ---
#define DHTPIN 4
#define DHTTYPE DHT11
#define MQ9_PIN 34

// KALİBRASYON AYARLARI
float sicaklik_sapmasi = 5.0; // Isınma kaynaklı sapma (Ofset)
int gaz_esik_degeri = 1200;   // Alarm sınırı

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  Serial.println("AirSense Donanim Baslatiliyor...");
  dht.begin();
}

void loop() {
  delay(1000); // 1 saniye bekle

  // 1. Verileri Oku
  float nem = dht.readHumidity();
  float ham_sicaklik = dht.readTemperature();
  int ham_gaz = analogRead(MQ9_PIN);

  // 2. Kalibrasyon (Düzeltme)
  float gercek_sicaklik = ham_sicaklik - sicaklik_sapmasi;

  // 3. Gaz Durumu
  String gaz_durumu = "TEMIZ";
  if (ham_gaz > 800 && ham_gaz < 1500) gaz_durumu = "ORTA (Duman)";
  if (ham_gaz >= 1500) gaz_durumu = "TEHLIKE";

  // 4. Yazdır (Seri Port / İleride Backend'e gidecek)
  if (isnan(nem) || isnan(ham_sicaklik)) {
    Serial.println("Sensör Hatası!");
  } else {
    Serial.print("Nem: %"); Serial.print(nem);
    Serial.print(" | Sicaklik: "); Serial.print(gercek_sicaklik);
    Serial.print(" C | Gaz: "); Serial.print(ham_gaz);
    Serial.print(" -> "); Serial.println(gaz_durumu);
  }
}
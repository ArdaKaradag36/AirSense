# Dosya: AirSense/backend/test_device.py

import requests
import random
import time
import json
from datetime import datetime

# API Adresi (FastAPI'nin çalıştığı yer)
API_URL = "http://127.0.0.1:8000/api/v1/data"

# Test cihaz ID'si
TEST_DEVICE_SERIAL = "AIRSENSE-TEST-001" 

# --- GÜVENLİK ANAHTARI ---
# main.py dosyasındaki API_SECRET ile birebir aynı olmalı
API_KEY = "airsense-2025-secure-key-v1"

def send_test_data():
    """Rastgele verilerle API'ye POST isteği gönderir."""
    
    # 300-2500 arası rastgele gaz değeri.
    gas_value = random.randint(300, 2500) 
    
    packet = {
        "serial_number": TEST_DEVICE_SERIAL,
        "temperature": round(random.uniform(20.0, 30.0), 2),
        "humidity": round(random.uniform(40.0, 60.0), 2),
        "mq9_value": gas_value
    }

    # Header bilgisine API Key'i ekliyoruz
    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY  # <--- KRİTİK KISIM BURASI
    }

    try:
        # headers parametresini ekleyerek isteği atıyoruz
        response = requests.post(API_URL, json=packet, headers=headers)
        response.raise_for_status() 

        # Başarılı olduğunda saatle birlikte yazdır
        print(f"[{datetime.now().strftime('%H:%M:%S')}] OK: Gaz: {packet['mq9_value']} -> Sunucu: {response.json().get('message')}")
        
    except requests.exceptions.HTTPError as errh:
        # Eğer API Key yanlışsa burada 401 hatası göreceksin
        print(f"HATA (API): {errh}")
        if response.status_code == 401:
            print("!!! YETKİSİZ ERİŞİM: API Key yanlış olabilir.")
            
    except requests.exceptions.ConnectionError as errc:
        print("HATA (Bağlantı): FastAPI sunucusu açık mı? (http://127.0.0.1:8000)")
    except Exception as e:
        print(f"Bilinmeyen Hata: {e}")

if __name__ == "__main__":
    print(f"--- Simülasyon Başladı: {TEST_DEVICE_SERIAL} ---")
    print(f"--- Hedef: {API_URL} ---")
    
    while True:
        send_test_data()
        time.sleep(5)
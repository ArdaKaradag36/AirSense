# Dosya: AirSense/backend/test_device.py

import os
import requests
import random
import time
from datetime import datetime

# API Adresi (FastAPI'nin çalıştığı yer); makineye göre: export AIRSENSE_API_URL=...
API_URL = os.environ.get(
    "AIRSENSE_API_URL", "http://192.168.1.105:8000/api/v1/data"
)

# Test cihaz ID'si
TEST_DEVICE_SERIAL = "AIRSENSE-PRO-001" 

# --- GÜVENLİK ANAHTARI ---
# main.py dosyasındaki API_SECRET ile birebir aynı olmalı
API_KEY = "airsense-2025-secure-key-v1"

state = {
    "temperature": 24.0,
    "humidity": 45.0,
    "co2_ppm": 520,
    "voc_index": 90,
}

def random_walk(previous: float, min_value: float, max_value: float, step: float, precision: int = 2):
    delta = random.choice([-step, 0, step])
    next_value = previous + delta
    clamped = max(min_value, min(max_value, next_value))
    return round(clamped, precision)

def random_walk_int(previous: int, min_value: int, max_value: int, steps: list[int]):
    delta = random.choice(steps)
    next_value = previous + delta
    return max(min_value, min(max_value, next_value))

def send_test_data():
    """Yeni AirSense Pro modeliyle random-walk verileri gonderir."""
    state["temperature"] = random_walk(state["temperature"], 20.0, 28.0, 0.2)
    state["humidity"] = random_walk(state["humidity"], 30.0, 60.0, 0.8)
    state["co2_ppm"] = random_walk_int(state["co2_ppm"], 400, 1200, [-10, -5, 0, 5, 10])
    state["voc_index"] = random_walk_int(state["voc_index"], 50, 250, [-10, -5, 0, 5, 10])

    packet = {
        "serial_number": TEST_DEVICE_SERIAL,
        "temperature": state["temperature"],
        "humidity": state["humidity"],
        "co2_ppm": state["co2_ppm"],
        "voc_index": state["voc_index"]
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
        print(
            f"[{datetime.now().strftime('%H:%M:%S')}] OK: "
            f"T={state['temperature']}C H={state['humidity']}% CO2={state['co2_ppm']}ppm VOC={state['voc_index']} "
            f"-> Sunucu: {response.json().get('message')}"
        )
        
    except requests.exceptions.HTTPError as errh:
        # Eğer API Key yanlışsa burada 401 hatası göreceksin
        print(f"HATA (API): {errh}")
        if response.status_code == 401:
            print("!!! YETKİSİZ ERİŞİM: API Key yanlış olabilir.")
            
    except requests.exceptions.ConnectionError as errc:
        print(f"HATA (Bağlantı): FastAPI sunucusu açık mı? ({API_URL})")
    except Exception as e:
        print(f"Bilinmeyen Hata: {e}")

if __name__ == "__main__":
    print(f"--- Simülasyon Başladı: {TEST_DEVICE_SERIAL} ---")
    print(f"--- Hedef: {API_URL} ---")
    
    while True:
        send_test_data()
        time.sleep(10)
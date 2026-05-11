#!/usr/bin/env python3
"""
AirSense USB Bridge
ESP32 USB serial'dan veri okur → FastAPI backend'e gönderir → Supabase'e kaydeder.
WiFi bağlantısı GEREKMEZ.

Kullanım: python3 usb_bridge.py
"""
import json
import sys
import time

import requests
import serial

PORT      = "/dev/ttyUSB0"
BAUD      = 115200
API_URL   = "http://127.0.0.1:8000/api/v1/data"
API_KEY   = "airsense-2025-secure-key-v1"
HEADERS   = {"Content-Type": "application/json", "x-api-key": API_KEY}


def open_serial() -> serial.Serial:
    while True:
        try:
            s = serial.Serial(PORT, BAUD, timeout=2)
            print(f"[OK] {PORT} bağlandı @ {BAUD} baud")
            return s
        except serial.SerialException as e:
            print(f"[BEKLE] {PORT} açılamadı: {e}  — 3 sn sonra tekrar…")
            time.sleep(3)


def send_to_backend(payload: dict) -> None:
    try:
        r = requests.post(API_URL, json=payload, headers=HEADERS, timeout=5)
        if r.status_code == 200:
            status = payload.get("air_quality_status", "")
            mq  = payload.get("mq135_value", "-")
            tmp = payload.get("temperature", "-")
            hum = payload.get("humidity", "-")
            print(f"[GÖNDER] T={tmp}°C  H={hum}%  MQ135={mq}  → {r.json().get('message', 'ok')}")
        else:
            print(f"[HATA] Backend {r.status_code}: {r.text[:120]}")
    except requests.exceptions.ConnectionError:
        print(f"[HATA] Backend'e ulaşılamıyor ({API_URL}). API açık mı?")
    except Exception as e:
        print(f"[HATA] {e}")


def main() -> None:
    print("=" * 52)
    print("  AirSense USB Bridge")
    print(f"  {PORT}  →  {API_URL}")
    print("=" * 52)

    ser = open_serial()

    while True:
        try:
            raw = ser.readline()
            line = raw.decode("utf-8", errors="replace").strip()

            if not line:
                continue

            # Firmware "DATA:{json}" satırı yayınlıyor
            if line.startswith("DATA:"):
                json_str = line[5:]
                try:
                    data = json.loads(json_str)
                    send_to_backend(data)
                except json.JSONDecodeError:
                    print(f"[PARSE HATASI] {json_str[:80]}")
            else:
                # Diğer serial çıktıları sadece ekrana yaz
                print(f"[ESP32] {line}")

        except serial.SerialException as e:
            print(f"[KESİLDİ] {e} — yeniden bağlanıyor…")
            ser.close()
            time.sleep(2)
            ser = open_serial()
        except KeyboardInterrupt:
            print("\n[DURDURULDU]")
            ser.close()
            sys.exit(0)


if __name__ == "__main__":
    main()

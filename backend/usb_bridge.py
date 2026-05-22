#!/usr/bin/env python3
"""
AirSense USB Bridge
ESP32 USB serial'dan veri okur -> FastAPI backend'e gonderir -> Supabase'e kaydeder.
WiFi baglantisi GEREKMEZ.

Kullanim:
  python3 usb_bridge.py

Konfigurasyon: backend/.env
  AIRSENSE_API_SECRET=...           (zorunlu, backend ile ayni deger)
  USB_BRIDGE_PORT=/dev/ttyUSB0      (opsiyonel)
  USB_BRIDGE_BAUD=115200            (opsiyonel)
  USB_BRIDGE_API_URL=http://127.0.0.1:8000/api/v1/data  (opsiyonel)
"""
import glob
import json
import os
import sys
import time

import requests
import serial
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("AIRSENSE_API_SECRET", "").strip()
if not API_KEY:
    print(
        "[FATAL] AIRSENSE_API_SECRET tanimsiz. backend/.env icine ekleyin "
        "(backend ile AYNI deger olmali)."
    )
    sys.exit(1)

API_URL = os.getenv(
    "USB_BRIDGE_API_URL",
    "http://127.0.0.1:8000/api/v1/data",
).strip()
BAUD = int(os.getenv("USB_BRIDGE_BAUD", "115200"))
PORT_ENV = os.getenv("USB_BRIDGE_PORT", "").strip()

HEADERS = {"Content-Type": "application/json", "x-api-key": API_KEY}
DATA_PREFIX = b"DATA:"
LOG_PREFIX = b"[ESP32]"


def autodetect_port() -> str:
    """ENV'de port verilmemisse /dev/ttyUSB*, /dev/ttyACM* taranir."""
    if PORT_ENV:
        return PORT_ENV
    candidates = sorted(glob.glob("/dev/ttyUSB*") + glob.glob("/dev/ttyACM*"))
    if not candidates:
        return "/dev/ttyUSB0"
    return candidates[0]


def open_serial(port: str) -> serial.Serial:
    while True:
        try:
            s = serial.Serial(port, BAUD, timeout=2)
            # ESP32 reset edip clean stream icin kucuk bir bekleme
            time.sleep(0.5)
            s.reset_input_buffer()
            print(f"[OK] {port} baglandi @ {BAUD} baud")
            return s
        except serial.SerialException as e:
            print(f"[BEKLE] {port} acilamadi: {e}  -- 3 sn sonra tekrar...")
            time.sleep(3)


def send_to_backend(payload: dict) -> bool:
    """Backend'e POST. True = basari, False = hata (caller log'lar)."""
    try:
        r = requests.post(API_URL, json=payload, headers=HEADERS, timeout=5)
        if r.status_code == 200:
            mq = payload.get("mq135_value", "-")
            tmp = payload.get("temperature", "-")
            hum = payload.get("humidity", "-")
            try:
                msg = r.json().get("message", "ok")
            except Exception:
                msg = "ok"
            print(f"[GONDER] T={tmp}°C  H={hum}%  MQ135={mq}  -> {msg}")
            return True
        if r.status_code == 401:
            print(
                "[HATA] Backend 401: API anahtari reddedildi. "
                "backend/.env ve usb_bridge AIRSENSE_API_SECRET ayni mi?"
            )
        else:
            print(f"[HATA] Backend {r.status_code}: {r.text[:160]}")
        return False
    except requests.exceptions.ConnectionError:
        print(f"[HATA] Backend'e ulasilamiyor ({API_URL}). uvicorn calisiyor mu?")
        return False
    except Exception as e:
        print(f"[HATA] {e}")
        return False


def extract_data_payload(raw: bytes) -> dict | None:
    """
    Satirdan "DATA:{...}" JSON cikar. Garbled byte'lara dayanikli:
    sadece DATA: prefix'inden sonrasini UTF-8 decode dener.
    """
    idx = raw.find(DATA_PREFIX)
    if idx < 0:
        return None
    json_bytes = raw[idx + len(DATA_PREFIX):].strip()
    try:
        text = json_bytes.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def main() -> None:
    port = autodetect_port()
    print("=" * 60)
    print("  AirSense USB Bridge")
    print(f"  Port: {port}  Baud: {BAUD}")
    print(f"  API : {API_URL}")
    print(f"  Key : {API_KEY[:6]}...{API_KEY[-4:]}  (len={len(API_KEY)})")
    print("=" * 60)

    ser = open_serial(port)
    last_data_at = time.time()

    while True:
        try:
            raw = ser.readline()
            if not raw:
                # 20 saniyedir DATA: gormediysek uyari ver
                if time.time() - last_data_at > 20:
                    print(
                        "[UYARI] 20+ sn DATA: satiri yok. "
                        "Cihaz dogru porta mi bagli? Baud rate (115200) dogru mu?"
                    )
                    last_data_at = time.time()
                continue

            # Once DATA: payload denemesi (binary-safe)
            payload = extract_data_payload(raw)
            if payload is not None:
                last_data_at = time.time()
                send_to_backend(payload)
                continue

            # ESP32 debug satirlari (text decode dene)
            line = raw.decode("utf-8", errors="replace").strip()
            if line:
                # Bos veya cogunlukla replacement karakteri olan satirlari at
                replacement_ratio = line.count("\ufffd") / max(1, len(line))
                if replacement_ratio < 0.3:
                    print(f"[ESP32] {line}")

        except serial.SerialException as e:
            print(f"[KESILDI] {e} -- yeniden baglaniyor...")
            try:
                ser.close()
            except Exception:
                pass
            time.sleep(2)
            ser = open_serial(port)
        except KeyboardInterrupt:
            print("\n[DURDURULDU]")
            try:
                ser.close()
            except Exception:
                pass
            sys.exit(0)


if __name__ == "__main__":
    main()

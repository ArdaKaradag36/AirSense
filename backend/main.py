# Dosya: AirSense/backend/main.py

from datetime import datetime
import os
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from supabase import Client, create_client

from demo_store import DEMO_DEVICE_SERIAL, fetch_history, fetch_latest, init_demo_db, insert_reading

load_dotenv()


def _env_demo_flag() -> bool:
    return os.getenv("AIRSENSE_DEMO_MODE", "").strip().lower() in ("1", "true", "yes")


def _supabase_looks_like_placeholder(url: str, key: str) -> bool:
    if not url.strip() or not key.strip():
        return True
    u = url.lower()
    markers = (
        "your_project_ref",
        "<your-project-ref>",
        "example.supabase",
        "xxxx.supabase",
        "replace",
    )
    return any(m in u for m in markers) or key.strip().endswith("...") or "<" in key


DEMO_MODE = _env_demo_flag()

app = FastAPI(title="AirSense API")

# ---------------------------------------------------------------------------
# CORS — izin verilen originler ENV'den okunur; prod'da wildcard YASAKTIR.
# Ornek backend/.env:  ALLOWED_ORIGINS=https://airsense.io,https://app.airsense.io
# Gelistirme icin:     ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006
# ---------------------------------------------------------------------------
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS: list[str] = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else []
)
if not ALLOWED_ORIGINS:
    # Hicbir origin tanimlanmamissa sadece localhost'a izin ver (guvenli fallback)
    ALLOWED_ORIGINS = ["http://localhost:8081", "http://localhost:19006"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "x-api-key"],
)

# ---------------------------------------------------------------------------
# GUVENLIK — API_SECRET sadece ENV'den gelir, kaynak koduna yazilmaz.
# backend/.env dosyasina ekleyin:
#   AIRSENSE_API_SECRET=<openssl rand -hex 32 ile uretilmis guclu secret>
# ---------------------------------------------------------------------------
API_SECRET: str = os.getenv("AIRSENSE_API_SECRET", "")
if not API_SECRET:
    raise RuntimeError(
        "AIRSENSE_API_SECRET ortam degiskeni tanimlanmamis. "
        "backend/.env dosyasina ekleyin ve uvicorn'u yeniden baslatin."
    )

# ---------------------------------------------------------------------------
# SUPABASE (ENV) — service_role RLS'i bypass eder; sadece sunucuda tutulur.
# ---------------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

supabase: Optional[Client] = None
if not DEMO_MODE and _supabase_looks_like_placeholder(SUPABASE_URL, SUPABASE_KEY):
    DEMO_MODE = True
    print("[DEMO] Supabase yapilandirmasi gecersiz — SQLite demo moduna gecildi.")

if DEMO_MODE:
    init_demo_db()
    print(
        f"[DEMO] SQLite modu aktif ({DEMO_DEVICE_SERIAL}). "
        "Supabase zorunlu degil; mobil EXPO_PUBLIC_DEMO_MODE=true kullanin."
    )
elif SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase baglantisi basariyla kuruldu.")
    except Exception as e:
        print(f"Supabase baglanti hatasi: {e}")
else:
    DEMO_MODE = True
    init_demo_db()
    print("[DEMO] Supabase yapilandirmasi yok — SQLite demo modu acildi.")


def require_supabase() -> Client:
    if DEMO_MODE:
        raise HTTPException(
            status_code=503,
            detail="Bu endpoint demo modunda kullanilmaz. Supabase modu icin AIRSENSE_DEMO_MODE=false yapin.",
        )
    if supabase is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Supabase baglantisi kurulamadi. "
                "backend/.env icinde SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanimlayin."
            ),
        )
    return supabase


# ---------------------------------------------------------------------------
# JWT BEARER DOGRULAMASI — mobil endpointleri icin Supabase JWT zorunludur.
# ---------------------------------------------------------------------------
_bearer_scheme = HTTPBearer(auto_error=False)


async def require_auth_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer_scheme),
) -> dict:
    """
    Authorization: Bearer <supabase_access_token> basligini dogrular.
    Gecersiz veya eksik token durumunda 401 doner.
    Basarili dogrulamada Supabase user sozlugunu dondurur.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Bu endpoint icin Authorization: Bearer <token> gereklidir.",
        )
    db = require_supabase()
    try:
        response = db.auth.get_user(credentials.credentials)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Gecersiz veya suresi dolmus token.")
        return {"id": response.user.id, "email": response.user.email}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token dogrulanamadi.")


# ---------------------------------------------------------------------------
# MODELLER
# ---------------------------------------------------------------------------
class SensorData(BaseModel):
    serial_number: str = Field(..., description="ESP32 cihazinin benzersiz ID'si.")
    temperature: float = Field(..., ge=-50.0, le=100.0)
    humidity: float = Field(..., ge=0.0, le=100.0)
    co2_ppm: Optional[int] = Field(None, ge=0, description="SCD40 CO2 degeri (ppm).")
    voc_index: Optional[int] = Field(None, ge=0, le=500, description="SGP40 VOC indeks degeri.")
    mq135_value: Optional[int] = Field(None, ge=0, description="MQ-135 ham analog degeri.")


class TokenRequest(BaseModel):
    token: str


# ---------------------------------------------------------------------------
# YARDIMCI FONKSIYONLAR
# ---------------------------------------------------------------------------
def mq135_to_voc_index(mq: int) -> int:
    """MQ-135 ham ADC (~0-4095) -> VOC indeksi (~0-500)."""
    mq = max(0, min(int(mq), 4095))
    if mq < 600:
        return min(99, int(mq * 99 / max(1, 599)))
    if mq < 900:
        return 100 + min(99, int((mq - 600) * 99 / 299))
    if mq < 1200:
        return 200 + min(99, int((mq - 900) * 99 / 299))
    span = max(1, 4095 - 1200)
    return min(500, 300 + int((mq - 1200) * 200 / span))


def mq135_to_approx_co2_ppm(mq: int) -> int:
    """MQ-135 ile yaklasik CO2 olcumu (gercek SCD40 degeri degildir)."""
    mq = max(0, min(int(mq), 4095))
    return min(5000, max(350, 400 + int(mq * 0.45)))


def calculate_status(voc_index: Optional[int], mq135_value: Optional[int] = None) -> str:
    if voc_index is not None:
        if voc_index <= 100:
            return "GOOD"
        elif voc_index <= 200:
            return "MODERATE"
        elif voc_index <= 300:
            return "UNHEALTHY"
        return "HAZARDOUS"
    if mq135_value is not None:
        if mq135_value < 600:
            return "GOOD"
        elif mq135_value < 900:
            return "MODERATE"
        elif mq135_value < 1200:
            return "UNHEALTHY"
        return "HAZARDOUS"
    return "UNKNOWN"


def send_push_notification(expo_token: str, title: str, body: str) -> None:
    url = "https://exp.host/--/api/v2/push/send"
    message = {
        "to": expo_token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": {"project": "AirSense"},
    }
    try:
        requests.post(url, json=message, timeout=5)
    except Exception as e:
        print(f"Push Gonderme Hatasi: {e}")


# ---------------------------------------------------------------------------
# ENDPOINTLER
# ---------------------------------------------------------------------------

# 1. Cihazdan Veri Alma — x-api-key ile korunur (cihaz kimlik dogrulamasi)
@app.post("/api/v1/data")
def receive_data(data: SensorData, x_api_key: str = Header(None)):
    if not x_api_key:
        print("[/api/v1/data] 401 - x-api-key header eksik")
        raise HTTPException(status_code=401, detail="Yetkisiz Erisim: x-api-key header eksik")
    if x_api_key != API_SECRET:
        print(
            f"[/api/v1/data] 401 - API key uyusmuyor "
            f"(gelen len={len(x_api_key)}, beklenen len={len(API_SECRET)})"
        )
        raise HTTPException(status_code=401, detail="Yetkisiz Erisim: Yanlis API Key")

    voc_store = data.voc_index
    co2_store = data.co2_ppm
    if data.mq135_value is not None:
        if voc_store is None:
            voc_store = mq135_to_voc_index(data.mq135_value)
        if co2_store is None:
            co2_store = mq135_to_approx_co2_ppm(data.mq135_value)

    status = calculate_status(voc_store, data.mq135_value if voc_store is None else None)
    is_alert = status == "HAZARDOUS"

    kayit = {
        "device_serial": data.serial_number,
        "temperature": data.temperature,
        "humidity": data.humidity,
        "co2_ppm": co2_store,
        "voc_index": voc_store,
        "mq135_value": data.mq135_value,
        "air_quality_status": status,
        "is_alert": is_alert,
    }

    try:
        if DEMO_MODE:
            inserted = insert_reading(kayit)
            print(
                f"[DEMO INSERT OK] serial={data.serial_number} "
                f"T={data.temperature}°C H={data.humidity}% "
                f"CO2={co2_store} VOC={voc_store} status={status} id={inserted.get('id')}"
            )
        else:
            db = require_supabase()
            result = db.table("sensor_readings").insert(kayit).execute()
            inserted = result.data[0] if result.data else None
            print(
                f"[INSERT OK] serial={data.serial_number} "
                f"T={data.temperature}°C H={data.humidity}% "
                f"MQ135={data.mq135_value} CO2={co2_store} VOC={voc_store} "
                f"status={status} id={inserted.get('id') if inserted else '?'}"
            )

            if is_alert:
                print(f"!!! ACIL DURUM: {data.serial_number} cihazinda seviye HAZARDOUS!")
                users_response = db.table("mobile_clients").select("expo_token").execute()
                if users_response.data:
                    for user in users_response.data:
                        if isinstance(user, dict):
                            token = user.get("expo_token")
                            if token and isinstance(token, str):
                                send_push_notification(
                                    expo_token=token,
                                    title="HAVA KALİTESİ UYARISI!",
                                    body=f"Ortamdaki VOC seviyesi tehlikeli sinira ulasti. (VOC Index: {voc_store})",
                                )
                                print(f"-> Bildirim gonderildi: {token[:15]}...")

        return {"status": "success", "message": "Data recorded successfully."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[INSERT FAIL] serial={data.serial_number} hata: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Demo mobil okuma — JWT yok (yalnizca AIRSENSE_DEMO_MODE=true)
@app.get("/api/v1/demo/history")
def demo_history(serial_number: str, limit: int = 48):
    if not DEMO_MODE:
        raise HTTPException(status_code=404, detail="Demo modu kapali.")
    try:
        return fetch_history(serial_number, limit=limit)
    except Exception as e:
        print(f"[DEMO] history hata: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch demo data.")


@app.get("/api/v1/demo/latest")
def demo_latest(serial_number: str):
    if not DEMO_MODE:
        raise HTTPException(status_code=404, detail="Demo modu kapali.")
    row = fetch_latest(serial_number)
    if row is None:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi.")
    return row


# 2. Mobil Veri Cekme — Supabase JWT zorunludur
@app.get("/api/v1/history")
def get_history(
    serial_number: str,
    limit: int = 20,
    current_user: dict = Depends(require_auth_user),
):
    db = require_supabase()
    try:
        # Kullanicinin sadece kendi cihazinin verisine eristigini dogrula
        device_check = (
            db.table("devices")
            .select("id")
            .eq("serial_number", serial_number)
            .eq("user_id", current_user["id"])
            .limit(1)
            .execute()
        )
        if not device_check.data:
            raise HTTPException(
                status_code=403,
                detail="Bu cihaza erisim izniniz yok.",
            )

        response = (
            db.table("sensor_readings")
            .select("temperature, humidity, co2_ppm, voc_index, air_quality_status, created_at")
            .eq("device_serial", serial_number)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Veri Cekme Hatasi: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch data.")


# 3. Mobil Push Token Kayit — Supabase JWT zorunludur
@app.post("/api/v1/register-token")
def register_token(
    request: TokenRequest,
    current_user: dict = Depends(require_auth_user),
):
    db = require_supabase()
    try:
        db.table("mobile_clients").upsert(
            {"expo_token": request.token, "user_id": current_user["id"]},
            on_conflict="expo_token",
        ).execute()
        return {"status": "success", "message": "Token registered successfully."}
    except Exception as e:
        print(f"Token Kayit Hatasi: {e}")
        raise HTTPException(status_code=500, detail="Token registration failed.")


# 4. Mobil Push Token Silme — Supabase JWT zorunludur
@app.post("/api/v1/unregister-token")
def unregister_token(
    request: TokenRequest,
    current_user: dict = Depends(require_auth_user),
):
    db = require_supabase()
    try:
        db.table("mobile_clients").delete().eq("expo_token", request.token).eq(
            "user_id", current_user["id"]
        ).execute()
        return {"status": "success", "message": "Token removed successfully."}
    except Exception as e:
        print(f"Token Silme Hatasi: {e}")
        raise HTTPException(status_code=500, detail="Token removal failed.")

# Dosya: AirSense/backend/main.py

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field
from supabase import create_client, Client
from datetime import datetime
import requests # <-- YENİ EKLENDİ: HTTP isteği atmak için
import os 

app = FastAPI(title="AirSense API")

# --- GÜVENLİK AYARLARI ---
API_SECRET = "airsense-2025-secure-key-v1" 

# --- GÜNCEL SUPABASE AYARLARIN ---
SUPABASE_URL = "https://nqmxcxwxeaevndgjyjot.supabase.co"
SUPABASE_KEY = "sb_publishable_I6JBCwZVMqy32BCyU_hZLA_FMwmboxP"

# Supabase Bağlantısı
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Supabase Bağlantı Hatası: {e}")

# ----------------------------------------------------
# MODELLER
# ----------------------------------------------------
class SensorData(BaseModel):
    serial_number: str = Field(..., description="ESP32 cihazının benzersiz ID'si.")
    temperature: float = Field(..., ge=-50.0, le=100.0)
    humidity: float = Field(..., ge=0.0, le=100.0)
    mq135_value: int = Field(..., ge=0, le=4095, description="MQ-135'ten gelen ham analog değer.")

class TokenRequest(BaseModel):
    token: str

# ----------------------------------------------------
# YARDIMCI FONKSİYONLAR
# ----------------------------------------------------
def calculate_status(mq_value: int) -> str:
    """MQ-135 değerine göre hava kalitesi durumunu belirler."""
    if mq_value < 600:
        return "GOOD"
    elif mq_value < 1200:
        return "MODERATE"
    elif mq_value < 2000:
        return "UNHEALTHY"
    else:
        return "HAZARDOUS"

def send_push_notification(expo_token: str, title: str, body: str):
    """Expo Push API kullanarak telefona bildirim gönderir."""
    url = "https://exp.host/--/api/v2/push/send"
    message = {
        "to": expo_token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": {"project": "AirSense"}, # İsteğe bağlı veri
    }
    
    try:
        response = requests.post(url, json=message)
        # Expo'dan gelen yanıtı kontrol etmek istersen:
        # print(f"Push Result: {response.text}")
    except Exception as e:
        print(f"Push Gönderme Hatası: {e}")

# ----------------------------------------------------
# ENDPOINTLER
# ----------------------------------------------------

# 1. ENDPOINT: Cihazdan Veri Alma (POST)
# 1. ENDPOINT: Cihazdan Veri Alma (POST)
@app.post("/api/v1/data")
def receive_data(data: SensorData, x_api_key: str = Header(None)):
    
    # Güvenlik Kontrolü
    if x_api_key != API_SECRET:
        raise HTTPException(status_code=401, detail="Yetkisiz Erişim: Yanlış API Key")

    # Veri İşleme
    status = calculate_status(data.mq135_value)
    is_alert = status == "HAZARDOUS" # Kırmızı seviye alarm

    kayit = {
        "device_serial": data.serial_number,
        "temperature": data.temperature,
        "humidity": data.humidity,
        "mq135_value": data.mq135_value,
        "air_quality_status": status,
        "is_alert": is_alert
    }

    try:
        # Veritabanına Yaz
        supabase.table("sensor_readings").insert(kayit).execute()
        
        # --- KRİTİK BÖLÜM: BİLDİRİM GÖNDERME ---
        if is_alert:
            print(f"!!! ACİL DURUM: {data.serial_number} cihazında seviye HAZARDOUS!")
            
            # 1. Veritabanından kayıtlı telefon tokenlarını çek
            users_response = supabase.table("mobile_clients").select("expo_token").execute()
            
            # 2. Herkese bildirim at
            if users_response.data:
                for user in users_response.data:
                    # DÜZELTME: Pylance için tip kontrolü (User sözlük mü?)
                    if isinstance(user, dict):
                        token = user.get("expo_token")
                        
                        # DÜZELTME: Token gerçekten bir String mi?
                        if token and isinstance(token, str):
                            send_push_notification(
                                expo_token=token,
                                title="🚨 HAVA KALİTESİ UYARISI!",
                                body=f"Dikkat! Ortamdaki hava kirliliği tehlikeli sınıra ulaştı. (MQ-135: {data.mq135_value})"
                            )
                            print(f"-> Bildirim gönderildi: {token[:15]}...")

        return {"status": "success", "message": "Data recorded successfully."}
    
    except Exception as e:
        print(f"Sistem Hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 2. ENDPOINT: Mobil Veri Çekme (GET)
@app.get("/api/v1/history/{device_serial}")
def get_history(device_serial: str, limit: int = 20):
    try:
        response = supabase.table("sensor_readings")\
            .select("temperature, humidity, mq135_value, air_quality_status, created_at")\
            .eq("device_serial", device_serial)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute() 
        return response.data
    except Exception as e:
        print(f"Veri Çekme Hatası: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch data.")

# 3. ENDPOINT: Mobil Token Kayıt
@app.post("/api/v1/register-token")
def register_token(request: TokenRequest):
    try:
        supabase.table("mobile_clients").upsert(
            {"expo_token": request.token}, 
            on_conflict="expo_token"
        ).execute()
        return {"status": "success", "message": "Token registered successfully."}
    except Exception as e:
        print(f"Token Kayıt Hatası: {e}")
        raise HTTPException(status_code=500, detail="Token registration failed.")
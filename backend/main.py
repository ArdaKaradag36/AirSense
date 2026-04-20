# Dosya: AirSense/backend/main.py

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client
from datetime import datetime
import requests # <-- YENİ EKLENDİ: HTTP isteği atmak için
import os 

app = FastAPI(title="AirSense API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GÜVENLİK AYARLARI ---
API_SECRET = "airsense-2025-secure-key-v1" 

# --- GÜNCEL SUPABASE AYARLARI (ENV) ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

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
    co2_ppm: int = Field(..., ge=0, description="SCD40 sensöründen CO2 değeri (ppm).")
    voc_index: int = Field(..., ge=0, le=500, description="SGP40 sensöründen VOC indeks değeri.")

class TokenRequest(BaseModel):
    token: str

# ----------------------------------------------------
# YARDIMCI FONKSİYONLAR
# ----------------------------------------------------
def calculate_status(voc_index: int) -> str:
    """VOC indeks değerine göre hava kalitesi durumunu belirler."""
    if voc_index <= 100:
        return "GOOD"
    elif voc_index <= 200:
        return "MODERATE"
    elif voc_index <= 300:
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
    status = calculate_status(data.voc_index)
    is_alert = status == "HAZARDOUS" # Kırmızı seviye alarm

    kayit = {
        "device_serial": data.serial_number,
        "temperature": data.temperature,
        "humidity": data.humidity,
        "co2_ppm": data.co2_ppm,
        "voc_index": data.voc_index,
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
                                body=f"Dikkat! Ortamdaki VOC seviyesi tehlikeli sınıra ulaştı. (VOC Index: {data.voc_index})"
                            )
                            print(f"-> Bildirim gönderildi: {token[:15]}...")

        return {"status": "success", "message": "Data recorded successfully."}
    
    except Exception as e:
        print(f"Sistem Hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 2. ENDPOINT: Mobil Veri Çekme (GET)
@app.get("/api/v1/history")
def get_history(serial_number: str, limit: int = 20):
    try:
        response = supabase.table("sensor_readings")\
            .select("temperature, humidity, co2_ppm, voc_index, air_quality_status, created_at")\
            .eq("device_serial", serial_number)\
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

# 4. ENDPOINT: Mobil Token Silme
@app.post("/api/v1/unregister-token")
def unregister_token(request: TokenRequest):
    try:
        supabase.table("mobile_clients").delete().eq("expo_token", request.token).execute()
        return {"status": "success", "message": "Token removed successfully."}
    except Exception as e:
        print(f"Token Silme Hatası: {e}")
        raise HTTPException(status_code=500, detail="Token removal failed.")
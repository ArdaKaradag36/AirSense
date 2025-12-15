# Dosya: AirSense/backend/main.py

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from supabase import create_client, Client
from datetime import datetime
import os 

app = FastAPI(title="AirSense API")

# --- GÜNCEL SUPABASE AYARLARIN ---
SUPABASE_URL = "https://nqmxcxwxeaevndgjyjot.supabase.co"
SUPABASE_KEY = "sb_publishable_I6JBCwZVMqy32BCyU_hZLA_FMwmboxP"

# Supabase Bağlantısı
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Supabase Bağlantı Hatası: {e}")

# Cihazdan gelen veri için model
class SensorData(BaseModel):
    serial_number: str = Field(..., description="ESP32 cihazının benzersiz ID'si.")
    temperature: float = Field(..., ge=-50.0, le=100.0)
    humidity: float = Field(..., ge=0.0, le=100.0)
    mq9_value: int = Field(..., ge=0, le=4095, description="MQ-9'dan gelen ham analog değer.")

# Helper fonksiyon: Hava Kalitesini hesapla
def calculate_status(mq_value: int) -> str:
    """MQ-9 değerine göre hava kalitesi durumunu belirler."""
    if mq_value < 600:
        return "GOOD"
    elif mq_value < 1200:
        return "MODERATE"
    elif mq_value < 2000:
        return "UNHEALTHY"
    else:
        return "HAZARDOUS"

# ----------------------------------------------------
# 1. ENDPOINT: Cihazdan Veri Alma (POST)
# ----------------------------------------------------
@app.post("/api/v1/data")
def receive_data(data: SensorData):
    
    status = calculate_status(data.mq9_value)
    is_alert = status == "HAZARDOUS" # Kırmızı seviye alarm

    kayit = {
        "device_serial": data.serial_number,
        "temperature": data.temperature,
        "humidity": data.humidity,
        "mq9_value": data.mq9_value,
        "air_quality_status": status,
        "is_alert": is_alert
    }

    try:
        # Supabase'e yazma işlemi
        supabase.table("sensor_readings").insert(kayit).execute()
        
        # Mobil uygulamaya bildirim gönderme simülasyonu
        if is_alert:
            print(f"!!! ACİL UYARI GÖNDERİLDİ: {data.serial_number}")

        return {"status": "success", "message": "Data recorded successfully."}
    
    except Exception as e:
        print(f"Veritabanı Hatası: {e}")
        # Hatanın Supabase'e bağlı olduğunu varsayarak 500 dönüyoruz
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------------------------------
# 2. ENDPOINT: Mobil Uygulama için Veri Çekme (GET)
# ----------------------------------------------------
@app.get("/api/v1/history/{device_serial}")
def get_history(device_serial: str, limit: int = 20):
    
    try:
        # Belirtilen cihazın son N kaydını çek
        response = supabase.table("sensor_readings")\
            .select("temperature, humidity, mq9_value, air_quality_status, created_at")\
            .eq("device_serial", device_serial)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
            
        return response.data
        
    except Exception as e:
        print(f"Veri Çekme Hatası: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch data.")
# AirSense




![airsense](https://github.com/user-attachments/assets/3f2b2e54-1504-4a90-9374-be9e8dfa9920)






cat > README.md << 'EOF'
# 🌬 AirSense loT – Akıllı Hava Kalitesi İzleme Sistemi

🧩 **Proje Tanımı**
AirSense, iç ve dış mekan hava kalitesini ölçen, çevresel verileri gerçek zamanlı olarak izleyen ve mobil uygulama üzerinden kullanıcıya sunan akıllı bir IoT sistemidir.  
Proje, sensör verilerini analiz ederek sıcaklık, nem, CO₂ ve VOC seviyelerini ölçer ve kullanıcıya sade bir arayüzle aktarır.

---

## 🚀 Proje Amacı

- Hava kalitesi verilerini sensörler aracılığıyla anlık olarak toplamak  
- Mobil uygulama üzerinden verileri izlenebilir hale getirmek  
- Kullanıcı dostu bir grafiksel gösterim sağlamak  
- Sensör ve bulut arasında güvenli veri aktarımı kurmak  
- Donanım, yazılım ve mobil katmanları ayrı geliştirerek modüler mimari oluşturmak  
- Git/GitHub üzerinden ekip içi senkronizasyonu sürdürmek  

---

## 🧱 Teknolojiler

| Katman | Teknoloji |
|:--|:--|
| Donanım | ESP32, SHT31, MH-Z19B, CCS811 |
| Firmware | Arduino / ESP-IDF |
| Mobil Uygulama | React Native |
| Veritabanı | Supabase / PostgreSQL |
| Bulut & API | FastAPI |
| Tasarım | Figma, Fusion360 |
| Dokümantasyon | PDF ve BPMN.io |

---

## 👥 Ekip

| Rol | Sorumlu | Açıklama |

| Gömülü Yazılım & PCB Tasarımı | Barış Uygar Kaygusuz | ESP32 sensör entegrasyonu, devre ve kasa tasarımı |
| Mobil Uygulama Geliştirme | Arda Karadağ | React Native, BLE/Wi-Fi bağlantısı ve veri gösterimi |
| Backend & API | Arda Karadağ | FastAPI servisleri ve veri akışı |
| Test & Kalibrasyon | Barış Uygar Kaygusuz | Sensör doğrulama, kalibrasyon, ölçüm karşılaştırmaları |
| Dokümantasyon & Proje Yönetimi | Arda Karadağ | GitHub yönetimi, proje takibi, teknik belgeler |

---

## 📦 Kurulum

### 1️⃣ Gerekli Yazılımlar

- Arduino IDE veya ESP-IDF  
- React Native
- Python 3.12+  
- Supabase veya PostgreSQL 16+  
- Git  
- Visual Studio Code  
- Fusion360 (isteğe bağlı, kasa tasarımı için)
- https://nodejs.org/tr/download
- https://ngrok.com/download/windows?tab=download
- python -m pip install fastapi uvicorn supabase python-dotenv requests pydantic   // terminale

---

### 2️⃣ Kurulum Adımları

```bash
# Proje deposunu klonla
git clone https://github.com/ArdaKaradag36/AirSense.git
cd AirSense
code .


// MOBİL UYGULAMAYI TEST VERİLERİYLE ÇALIŞTIRMA 15-12-25
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
cd backend
python test_device.py
.\ngrok http 8000     
cd mobile-app
npx expo start --tunnel
Unutma: Ortağın Barış, ESP32 kodunu yazarken bu belirlediğimiz şifreyi (airsense-2025-secure-key-v1)
🔑 1. Backend Güvenlik Şifresi (API Key)

test_device.py ve ileride ESP32 kodunda kullanacağın şifre:
Plaintext

airsense-2025-secure-key-v1

🆔 2. Expo Project ID (Bildirimler İçin)

Kodun içine gömdüğümüz (hardcode ettiğimiz) ID:
Plaintext

3127318d-2604-4fea-86d9-07dd167edf63

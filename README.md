# AirSense IoT

Akıllı hava kalitesi izleme sistemi: ESP32 sensörler, FastAPI backend, React Native (Expo) mobil uygulama ve Supabase bulut katmanı.

| Katman | Teknoloji |
|--------|-----------|
| Donanım | ESP32, PlatformIO |
| Backend | Python, FastAPI, Uvicorn |
| Mobil | React Native, **Expo** (hibrit mobil) |
| Veritabanı (üretim) | Supabase / PostgreSQL |
| Demo (hoca paketi) | Yerel SQLite + `test_device.py` |

**Tam kaynak kod:** [github.com/ArdaKaradag36/AirSense](https://github.com/ArdaKaradag36/AirSense)  
**Kurumsal web:** [ardakaradag36.github.io/airsense-iot](https://ardakaradag36.github.io/airsense-iot/)

---

## Proje özeti

| Alan | Açıklama |
|------|----------|
| Tür | Donanım (ESP32) + mobil uygulama + backend API |
| Dağıtım | Expo Go / mağaza uygulaması; sunucu tarafı API |
| Geliştirme ortamı | **Linux (Ubuntu)** önerilir; Windows desteklenir |

Donanım ve mobil uygulama odaklı bir sektör projesi; dağıtım ve kullanıcı deneyimine (mobil arayüz, kurulum script’leri) öncelik verildi.

---

## Depo yapısı

```
AirSense/
├── backend/                 # FastAPI, test_device.py, demo_store
├── mobile-app/              # Expo mobil uygulama
├── hardware/                # ESP32 firmware (PlatformIO)
├── supabase/                # SQL / RLS
├── scripts/
│   ├── hoca/                # Hocaya zip script kaynakları (.sh / .bat)
│   └── create-hoca-paketi.sh
├── README.md                # Bu dosya — genel rehber
├── README-ZIP.md            # Yalnızca zip çalıştırma (hocaya gider)
├── SECTORALPROJE.md         # Sektör projesi ayrıntılı belge
└── READMEFOLDER/            # Geliştirici iç notları (Git’e gitmez)
```

---

## Geliştirme (tam repo)

```bash
cd backend && cp .env.example .env
./setup_venv.sh && source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Başka terminal
python3 test_device.py

cd mobile-app && cp .env.example .env && npm install && npx expo start
```

---

## Hocaya demo zip

### Neden zip küçük?

E-posta / paylaşım için **tam depo değil**, yalnızca **çalıştırılabilir demo** gönderilir.

Zip **içermez:** `hardware/`, `docs/`, `supabase/`, `node_modules`  
Zip **içerir:** `backend/`, `mobile-app/`, kurulum script’leri, `README-ZIP.md`, `SECTORALPROJE.md`

Tam proje (script kaynakları dahil): [github.com/ArdaKaradag36/AirSense](https://github.com/ArdaKaradag36/AirSense) — `scripts/hoca/` altında `.sh` / `.bat` kaynakları, zip kökünde kopyaları.

### Zip oluşturma (geliştirici)

```bash
chmod +x scripts/create-hoca-paketi.sh
./scripts/create-hoca-paketi.sh
```

Çıktı: `AirSense-hoca-demo-YYYYMMDD.zip` (~1.5–2 MB, `zip -9`)

### Hoca ne okur?

| Dosya (zip içinde) | İçerik |
|--------------------|--------|
| **[README-ZIP.md](README-ZIP.md)** | Kurulum ve çalıştırma komutları (Linux / Windows) |
| **[SECTORALPROJE.md](SECTORALPROJE.md)** | Sektör projesi, ayrıntılı anlatım |

Linux/Ubuntu demo için **daha verimli**; Windows için `.bat` dosyaları zip’te mevcut.

---

## İletişim

- **WhatsApp:** 0541 413 6824 (kurulum hatası / soru)
- **GitHub:** [ArdaKaradag36/AirSense](https://github.com/ArdaKaradag36/AirSense)

---

## Telif

[LICENSE](LICENSE) · [COPYRIGHT.md](COPYRIGHT.md) · [NOTICE](NOTICE)

*Arda Karadağ — AirSense IoT*

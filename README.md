# AirSense IoT — Halit Ayanlı Hocam için kurulum

Sayın Hocam, bu dosya **demo paketinin** içindedir (zip veya proje klasörünün **en üstündeki** `README.md`).  
**ESP32, USB kablo veya bulut hesabı (Supabase) gerekmez.** Bilgisayarınızda küçük bir sunucu + sahte sensör programı + telefonda Expo Go yeterli.

> **Demo ne demek?**  
> Gerçek cihaz yokmuş gibi her 10 saniyede bir sahte sıcaklık/nem/CO₂ verisi üretilir; telefondaki uygulama bu veriyi grafikte gösterir. Veriler bilgisayarınızda küçük bir dosyada (`demo.db`) saklanır.

Daha uzun anlatım ve sorun çözümü: **[SECTORALPROJE.md](SECTORALPROJE.md)**

---

## Önce bunları kurun (bir kez)

| Ne | Nereden |
|----|---------|
| **Python 3.12+** | https://www.python.org/downloads/ |
| **Node.js 18+** | https://nodejs.org/ |
| **Expo Go** (telefona) | App Store veya Google Play’de “Expo Go” arayın |

Projeyi zip’ten çıkardıysanız klasör adı genelde `AirSense` olur. Terminalde o klasöre girin:

```bash
cd AirSense
```

*(Klasör adı farklıysa onu yazın.)*

---

## Adım 1 — Backend ayar dosyası (demo açık)

```bash
cd backend
cp .env.example .env
```

`.env` dosyasını bir metin editörüyle açın. **Şu iki satır mutlaka olsun** (başka satırlar `#` ile yorum kalabilir):

```env
AIRSENSE_DEMO_MODE=true
AIRSENSE_API_SECRET=demo-local-only-change-me
```

Kaydedin.

Sonra Python ortamını kurun:

```bash
chmod +x setup_venv.sh
./setup_venv.sh
```

Bittiğinde `backend` klasöründe kalın veya bir üst dizine çıkın.

---

## Adım 2 — Mobil ayar dosyası (demo açık + IP)

```bash
cd mobile-app
cp .env.example .env
```

**Bilgisayarınızın Wi‑Fi IP’sini bulun:**

- **Linux / macOS:** terminalde `hostname -I` → ilk sayı (örnek: `192.168.1.42`)
- **Windows:** `cmd` → `ipconfig` → Wi‑Fi altındaki **IPv4**

`.env` içine şunları yazın (`SIZIN_IP` yerine az önce bulduğunuz sayı):

```env
EXPO_PUBLIC_DEMO_MODE=true
EXPO_PUBLIC_API_BASE_URL=http://SIZIN_IP:8000
```

Örnek: `http://192.168.1.42:8000` — sonuna `/api` **eklemeyin**.

Telefon paketlerini kurun:

```bash
npm install
```

---

## Adım 3 — Üç ayrı terminal (her seferinde böyle)

Üç pencere açın. **Hepsinde** telefon ile bilgisayar **aynı Wi‑Fi**’de olsun.

### Terminal 1 — Sunucu (açık kalsın)

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Ekranda `[DEMO] SQLite modu aktif` benzeri bir yazı görmelisiniz. Bu pencereyi **kapatmayın**.

### Terminal 2 — Sahte sensör (açık kalsın)

```bash
cd backend
source .venv/bin/activate
python test_device.py
```

Her ~10 saniyede `OK:` yazısı gelmeli. Gelmiyorsa Terminal 1 çalışıyor mu ve `.env` içindeki şifre doğru mu bakın.

### Terminal 3 — Telefona uygulama (QR kod)

```bash
cd mobile-app
npx expo start -c
```

`-c` = ayar değiştirdiyseniz önbelleği temizler (IP değiştirdiyseniz şart).

---

## Adım 4 — Telefonda açma

1. Telefona **Expo Go** kurulu olsun.
2. Terminal 3’teki **QR kodu** tarayın (Android: Expo Go içinden; iOS: Kamera → Expo’da aç).
3. Uygulama açılınca demo modda **kayıt olmadan** ana ekrana düşersiniz.
4. Terminal 2’de `OK` satırları akıyorsa birkaç saniye–dakika içinde grafikler dolmaya başlar.

---

## Kısa kontrol listesi

| Soru | Evet olmalı |
|------|----------------|
| Terminal 1 çalışıyor mu? | Evet |
| Terminal 2’de `OK` görüyor musunuz? | Evet |
| Telefon ve PC aynı Wi‑Fi’de mi? | Evet |
| `mobile-app/.env` içindeki IP, `hostname -I` ile aynı mı? | Evet |
| `.env`’de `DEMO_MODE=true` var mı (backend + mobil)? | Evet |

---

## Sık takılan yerler

- **Telefonda veri yok** → Önce Terminal 2’de `OK` var mı bakın; IP yanlışsa `.env` düzeltip `npx expo start -c` tekrar.
- **401 / yetkisiz** → `backend/.env` ile `test_device` aynı `AIRSENSE_API_SECRET` kullanmalı.
- **Bağlanamıyor** → Bilgisayar güvenlik duvarında **8000** portu; farklı Wi‑Fi ağları işe yaramaz.

---

## Bu README demo paketinde var mı?

**Evet.** `scripts/create-hoca-paketi.sh` ile oluşturulan zip’in **kök dizininde** bu `README.md` dosyası vardır.  
Zip’e **girmeyenler** (güvenlik için): `.env`, `node_modules`, `READMEFOLDER/`, gerçek şifre dosyaları.

Tam sistem (Supabase + kayıt) istenirse: **[HOCA_ENV.example.txt](HOCA_ENV.example.txt)** şablonu ve SECTORALPROJE.md Bölüm B.

---

## Telif

- [LICENSE](LICENSE)
- [COPYRIGHT.md](COPYRIGHT.md)
- [NOTICE](NOTICE)

*AirSense IoT — sektör projesi (Arda Karadağ)*

# Bu bilgisayarın IP’sini nereye yazacağım?

Çok kısa özet: Telefonundaki uygulama ve test script’i, **senin bilgisayarındaki** sunucuya bağlanmak zorunda. Bunun için bilgisayarın **aynı Wi‑Fi ağındaki adresi** (IP) lazım. O adresi **iki yerde** kullanıyorsun: mobil uygulama için bir dosyada, istersen test için terminalde.

---

## 1. IP nedir, neden lazım?

- Evdeki modem her cihaza bir numara verir: `192.168.x.x` gibi. Buna **yerel IP** denir.
- Backend (FastAPI) bilgisayarında çalışıyor. Telefon “hangi bilgisayara gideyim?” diye sorunca cevap: **o bilgisayarın bu Wi‑Fi’deki IP’si**.
- Telefon ile bilgisayar **aynı Wi‑Fi’de** değilse bu yöntem tek başına yetmeyebilir; önce aynı ağı kullan.

---

## 2. Bu bilgisayarın IP’sini nasıl bulurum?

**Linux’ta** (Terminal aç):

```bash
hostname -I
```

Çıkan sayılardan **ilkini** kullan. Örnek: `192.168.1.42`  
(Bazen birden fazla yazar; kablosuz için genelde ilki doğrudur.)

**Windows’ta**: `cmd` aç → `ipconfig` → “Wireless” veya “Wi‑Fi” altındaki **IPv4 Address**.

Bu sayı **senin yazacağın IP**. Port ayrı: bizim projede sunucu portu **8000**.

---

## 3. Telefon uygulaması: IP’yi buraya yaz

1. Klasör: `mobile-app`
2. Orada `.env.example` diye bir dosya var. Onu kopyala, adını **`.env`** yap (başındaki nokta önemli).
3. `.env` dosyasını aç. Şunu görürsün:

   ```env
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.105:8000
   ```

4. Ortadaki IP’yi **senin bulduğun IP** ile değiştir. Son hali örnek:

   ```env
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:8000
   ```

5. **Dikkat:**
   - `http` ile başlasın.
   - Sonda `:8000` olsun (port).
   - Satır sonunda `/api/...` **yazma**; sadece kök adres.

6. Dosyayı kaydettikten sonra Expo’yu **kapatıp yeniden başlat** (`npx expo start` vb.). Çünkü `.env` değişince uygulama bunu yeniden okumalı.

---

## 4. Test script (`test_device.py`): İstersen böyle kullan

Varsayılan adres kodda tanımlı; **başka bir makinede** veya IP değiştiyse şunu kullanabilirsin.

Terminalde, `backend` klasöründeyken:

```bash
export AIRSENSE_API_URL="http://BURAYA_IP_YAZ:8000/api/v1/data"
python test_device.py
```

`BURAYA_IP_YAZ` yerine yine aynı Wi‑Fi IP’sini yaz. Tek satırda:

```bash
AIRSENSE_API_URL="http://192.168.1.42:8000/api/v1/data" python test_device.py
```

---

## 5. Sunucuyu doğru başlat

Backend’in dışarıdan (telefondan) gelen istekleri dinlemesi için bilgisayarda şuna benzer çalıştır:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

`0.0.0.0` = “sadece bu makine değil, ağdan gelenlere de açık” demek.

---

## 6. Hâlâ bağlanmıyorsa (kontrol listesi)

- Telefon ve bilgisayar **aynı Wi‑Fi** mi?
- `.env` içindeki IP, az önce `hostname -I` ile gördüğünle **aynı mı**?
- `:8000` yazmayı unuttun mu?
- Expo’yu `.env` değişikliğinden **sonra** yeniden başlattın mı?
- Bilgisayarda güvenlik duvarı 8000 portunu kesiyor olabilir (nadir).

---

Özet cümle: **IP’yi `mobile-app/.env` içine `EXPO_PUBLIC_API_BASE_URL=http://SENIN_IP:8000` şeklinde yaz; test için gerekirse `AIRSENSE_API_URL` ile script’e söyle; sunucuyu `--host 0.0.0.0` ile çalıştır.**

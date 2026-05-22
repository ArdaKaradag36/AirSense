# AirSense IoT — Demo zip kurulumu

**Donanım ve Supabase gerekmez.** Sanal sensör + Expo Go ile mobil arayüz.

Zip klasörü: **`AirSense-hoca-demo-YYYYMMDD`** (zip dosya adıyla aynı, `.zip` yok)

Ayrıntılı proje anlatımı: **[SECTORALPROJE.md](SECTORALPROJE.md)**  
Tam repo: **https://github.com/ArdaKaradag36/AirSense**  
Sorun olursa WhatsApp: **0541 413 6824**

---

## 1) Zip’i açın, doğru klasöre girin

```bash
cd ~/Desktop/AirSense-hoca-demo-20260522
ls
```

Görmeniz gerekenler: `backend/`, `mobile-app/`, `1-KURULUM.sh` veya `1-KURULUM.bat`, `README-ZIP.md`

İç içe iki klasör varsa bir kez daha `cd AirSense-hoca-demo-…` yapın.

---

## 2) Kurulum (bir kez) — sunucu otomatik başlar

### Linux (Ubuntu önerilir)

```bash
chmod +x *.sh
./1-KURULUM.sh
```

### Windows

Çift tık **`1-KURULUM.bat`** (veya `cmd` içinde çalıştırın).  
**“AirSense Sunucu”** penceresi açık kalsın; `[DEMO] SQLite modu aktif` yazmalı.

Python + Node kurulu olmalı: [python.org](https://www.python.org/downloads/) (PATH işaretli), [nodejs.org](https://nodejs.org/).

---

## 3) İki terminal / pencere daha

| | Linux | Windows | Başarı |
|--|--------|---------|--------|
| Sanal sensör | `./3-TEST-CIHAZ.sh` | `3-TEST-CIHAZ.bat` | ~10 sn’de `OK:` |
| Telefon | `./4-EXPO.sh` | `4-EXPO.bat` | QR kod |

**Expo:** `It is recommended to log in…` → **`Proceed anonymously`** (Enter) → Expo Go ile QR tara.

Telefon ve bilgisayar **aynı Wi‑Fi**.

---

## Bağlantı

| | Adres |
|--|--------|
| Sanal sensör → sunucu | `http://127.0.0.1:8000` |
| Telefon → sunucu | `http://SIZIN_IP:8000` (kurulum script yazar) |

Linux IP: `hostname -I` · Windows: `ipconfig` → Wi‑Fi IPv4

---

## Sunucuyu durdurmak (Linux)

```bash
./SUNUCU-DURDUR.sh
```

Windows: “AirSense Sunucu” penceresini kapatın veya `2-SUNUCU.bat` ile yeniden açın.

---

## Sık hatalar

| Belirti | Çözüm |
|---------|--------|
| `backend` yok | Yanlış klasör; `ls` ile `README-ZIP.md` görünene kadar `cd` |
| `Supabase baglantisi` | `./1-KURULUM` yeniden |
| Telefonda veri yok | `OK:` akıyor mu? Aynı Wi‑Fi? `./4-EXPO` yeniden (`-c`) |
| `Demo history 404` | Güncel zip gerekir |

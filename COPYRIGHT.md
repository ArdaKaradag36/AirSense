# AirSense IoT — Telif ve katkıda bulunanlar

**Proje:** AirSense IoT — Akıllı Hava Kalitesi İzleme Sistemi  
**Bağlam:** Akademik sektör projesi (2025–2026)  
**Lisans:** [MIT License](LICENSE)

## Telif sahipleri ve ekip

| Rol | Kişi |
|-----|------|
| Mobil uygulama, backend, dokümantasyon, donanım entegrasyonu | Arda Karadağ |

Bu yazılım MIT lisansı koşulları altında sunulur.

## Üçüncü taraf yazılım

Bu proje aşağıdaki açık kaynak ve hizmetleri kullanır (tam liste `NOTICE` dosyasında özetlenmiştir):

- **Expo / React Native** — mobil istemci
- **FastAPI / Uvicorn** — HTTP API
- **Supabase** — kimlik doğrulama ve veritabanı (üretim modu)
- **PlatformIO / ESP32** — donanım firmware (isteğe bağlı)

Üçüncü taraf bileşenlerin kendi lisansları geçerlidir.

## Güvenlik notu

`SUPABASE_SERVICE_ROLE_KEY` ve `AIRSENSE_API_SECRET` yalnızca sunucu tarafında (`backend/.env`) tutulmalıdır. Bu değerler mobil uygulama paketine veya Git deposuna eklenmemelidir.

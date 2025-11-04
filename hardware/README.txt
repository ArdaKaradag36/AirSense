📦 AirSense – Hardware Bölümü

Bu klasör, AirSense cihazının donanım (elektronik) geliştirme sürecine ait tüm dosyaları içerir.

🧩 İçerik:
- ESP32 tabanlı devre şemaları (KiCad dosyaları)
- Sensör bağlantı devreleri (SHT31, MH-Z19B, CCS811)
- Güç yönetimi (Li-Po batarya, şarj devresi)
- PCB tasarım dosyaları (Gerber, layout, BOM)
- 3D baskı kasası (Fusion360 veya STL dosyaları)
- Firmware kaynak kodları (Arduino veya ESP-IDF)

🛠 Geliştirme Süreci:
1. Devre prototipini breadboard üzerinde test et.
2. Sensörlerden gelen verileri seri port üzerinden kontrol et.
3. ESP32 üzerinde BLE/Wi-Fi veri gönderimini doğrula.
4. PCB tasarımını tamamlayıp test baskısı al.
5. 3D kasa ile donanımı monte et ve test ölçümlerini al.

📄 Not:
Bu klasörde yalnızca donanım ve gömülü yazılım (firmware) ile ilgili belgeler bulunmalıdır.

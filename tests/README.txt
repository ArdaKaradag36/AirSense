🧪 AirSense – Test ve Kalibrasyon Bölümü

Bu klasör, cihaz ve yazılımın test edilmesi için gerekli tüm test senaryoları, veriler ve raporları içerir.

🧩 İçerik:
- Sensör doğruluk testleri (karşılaştırmalı ölçüm verileri)
- Mobil uygulama veri senkronizasyon testleri
- BLE/Wi-Fi bağlantı kararlılık testleri
- Batarya ömrü ölçüm sonuçları
- Kritik eşik uyarı test senaryoları
- Kullanıcı deneyimi değerlendirme raporları

⚙️ Test Süreci:
1. Referans ölçüm cihazlarıyla karşılaştırma yap.
2. ESP32 verilerini seri port ve uygulama üzerinden izle.
3. Flutter debug console ile veri senkronizasyonunu doğrula.
4. Uzun süreli testlerde batarya ve bağlantı stabilitesini kaydet.
5. Sonuçları dokümante ederek docs/ klasörüne raporla.

📄 Not:
Her testin tarihi, koşulları ve sonuçları net biçimde belirtilmelidir.

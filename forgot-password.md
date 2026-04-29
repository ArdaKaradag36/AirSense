# AirSense Pro — Şifremi Unuttum / Sıfırlama Akışı Raporu

Bu belge, şifre sıfırlama (forgot password) özelliğinin uygulanması, yapılandırma adımları ve karşılaşılan hataların özetidir. İnceleme için hazırlanmıştır.

---

## 1. Uygulanan Özellikler

### 1.1 Yeni ekranlar (Expo Router)

| Dosya | Açıklama |
|-------|----------|
| `mobile-app/app/(auth)/forgot-password.tsx` | E-posta girilir; `supabase.auth.resetPasswordForEmail` çağrılır. Başarıda uyarı ve login’e yönlendirme. |
| `mobile-app/app/(auth)/reset-password.tsx` | Yeni şifre + tekrar; `validatePasswordForRegister` ile canlı kurallar; `supabase.auth.updateUser({ password })`. |

### 1.2 Ortak parola kuralları

| Dosya | Açıklama |
|-------|----------|
| `mobile-app/utils/password.ts` | `PASSWORD_MIN_LENGTH`, `validatePasswordForRegister` — kayıt ve sıfırlama aynı kuralları kullanır. |

### 1.3 Servis katmanı

| Dosya | Değişiklik |
|-------|------------|
| `mobile-app/services/authService.ts` | `sendPasswordResetEmail`, `updatePassword`, `setRecoverySession`; `onAuthStateChange` artık `(session, event)` ile `PASSWORD_RECOVERY` yakalanır. |

### 1.4 AuthContext

| Dosya | Değişiklik |
|-------|------------|
| `mobile-app/context/AuthContext.tsx` | `recoveryMode`, `clearRecoveryMode()`; `PASSWORD_RECOVERY` olayında `recoveryMode = true`. Çıkışta sıfırlanır. |

### 1.5 Kök navigasyon ve deep link

| Dosya | Değişiklik |
|-------|------------|
| `mobile-app/app/_layout.tsx` | `Linking.getInitialURL` / `addEventListener('url')`: URL fragment’inden `type=recovery`, `access_token`, `refresh_token` okunur → `authService.setRecoverySession`. `recoveryMode` iken `Stack` anahtarı `"recovery"`; `router.replace('/(auth)/reset-password')`. |

### 1.6 Login entegrasyonu

| Dosya | Değişiklik |
|-------|------------|
| `mobile-app/app/(auth)/login.tsx` | "Şifremi Unuttum" → `/(auth)/forgot-password`. |

### 1.7 Auth layout

| Dosya | Değişiklik |
|-------|------------|
| `mobile-app/app/(auth)/_layout.tsx` | `forgot-password`, `reset-password` Stack ekranları kayıtlı. |

### 1.8 İsteğe bağlı yönlendirme (env)

| Değişken | Açıklama |
|----------|----------|
| `EXPO_PUBLIC_PASSWORD_RESET_REDIRECT` | Tanımlıysa sıfırlama mailindeki `redirect_to` bu URL olur (örn.development build için `mobileapp://reset-password`). Boşsa `Linking.createURL('reset-password')` → Expo Go’da tipik olarak `exp://IP:8081/--/reset-password`. |

`mobile-app/.env.example` içinde yorum satırı olarak belirtildi.

### 1.9 Kullanıcıya gösterilen ek notlar

- `forgot-password.tsx`: Ekranda ve başarı `Alert` içinde **linkin telefonda açılması** gerektiği; masaüstü Chrome’un `exp://` açamayacağı anlatıldı.

---

## 2. Supabase Dashboard Yapılandırması

Kullanıcı tarafında yapılan / önerilen ayarlar:

- **Authentication → URL Configuration → Redirect URLs:**  
  `mobileapp://*`, `mobileapp://reset-password`, `exp://*`, çeşitli `localhost` / `exp://` varyantları eklendi.  
- **Site URL:** Geliştirme için bazen `exp://...` kullanıldı; üretimde gerçek site / sabit scheme ile güncellenmeli.

**Kritik:** `resetPasswordForEmail` içinde gönderilen `redirectTo` değeri, bu listede **tam olarak** veya wildcard ile eşleşmeli.

---

## 3. Deep Link / Scheme Notları (`app.json`)

- `expo.scheme`: **`mobileapp`** (özel scheme).
- Expo Go ile geliştirme sırasında `Linking.createURL` çoğu zaman **`exp://<LAN-IP>:8081/--/reset-password`** üretir; bu da Redirect URL listesinde kabul edilmelidir (`exp://*` veya ilgili satırlar).

---

## 4. Karşılaşılan Hatalar ve Çözümler

### 4.1 Backend: `500 Internal Server Error` + `name 'supabase' is not defined`

**Belirti:** `POST /api/v1/data` 500; log: `Sistem Hatası: name 'supabase' is not defined`.  
**Neden:** `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` eksik → `create_client` başarısız; `except` sonrası `supabase` hiç atanmıyordu.  
**Çözüm:** `backend/main.py` içinde `load_dotenv()`, `supabase: Optional[Client] = None`, `require_supabase()` ile bağlantı yokken **503** ve anlaşılır mesaj. `backend/.env.example` eklendi.  
**Kullanıcı aksiyonu:** `backend/.env` içinde gerçek URL ve **service_role** anahtarı tanımlanmalı; uvicorn yeniden başlatılmalı.

### 4.2 Şifre sıfırlama linki: masaüstü Chrome’da boş / gri sayfa

**Belirti:** Gmail’den linke tıklanınca `google.com/url?q=...supabase...verify...type=recovery...redirect_to=exp://...` açılıyor, sayfa boş kalıyor.  
**Neden:** `exp://` protokolü masaüstü tarayıcısında desteklenmez; yönlendirme Expo Go’ya iletilemez.  
**Çözüm (kullanım):** Linki **telefonda** (Gmail uygulaması + Expo Go yüklü cihaz) açmak. Şifre sıfırlama isteği mümkünse **aynı ağdaki** uygulamadan gönderilmeli ki `exp://` içindeki IP güncel kalsın.  
**Belgeleme:** `forgot-password.tsx` içinde kullanıcıya bu durum metin olarak iletildi.

### 4.3 Olası diğer durumlar

| Durum | Öneri |
|-------|-------|
| Wi‑Fi / IP değişti | Yeni sıfırlama e-postası iste; eski maildeki `exp://EskiIP` geçersiz kalır. |
| Yalnızca development build | `.env` ile `EXPO_PUBLIC_PASSWORD_RESET_REDIRECT=mobileapp://reset-password` denenebilir; Supabase listesinde `mobileapp://` izinli olmalı. |
| Leaked Password Protection (HIBP) | Bazı Supabase planlarında kapalı / kısıtlı; parola gücü için uygulama tarafında `register.tsx` kuralları kullanıldı. |

---

## 5. Test Kontrol Listesi

1. **Şifremi unuttum** → e-posta gir → başarı uyarısı.  
2. **Telefonda** e-postadaki bağlantıya dokun.  
3. Uygulama açılıp **Yeni şifre** ekranına düşmeli.  
4. Kuralları sağlayan şifre + **Şifreyi güncelle** → başarı → login ile yeni şifre.  
5. Konsol logları: `[ForgotPassword]`, `[RootLayout]`, `[AuthContext]` prefix’leri.

---

## 6. İlgili Dosya Listesi (referans)

```
mobile-app/app/(auth)/forgot-password.tsx
mobile-app/app/(auth)/reset-password.tsx
mobile-app/app/(auth)/login.tsx
mobile-app/app/(auth)/_layout.tsx
mobile-app/app/_layout.tsx
mobile-app/context/AuthContext.tsx
mobile-app/services/authService.ts
mobile-app/utils/password.ts
mobile-app/.env.example
backend/main.py          (Supabase env; 500/NameError düzeltmesi)
backend/.env.example
```

---

## 7. Not

Dosya adı isteği "forger password" ifadesi düzeltilerek **`forgot-password.md`** olarak proje köküne kaydedildi (`/home/arda/software/AirSense/forgot-password.md`).

*Son güncelleme: rapor, konuşma özeti ve kod tabanı durumuna göre hazırlanmıştır.*

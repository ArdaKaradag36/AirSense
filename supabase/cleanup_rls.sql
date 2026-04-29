-- =====================================================================
-- AirSense Pro — Veritabani Temizlik (Cleanup) Scripti
-- =====================================================================
-- Bu dosya `setup_rls.sql` calistirildiktan sonra geride kalan eski/cift
-- politikalari ve diger artiklari temizler. Idempotent yapidadir; birden
-- fazla calistirilabilir.
--
-- Calistirma:  Supabase Dashboard -> SQL Editor -> New Query -> bu
-- dosyanin tamamini yapistir -> Run.
--
-- ONEMLI: setup_rls.sql icinde tanimlanan TEMIZ politikalara bu dosya
-- HIC dokunmaz. Sadece eski/duplicate olanlar drop edilir.
-- =====================================================================


-- =====================================================================
-- 1. devices tablosu: eski/duplicate politikalari kaldir
-- =====================================================================
-- Kaldirilan politikalar ve nedenleri:
--   * "Users can update their own device labels"
--       -> "devices_update_own" ile birebir ayni (auth.uid() = user_id)
--   * "claim_device"
--       -> "devices_claim_unclaimed" ile fonksiyonel olarak ayni
--   * "devices_select_unclaimed_or_own"
--       -> Anon kullanicilar icin "devices_anon_verify_unclaimed",
--          authenticated kullanicilar icin "devices_select_own" yeterli
--   * "Anonim kisiler sahipsiz cihazlari sorgulayabilir"
--       -> Ayni mantigi temiz isimli "devices_anon_verify_unclaimed"
--          policy'si ile yeniden olusturuyoruz (asagida).

DROP POLICY IF EXISTS "Users can update their own device labels" ON public.devices;
DROP POLICY IF EXISTS "claim_device" ON public.devices;
DROP POLICY IF EXISTS "devices_select_unclaimed_or_own" ON public.devices;
DROP POLICY IF EXISTS "Anonim kisiler sahipsiz cihazlari sorgulayabilir" ON public.devices;


-- =====================================================================
-- 2. devices: anon onboarding icin TEMIZ replacement policy
-- =====================================================================
-- deviceService.verifyUnclaimedDevice cagrisi henuz signup olmamis (anon)
-- kullaniciyla calisir. Bu yuzden anon rolu icin sadece user_id IS NULL
-- olan satirlari SELECT etme izni verilmelidir. Daraltilmis kapsamli
-- (sadece anon rolu) bir policy ile bu akisi sürdürüyoruz.

DROP POLICY IF EXISTS "devices_anon_verify_unclaimed" ON public.devices;
CREATE POLICY "devices_anon_verify_unclaimed"
  ON public.devices
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (user_id IS NULL);


-- =====================================================================
-- 3. users tablosu: eski/duplicate politikalari kaldir
-- =====================================================================
-- Kaldirilan politikalar ve nedenleri:
--   * "users_select_own"  -> "users_select_self" ile birebir ayni
--   * "users_update_own"  -> "users_update_self" ile birebir ayni

DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;


-- =====================================================================
-- 4. sensor_readings tablosu: temiz, dokunmaya gerek yok
-- =====================================================================
-- setup_rls.sql ile devreye giren 4 politika (select/insert/update/delete
-- *_own) yeterli ve eski kalintisi yok. Bu blok bilgi amaclidir.


-- =====================================================================
-- 5. mobile_clients tablosu: RLS aktif fakat policy yok (advisor uyarisi)
-- =====================================================================
-- backend/main.py push token kayitlari icin SERVICE_ROLE anahtari ile
-- erisir; service_role tum RLS'leri bypass eder. Anon ve authenticated
-- kullanicilar tablonun icerigine REST API uzerinden erismemelidir.
-- Asagida actions explicit olarak DENY edilir (PERMISSIVE policy yok =
-- erisim yok). pg_advisor uyarisini gidermek icin acik niyet beyani
-- olarak RESTRICTIVE policy ekliyoruz.

DROP POLICY IF EXISTS "mobile_clients_no_public_access" ON public.mobile_clients;
CREATE POLICY "mobile_clients_no_public_access"
  ON public.mobile_clients
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);


-- =====================================================================
-- 6. handle_new_user(): RPC olarak cagrilamasin
-- =====================================================================
-- Advisor uyarisi: SECURITY DEFINER fonksiyon `anon` ve `authenticated`
-- rolleri tarafindan /rest/v1/rpc/handle_new_user uzerinden tetiklenebilir.
-- Bu fonksiyon yalnizca auth.users uzerindeki on_auth_user_created
-- trigger'i icin var; trigger calisirken EXECUTE izni gerekmez (sahibi
-- yetkisiyle calisir). Bu yuzden istemcilerden EXECUTE iznini guvenle
-- geri alabiliriz.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;


-- =====================================================================
-- 7. Performans: indekslenmemis foreign key (advisor)
-- =====================================================================
-- sensor_readings.device_serial (FK -> devices.serial_number) icin
-- covering index yok. RLS subquery'leri ve cihaz bazli sorgular bu
-- indeksten ciddi fayda gorur.

CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_serial
  ON public.sensor_readings (device_serial);


-- =====================================================================
-- 8. Dogrulama sorgusu: temizlik sonrasi aktif politikalar
-- =====================================================================
-- Asagidaki SELECT, public schema'sindaki TUM aktif politikalari
-- listeler. Beklenen sonuc:
--   devices         -> 5 policy
--                       (devices_anon_verify_unclaimed,
--                        devices_claim_unclaimed,
--                        devices_delete_own,
--                        devices_insert_own,
--                        devices_select_own,
--                        devices_update_own)   -> toplam 6
--   sensor_readings -> 4 policy (*_own)
--   users           -> 4 policy (*_self)
--   mobile_clients  -> 1 policy (mobile_clients_no_public_access)

SELECT schemaname, tablename, policyname, cmd, roles
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;


-- =====================================================================
-- 9. (Opsiyonel) RLS init plan optimizasyonu — NOT
-- =====================================================================
-- Supabase performans advisor "auth.uid()" cagrilarinin her satirda
-- yeniden hesaplanmamasi icin "(select auth.uid())" sarmalamasini
-- onerir. Bu, mevcut setup_rls.sql politikalarinin tumunu etkiler ve
-- ayri bir refactor olarak `setup_rls.sql` icinde uygulanmalidir.
-- Bu cleanup script'inin kapsami disindadir.


-- =====================================================================
-- 10. (Opsiyonel) Manuel kontrol edilecek kalintilar — NOT
-- =====================================================================
-- Asagidaki kolonlar canli kullanimda oldugu icin BIRAKILMISTIR:
--   * sensor_readings.is_alert  -> backend/main.py satir 93/102/110
--                                  HAZARDOUS seviyesinde alarm flag'i
--                                  olarak yazilir, mobil okumaz.
--   * mobile_clients tablosu     -> backend push token store
--                                  (registerPushToken/unregisterPushToken)
--
-- Eger ileride bu yollar kapatilirsa kolonu/tabloyu DROP etmek guvenli
-- olur. Su an icin DOKUNMA.

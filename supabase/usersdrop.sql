-- ============================================================
-- AirSense: Tüm kullanıcıları ve cihaz bağlantılarını sıfırla
-- Supabase Dashboard > SQL Editor'dan çalıştır
-- ============================================================

-- 1. Tüm cihazların user_id bağlantısını kopar (cihazları silme)
UPDATE public.devices SET user_id = NULL;

-- 2. public.users tablosundaki tüm kayıtları sil
DELETE FROM public.users;

-- 3. mobile_clients (push token) temizle
DELETE FROM public.mobile_clients;

-- 4. Auth kullanıcılarını sil (service_role gerektirir)
DELETE FROM auth.users
WHERE email NOT IN (
  -- Buraya korumak istediğin admin e-postalarını ekle, yoksa boş bırak
  -- 'admin@airsense.com'
  SELECT NULL::text LIMIT 0
);

-- Sonuç kontrolü
SELECT 'devices' AS tablo, COUNT(*) AS kalan_kayit FROM public.devices
UNION ALL
SELECT 'devices user_id=NULL', COUNT(*) FROM public.devices WHERE user_id IS NULL
UNION ALL
SELECT 'auth.users', COUNT(*) FROM auth.users
UNION ALL
SELECT 'public.users', COUNT(*) FROM public.users
UNION ALL
SELECT 'mobile_clients', COUNT(*) FROM public.mobile_clients;

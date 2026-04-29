-- =====================================================================
-- AirSense Pro — Row Level Security (RLS) Kurulum Scripti
-- =====================================================================
-- Bu dosya Supabase SQL Editor'de manuel olarak calistirilmalidir.
-- Calistirma: Dashboard -> SQL Editor -> New Query -> bu dosyanin icerigini
-- yapistir -> Run.
--
-- Idempotent yapi: politikalar drop edilip yeniden olusturulur, boylece
-- script birden fazla kez calistirilabilir.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. RLS'i tum hassas tablolarda aktiflestir
-- ---------------------------------------------------------------------
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- 2. devices tablosu politikalari
-- ---------------------------------------------------------------------
-- Onerilen veri modeli: devices.user_id (uuid, nullable) -> auth.users.id

DROP POLICY IF EXISTS "devices_select_own" ON public.devices;
CREATE POLICY "devices_select_own"
  ON public.devices
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "devices_update_own" ON public.devices;
CREATE POLICY "devices_update_own"
  ON public.devices
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cihaz claim akisi: deviceService.claimDevice user_id IS NULL olan
-- satirlari kendi user_id'si ile gunceller. Asagidaki policy bu akisi
-- mumkun kilar; aksi halde onboarding bozulur.
DROP POLICY IF EXISTS "devices_claim_unclaimed" ON public.devices;
CREATE POLICY "devices_claim_unclaimed"
  ON public.devices
  FOR UPDATE
  USING (user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "devices_insert_own" ON public.devices;
CREATE POLICY "devices_insert_own"
  ON public.devices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "devices_delete_own" ON public.devices;
CREATE POLICY "devices_delete_own"
  ON public.devices
  FOR DELETE
  USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- 3. sensor_readings tablosu politikalari
-- ---------------------------------------------------------------------
-- sensor_readings.device_serial -> devices.serial_number ile dolayli
-- olarak user'a baglanir. Direkt user_id kolonu yoktur, bu yuzden
-- subquery ile filtreliyoruz.

DROP POLICY IF EXISTS "sensor_readings_select_own" ON public.sensor_readings;
CREATE POLICY "sensor_readings_select_own"
  ON public.sensor_readings
  FOR SELECT
  USING (
    device_serial IN (
      SELECT serial_number FROM public.devices
      WHERE user_id = auth.uid()
    )
  );

-- Yazma islemleri: Genelde IoT cihaz/backend service_role anahtariyla
-- insert eder ve RLS'i bypass'lar. Yine de end-user istemcisinin yanlis
-- yere veri yazmasini engellemek icin asagidaki politikalari koruyoruz.
DROP POLICY IF EXISTS "sensor_readings_insert_own" ON public.sensor_readings;
CREATE POLICY "sensor_readings_insert_own"
  ON public.sensor_readings
  FOR INSERT
  WITH CHECK (
    device_serial IN (
      SELECT serial_number FROM public.devices
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sensor_readings_update_own" ON public.sensor_readings;
CREATE POLICY "sensor_readings_update_own"
  ON public.sensor_readings
  FOR UPDATE
  USING (
    device_serial IN (
      SELECT serial_number FROM public.devices
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    device_serial IN (
      SELECT serial_number FROM public.devices
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sensor_readings_delete_own" ON public.sensor_readings;
CREATE POLICY "sensor_readings_delete_own"
  ON public.sensor_readings
  FOR DELETE
  USING (
    device_serial IN (
      SELECT serial_number FROM public.devices
      WHERE user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------
-- 4. users tablosu politikalari
-- ---------------------------------------------------------------------
-- Onerilen veri modeli: public.users.id (uuid) -> auth.users.id
-- Kullanici sadece kendi profilini okur ve guncelleyebilir.

DROP POLICY IF EXISTS "users_select_self" ON public.users;
CREATE POLICY "users_select_self"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_self" ON public.users;
CREATE POLICY "users_insert_self"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_delete_self" ON public.users;
CREATE POLICY "users_delete_self"
  ON public.users
  FOR DELETE
  USING (auth.uid() = id);


-- ---------------------------------------------------------------------
-- 5. Dogrulama sorgulari (manuel calistirma icin)
-- ---------------------------------------------------------------------
-- Asagidaki sorgular SQL Editor'de calistirildiginda RLS'in tum
-- tablolarda aktif oldugunu ve politikalarin yuklendigini gosterir.
--
-- SELECT relname, relrowsecurity
--   FROM pg_class
--   WHERE relname IN ('devices', 'sensor_readings', 'users');
--
-- SELECT schemaname, tablename, policyname, cmd
--   FROM pg_policies
--   WHERE tablename IN ('devices', 'sensor_readings', 'users')
--   ORDER BY tablename, policyname;

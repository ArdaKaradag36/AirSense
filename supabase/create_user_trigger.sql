-- =====================================================================
-- AirSense Pro — auth.users INSERT trigger
-- =====================================================================
-- Bu trigger, bir kullanici auth.users'a kayit oldugunda otomatik olarak
-- public.users tablosuna karsilik gelen satiri olusturur.
-- Supabase Dashboard > SQL Editor'de calistirin.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, username, email, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Eski trigger varsa kaldir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger'i olustur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- =====================================================================
-- Unclaimed cihazlari anonim/authenticated kullanicilarin gorebilmesi icin
-- SELECT policy (onboarding sirasinda cihaz dogrulamasi icin gerekli)
-- =====================================================================
DROP POLICY IF EXISTS "devices_select_unclaimed" ON public.devices;
CREATE POLICY "devices_select_unclaimed"
  ON public.devices
  FOR SELECT
  USING (user_id IS NULL);

import { isSupabaseConfigured, safeStorage, supabase } from "./supabaseClient";

export const PENDING_DEVICE_SERIAL_KEY = "pending_device_serial";

/**
 * Device-first onboarding notu:
 * Uygulamaya kayit akisina gecmeden once cihaz seri numarasinin dogrulanmasi zorunludur.
 * Bu sayede urun yalnizca fiziksel cihaza sahip kullanicilar tarafindan aktive edilir.
 */
export const deviceService = {
  ensureConfig() {
    if (!isSupabaseConfigured) {
      throw new Error(
        "Supabase ayarlari eksik. Cihaz dogrulamasi icin `.env` icindeki Supabase URL ve anon key degerlerini tamamlayin."
      );
    }
  },

  async savePendingDeviceSerial(serialNumber: string): Promise<void> {
    const normalized = serialNumber.trim().toUpperCase();
    console.log("[deviceService] savePendingDeviceSerial:", normalized);
    await safeStorage.setItem(PENDING_DEVICE_SERIAL_KEY, normalized);
  },

  async getPendingDeviceSerial(): Promise<string | null> {
    const value = await safeStorage.getItem(PENDING_DEVICE_SERIAL_KEY);
    console.log("[deviceService] getPendingDeviceSerial:", value);
    return value;
  },

  async clearPendingDeviceSerial(): Promise<void> {
    console.log("[deviceService] clearPendingDeviceSerial");
    await safeStorage.removeItem(PENDING_DEVICE_SERIAL_KEY);
  },

  async verifyUnclaimedDevice(serialNumber: string): Promise<boolean> {
    this.ensureConfig();
    const normalized = serialNumber.trim().toUpperCase();
    console.log("[deviceService] verifyUnclaimedDevice:", normalized);
    if (!normalized) return false;

    const { data, error } = await supabase
      .from("devices")
      .select("id")
      .eq("serial_number", normalized)
      .is("user_id", null)
      .limit(1);

    if (error) {
      console.error("[deviceService] verifyUnclaimedDevice hatasi:", error.message);
      throw error;
    }
    const result = Array.isArray(data) && data.length > 0;
    console.log("[deviceService] verifyUnclaimedDevice sonuc:", result, "| data:", data);
    return result;
  },

  /**
   * userId parametresi signUp aninda dogrudan gecilebilir.
   * Bu sayede email onay asamasinda Supabase session henuz oturmamissa bile
   * zimmetleme islemi gerceklestirilebilir.
   */
  async claimDevice(serialNumber: string, userId?: string): Promise<void> {
    this.ensureConfig();
    const normalized = serialNumber.trim().toUpperCase();
    if (!normalized) throw new Error("Gecerli bir cihaz seri numarasi bulunamadi.");

    let uid = userId;

    if (!uid) {
      console.log("[deviceService] claimDevice: userId verilmedi, supabase.auth.getUser() ile aliniyor...");
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("[deviceService] claimDevice getUser hatasi:", userError.message);
        throw userError;
      }
      if (!user) throw new Error("Cihaz zimmetleme icin aktif bir kullanici oturumu bulunamadi.");
      uid = user.id;
    }

    console.log(`[deviceService] claimDevice: serial=${normalized}, userId=${uid}`);

    const { data, error } = await supabase
      .from("devices")
      .update({ user_id: uid })
      .eq("serial_number", normalized)
      .is("user_id", null)
      .select();

    console.log("[deviceService] claimDevice Zimmetleme Sonucu:", JSON.stringify(data), "| hata:", error?.message ?? "yok");

    if (error) {
      console.error("[deviceService] claimDevice UPDATE hatasi:", error.message, "| code:", error.code);
      throw error;
    }
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Cihaz zimmetlenemedi. Cihaz baska bir hesaba ait olabilir veya seri no yanlis.");
    }
    console.log(`[deviceService] claimDevice: BASARILI, zimmetlenen device:`, JSON.stringify(data[0]));
  },

  async hasUserDevice(): Promise<boolean> {
    this.ensureConfig();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("[deviceService] hasUserDevice: kullanici yok veya hata:", userError?.message);
      return false;
    }

    const { data, error } = await supabase
      .from("devices")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (error) {
      console.error("[deviceService] hasUserDevice hatasi:", error.message);
      throw error;
    }
    const result = Array.isArray(data) && data.length > 0;
    console.log("[deviceService] hasUserDevice:", result, "| userId:", user.id);
    return result;
  },

  async getUserDeviceSerial(): Promise<string | null> {
    this.ensureConfig();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("[deviceService] getUserDeviceSerial getUser hatasi:", userError.message);
      throw userError;
    }
    if (!user) return null;

    const { data, error } = await supabase
      .from("devices")
      .select("serial_number")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[deviceService] getUserDeviceSerial query hatasi:", error.message);
      throw error;
    }

    const serial = data?.serial_number ?? null;
    console.log("[deviceService] getUserDeviceSerial:", serial, "| userId:", user.id);
    return serial;
  },

  async getCurrentUsername(): Promise<string | null> {
    this.ensureConfig();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[deviceService] getCurrentUsername getUser hatasi:", userError.message);
      throw userError;
    }
    if (!user) return null;

    const { data, error } = await supabase
      .from("users")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[deviceService] getCurrentUsername query hatasi:", error.message);
      throw error;
    }

    const username = data?.username ?? null;
    console.log("[deviceService] getCurrentUsername:", username, "| userId:", user.id);
    return username;
  },
};

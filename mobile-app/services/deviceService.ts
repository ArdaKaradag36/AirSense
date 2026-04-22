import AsyncStorage from "@react-native-async-storage/async-storage";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

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
    await AsyncStorage.setItem(PENDING_DEVICE_SERIAL_KEY, serialNumber.trim().toUpperCase());
  },

  async getPendingDeviceSerial(): Promise<string | null> {
    return AsyncStorage.getItem(PENDING_DEVICE_SERIAL_KEY);
  },

  async clearPendingDeviceSerial(): Promise<void> {
    await AsyncStorage.removeItem(PENDING_DEVICE_SERIAL_KEY);
  },

  async verifyUnclaimedDevice(serialNumber: string): Promise<boolean> {
    this.ensureConfig();
    const normalized = serialNumber.trim().toUpperCase();
    if (!normalized) return false;

    const { data, error } = await supabase
      .from("devices")
      .select("id")
      .eq("serial_number", normalized)
      .is("user_id", null)
      .limit(1);

    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  },

  async claimDevice(serialNumber: string): Promise<void> {
    this.ensureConfig();
    const normalized = serialNumber.trim().toUpperCase();
    if (!normalized) throw new Error("Gecerli bir cihaz seri numarasi bulunamadi.");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("Cihaz zimmetleme icin aktif bir kullanici oturumu bulunamadi.");

    const { data, error } = await supabase
      .from("devices")
      .update({ user_id: user.id })
      .eq("serial_number", normalized)
      .is("user_id", null)
      .select("id")
      .limit(1);

    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Cihaz zimmetlenemedi. Cihaz baska bir hesaba ait olabilir.");
    }
  },
};

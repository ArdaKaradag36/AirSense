import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * Expo istemci tarafinda sadece `EXPO_PUBLIC_` ile baslayan degiskenler bundlera dahil edilir.
 * Bu nedenle Supabase URL ve ANON KEY degeri bu formatla `.env` icinden okunur.
 */
const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const isValidHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Ornek `.env` dosyasinda placeholder degerler oldugu durumda uygulama acilisini kirmamak icin
 * once URL dogrulamasi yapiyoruz. Gecersiz URL varsa guvenli fallback'e dusup auth islemlerinde
 * anlasilir bir hata mesaji uretecegiz.
 */
const hasValidUrl = isValidHttpUrl(rawSupabaseUrl);
const hasAnonKey = rawSupabaseAnonKey.length > 0 && !rawSupabaseAnonKey.includes("[");

export const isSupabaseConfigured = hasValidUrl && hasAnonKey;

const supabaseUrl = hasValidUrl ? rawSupabaseUrl : "https://example.supabase.co";
const supabaseAnonKey = hasAnonKey ? rawSupabaseAnonKey : "public-anon-key-placeholder";

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase env degerleri eksik/gecersiz. `.env` icinde `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` degerlerini gercek bilgilerle guncelleyin."
  );
}

const memoryStorage = new Map<string, string>();

/**
 * Expo Go veya emulator gecislerinde AsyncStorage native modulu gecici olarak hazir olmayabilir.
 * Bu wrapper, kalici storage hata verirse memory fallback ile auth akisini ayakta tutar.
 */
export const safeStorage = {
  async getItem(key: string) {
    try {
      if (AsyncStorage?.getItem) {
        const value = await AsyncStorage.getItem(key);
        return value;
      }
    } catch {
      // no-op: memory fallback
    }
    return memoryStorage.get(key) ?? null;
  },
  async setItem(key: string, value: string) {
    try {
      if (AsyncStorage?.setItem) {
        await AsyncStorage.setItem(key, value);
        return;
      }
    } catch {
      // no-op: memory fallback
    }
    memoryStorage.set(key, value);
  },
  async removeItem(key: string) {
    try {
      if (AsyncStorage?.removeItem) {
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // no-op: memory fallback
    } finally {
      memoryStorage.delete(key);
    }
  },
  async clearAll() {
    try {
      if (AsyncStorage?.clear) {
        await AsyncStorage.clear();
      }
    } catch {
      // no-op: memory fallback
    } finally {
      memoryStorage.clear();
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

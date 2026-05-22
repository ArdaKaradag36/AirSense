import Constants from "expo-constants";

function normalizeBase(url: string): string {
  return url.replace(/\/$/, "");
}

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

/**
 * Yerel FastAPI kök adresi (şema + host + port, path yok).
 * Öncelik:
 *   1) EXPO_PUBLIC_API_BASE_URL  (mobile-app/.env)
 *   2) app.config.js extra.apiBaseUrl
 *
 * Hardcoded fallback BİLEREK kaldırıldı: LAN IP değiştiğinde mobil uygulamanın
 * sessizce eski IP'ye gitmesini önlemek için. .env eksikse uygulama açık
 * hata verir (ipucu: SECTORALPROJE.md).
 */
const resolved =
  process.env.EXPO_PUBLIC_API_BASE_URL || extra?.apiBaseUrl || "";

if (!resolved) {
  console.warn(
    "[api] EXPO_PUBLIC_API_BASE_URL tanimsiz. mobile-app/.env dosyasina " +
      "EXPO_PUBLIC_API_BASE_URL=http://<laptop-LAN-IP>:8000 ekleyin ve " +
      "Expo'yu cache temizleyerek yeniden baslatin: npx expo start -c"
  );
}

export const API_BASE_URL = normalizeBase(resolved);
export const isApiBaseUrlConfigured = resolved.length > 0;

export function apiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error(
      "API_BASE_URL tanimsiz. mobile-app/.env icine EXPO_PUBLIC_API_BASE_URL ekleyin."
    );
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}

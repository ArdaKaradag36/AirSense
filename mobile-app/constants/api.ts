import Constants from "expo-constants";

function normalizeBase(url: string): string {
  return url.replace(/\/$/, "");
}

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

/**
 * Yerel FastAPI kök adresi (şema + host + port, path yok).
 * Öncelik: EXPO_PUBLIC_API_BASE_URL → app.config extra → varsayılan (önceki makine LAN IP).
 */
export const API_BASE_URL = normalizeBase(
  process.env.EXPO_PUBLIC_API_BASE_URL ||
    extra?.apiBaseUrl ||
    "http://192.168.1.105:8000"
);

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}

// Dosya Yolu: mobile-app/context/SensorContext.tsx

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { apiUrl } from "@/constants/api";

// Telefon ve backend aynı ağda olmalı; IP: mobile-app/.env içinde EXPO_PUBLIC_API_BASE_URL
const API_URL = apiUrl("/api/v1/history");

// Veri Tipleri
interface SensorData {
  id?: number;
  temperature: number;
  humidity: number;
  co2_ppm: number;
  voc_index: number;
  air_quality_status: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  received_at: string;
}

interface SensorContextType {
  data: SensorData | null; // En son veri (Tekil)
  history: SensorData[]; // Geçmiş veriler (Grafik için liste)
  notifications: AppNotification[];
  unreadCount: number;
  phoneNotificationsEnabled: boolean;
  setPhoneNotificationsEnabled: (enabled: boolean) => void;
  clearNotifications: () => void;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const SensorContext = createContext<SensorContextType | undefined>(undefined);

export const SensorProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [phoneNotificationsEnabled, setPhoneNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const lastAlertKeyRef = useRef<string>("");
  const unreadCount = notifications.length;
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const addAppNotification = (notification: AppNotification) => {
    setNotifications((prev) => {
      const threshold = Date.now() - ONE_WEEK_MS;
      const fresh = prev.filter((item) => {
        const t = new Date(item.received_at).getTime();
        return Number.isFinite(t) && t >= threshold;
      });
      return [notification, ...fresh].slice(0, 200);
    });
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}?serial_number=AIRSENSE-PRO-001`);
      const data = await response.json();
      // Backend veriyi liste olarak dönüyor
      if (
        data &&
        Array.isArray(data) &&
        data.length > 0
      ) {
        const mappedHistory: SensorData[] = data.map((item: any) => ({
          id: item.id,
          temperature: Number(item.temperature ?? 0),
          humidity: Number(item.humidity ?? 0),
          co2_ppm: Number(item.co2_ppm ?? 0),
          voc_index: Number(item.voc_index ?? 0),
          air_quality_status: String(item.air_quality_status ?? "UNKNOWN"),
          created_at: String(item.created_at ?? ""),
        }));

        setHistory(mappedHistory); // Listeyi kaydet (Grafikler için)
        setData(mappedHistory[0]); // En güncel veriyi (ilk eleman) kaydet

        const latestReading = mappedHistory[0];
        const latestStatus = latestReading.air_quality_status;
        const shouldAlert = latestStatus === "UNHEALTHY" || latestStatus === "HAZARDOUS";
        if (shouldAlert) {
          const alertKey = `${latestReading.created_at}-${latestStatus}`;
          if (lastAlertKeyRef.current !== alertKey) {
            const alertLabel = latestStatus === "HAZARDOUS" ? "Tehlikeli" : "Sagliksiz";
            const appNotification: AppNotification = {
              id: alertKey,
              title: `Hava Kalitesi ${alertLabel}`,
              message: `CO2 ${latestReading.co2_ppm} ppm | VOC ${latestReading.voc_index}`,
              received_at: new Date().toISOString(),
            };
            addAppNotification(appNotification);

            if (phoneNotificationsEnabled && Platform.OS !== "web") {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: appNotification.title,
                    body: appNotification.message,
                    sound: "default",
                  },
                  trigger: null,
                });
              } catch (notifError) {
                console.error("Telefon bildirimi gönderilemedi:", notifError);
              }
            }
            lastAlertKeyRef.current = alertKey;
          }
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Veri Çekme Hatası:", error);
      // Hata olsa bile loading'i kapat ki sonsuz döngüde kalmasın
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Simülatör 10 saniyede bir veri gönderiyor, biz de 10 saniyede bir çekelim.
    const interval: any = setInterval(fetchData, 10000);

    return () => clearInterval(interval);
  }, []);

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SensorContext.Provider
      value={{
        data,
        history,
        notifications,
        unreadCount,
        phoneNotificationsEnabled,
        setPhoneNotificationsEnabled,
        clearNotifications,
        loading,
        refreshData: fetchData,
      }}
    >
      {children}
    </SensorContext.Provider>
  );
};

// Sayfalarda kullanacağımız özel kanca (hook)
export const useSensorData = () => {
  const context = useContext(SensorContext);
  if (!context) {
    throw new Error("useSensorData must be used within a SensorProvider");
  }
  return context;
};

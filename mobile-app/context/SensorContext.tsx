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
import { apiService } from "../services/apiService";
import { Notification, SensorData } from "../types/sensor.types";

/**
 * Loose Coupling (Gevsek Baglilik) Notu:
 * - UI katmani (index/explore/safety) dogrudan fetch/Supabase/HTTP cagrisi yapmaz.
 * - Context katmani, ham ag cagrisi yerine servis katmanini (`apiService`) kullanir.
 * - Servis katmani farkli teknolojilere (MQTT, Supabase, TimescaleDB, baska API) gecis noktasi olarak tasarlanmistir.
 * Bu ayrim sayesinde protokol veya veri kaynagi degisince ekranlar degil, sadece servis implementasyonu guncellenir.
 */
interface SensorContextType {
  data: SensorData | null; // En son veri (Tekil)
  history: SensorData[]; // Geçmiş veriler (Grafik için liste)
  notifications: Notification[];
  unreadCount: number;
  phoneNotificationsEnabled: boolean;
  setPhoneNotificationsEnabled: (enabled: boolean) => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const SensorContext = createContext<SensorContextType | undefined>(undefined);

export const SensorProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [phoneNotificationsEnabled, setPhoneNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const lastAlertKeyRef = useRef<string>("");
  const unreadCount = notifications.length;
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const addAppNotification = (notification: Notification) => {
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
      console.log("[SensorContext] fetchData: istek atiliyor...");
      const mappedHistory = await apiService.getHistory({
        serialNumber: "AIRSENSE-PRO-001",
      });
      console.log("[SensorContext] fetchData: gelen kayit sayisi=", mappedHistory.length);
      if (mappedHistory.length > 0) {
        setHistory(mappedHistory);
        setData(mappedHistory[0]);

        const latestReading = mappedHistory[0];
        const latestStatus = latestReading.air_quality_status;
        const shouldAlert = latestStatus === "UNHEALTHY" || latestStatus === "HAZARDOUS";
        if (shouldAlert) {
          const alertKey = `${latestReading.created_at}-${latestStatus}`;
          if (lastAlertKeyRef.current !== alertKey) {
            const alertLabel = latestStatus === "HAZARDOUS" ? "Tehlikeli" : "Sagliksiz";
            const appNotification: Notification = {
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
      } else {
        // Servisten bos liste donerse UI'nin stale veri gostermemesi icin state sifirlanir.
        setHistory([]);
        setData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error("[SensorContext] fetchData HATA:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Simülatör 10 saniyede bir veri gönderiyor, biz de 10 saniyede bir çekelim.
    // Polling periyodunu koruyoruz: bu sayede mevcut tasarım davranışı bozulmaz.
    const interval: any = setInterval(fetchData, 10000);

    return () => clearInterval(interval);
  }, []);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
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
        removeNotification,
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
  // Sayfalar bu hook ile yalnizca hazir veriyi alir; veri cekme detayini bilmez.
  return context;
};

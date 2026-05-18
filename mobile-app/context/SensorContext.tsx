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
import { deviceService } from "../services/deviceService";
import { Notification, SensorData } from "../types/sensor.types";
import { supabase } from "../services/supabaseClient";

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [deviceSerial, setDeviceSerial] = useState<string | null>(null);
  const lastAlertKeyRef = useRef<string>("");
  const fetchDataRef = useRef<() => Promise<void>>();
  const deviceSerialRef = useRef<string | null>(null);
  // En son DB kaydının created_at değeri — değişmemişse state güncelleme yapma
  const latestCreatedAtRef = useRef<string>("");
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

  const handleAlert = async (reading: SensorData) => {
    const status = reading.air_quality_status;
    if (status !== "UNHEALTHY" && status !== "HAZARDOUS") return;
    const alertKey = `${reading.created_at}-${status}`;
    if (lastAlertKeyRef.current === alertKey) return;
    lastAlertKeyRef.current = alertKey;
    const label = status === "HAZARDOUS" ? "Tehlikeli" : "Sağlıksız";
    const notif: Notification = {
      id: alertKey,
      title: `Hava Kalitesi ${label}`,
      message: `CO2 ${reading.co2_ppm} ppm | VOC ${reading.voc_index}`,
      received_at: new Date().toISOString(),
    };
    addAppNotification(notif);
    if (phoneNotificationsEnabled && Platform.OS !== "web") {
      try {
        await Notifications.scheduleNotificationAsync({
          content: { title: notif.title, body: notif.message, sound: "default" },
          trigger: null,
        });
      } catch (e) {
        console.error("Telefon bildirimi gönderilemedi:", e);
      }
    }
  };

  const fetchData = async () => {
    try {
      // deviceSerial zaten biliniyorsa tekrar Supabase'e sorma
      const serial = deviceSerialRef.current ?? await deviceService.getUserDeviceSerial();
      if (!serial) {
        setHistory([]);
        setData(null);
        setLoading(false);
        return;
      }
      if (deviceSerialRef.current !== serial) {
        deviceSerialRef.current = serial;
        setDeviceSerial(serial);
      }
      const mappedHistory = await apiService.getHistory({ serialNumber: serial, limit: 48 });

      if (mappedHistory.length > 0) {
        const newestAt = mappedHistory[0].created_at;
        if (newestAt !== latestCreatedAtRef.current) {
          // Gerçekten yeni veri var — state güncelle ve logla
          latestCreatedAtRef.current = newestAt;
          console.log("[SensorContext] Yeni veri geldi:", newestAt, "| toplam:", mappedHistory.length);
          setHistory(mappedHistory);
          setData(mappedHistory[0]);
          await handleAlert(mappedHistory[0]);
        } else {
          console.log("[SensorContext] Polling: yeni kayıt yok, state dokunulmadı.");
        }
      } else {
        if (latestCreatedAtRef.current !== "") {
          latestCreatedAtRef.current = "";
          setHistory([]);
          setData(null);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("[SensorContext] fetchData HATA:", error);
      setLoading(false);
    }
  };

  // fetchData referansını her render'da güncelle — interval'ın stale closure yakalamasını önle
  fetchDataRef.current = fetchData;

  // Oturum takibi
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // İlk yükleme + polling (10 sn yedek)
  useEffect(() => {
    if (!isLoggedIn) {
      setData(null);
      setHistory([]);
      setDeviceSerial(null);
      deviceSerialRef.current = null;
      latestCreatedAtRef.current = "";
      setLoading(false);
      return;
    }
    fetchDataRef.current?.();
    const interval = setInterval(() => fetchDataRef.current?.(), 10_000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Supabase Realtime — cihazın serial'ı belli olunca anlık INSERT dinle
  useEffect(() => {
    if (!isLoggedIn || !deviceSerial) return;

    const channel = supabase
      .channel(`realtime-sensor-${deviceSerial}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_readings",
          filter: `device_serial=eq.${deviceSerial}`,
        },
        (payload) => {
          const row = payload.new as any;
          const mapped: SensorData = {
            id: row.id,
            temperature: Number(row.temperature ?? 0),
            humidity: Number(row.humidity ?? 0),
            co2_ppm: Number(row.co2_ppm ?? 0),
            voc_index: Number(row.voc_index ?? 0),
            air_quality_status: (row.air_quality_status ?? "UNKNOWN") as SensorData["air_quality_status"],
            created_at: String(row.created_at ?? ""),
          };
          // Polling ile çakışmayı önle: sadece gerçekten yeni ise işle
          if (mapped.created_at > latestCreatedAtRef.current) {
            latestCreatedAtRef.current = mapped.created_at;
            console.log("[Realtime] Anlık veri:", mapped.created_at, "co2:", mapped.co2_ppm);
            setData(mapped);
            setHistory((prev) =>
              prev.some((d) => d.created_at === mapped.created_at)
                ? prev
                : [mapped, ...prev].slice(0, 48)
            );
            handleAlert(mapped);
          }
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] kanal durumu:", status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn, deviceSerial]);

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

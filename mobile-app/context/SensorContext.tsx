// Dosya Yolu: mobile-app/context/SensorContext.tsx

import React, {
  createContext,
  ReactNode,
  useCallback,
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
 * Loose Coupling Notu:
 * UI dogrudan fetch/Supabase cagrisi yapmaz. Bu context apiService uzerinden
 * cekim yapar; transport degisirse sadece servis katmani guncellenir.
 *
 * Veri akisi mimarisi:
 *   - Realtime kanal SUBSCRIBED  -> birincil yol (anlik INSERT push)
 *   - Realtime KAPALI/HATALI     -> polling devreye girer (her 10sn)
 *   - Her durumda dedup: latestCreatedAtRef ayni timestamp'i iki kez islemez
 *   - Realtime SUBSCRIBED iken polling daha seyrek calisir (her 30sn sanity check)
 */

interface SensorContextType {
  data: SensorData | null;
  history: SensorData[];
  notifications: Notification[];
  unreadCount: number;
  phoneNotificationsEnabled: boolean;
  setPhoneNotificationsEnabled: (enabled: boolean) => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  loading: boolean;
  refreshData: () => Promise<void>;
  realtimeStatus: RealtimeStatus;
}

type RealtimeStatus =
  | "IDLE"
  | "CONNECTING"
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CHANNEL_ERROR"
  | "CLOSED";

const SensorContext = createContext<SensorContextType | undefined>(undefined);

const POLL_INTERVAL_FAST_MS = 10_000;
const POLL_INTERVAL_SLOW_MS = 30_000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const SensorProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [phoneNotificationsEnabled, setPhoneNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [deviceSerial, setDeviceSerial] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("IDLE");

  const lastAlertKeyRef = useRef<string>("");
  const deviceSerialRef = useRef<string | null>(null);
  const latestCreatedAtRef = useRef<string>("");

  const unreadCount = notifications.length;

  const addAppNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => {
      const threshold = Date.now() - ONE_WEEK_MS;
      const fresh = prev.filter((item) => {
        const t = new Date(item.received_at).getTime();
        return Number.isFinite(t) && t >= threshold;
      });
      return [notification, ...fresh].slice(0, 200);
    });
  }, []);

  const handleAlert = useCallback(
    async (reading: SensorData) => {
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
    },
    [addAppNotification, phoneNotificationsEnabled]
  );

  const applyReading = useCallback(
    (reading: SensorData, source: "polling" | "realtime") => {
      if (!reading.created_at) return;
      if (reading.created_at <= latestCreatedAtRef.current) return;
      latestCreatedAtRef.current = reading.created_at;
      console.log(
        `[SensorContext:${source}] Yeni okuma:`,
        reading.created_at,
        "CO2:",
        reading.co2_ppm
      );
      setData(reading);
      setHistory((prev) =>
        prev.some((d) => d.created_at === reading.created_at)
          ? prev
          : [reading, ...prev].slice(0, 48)
      );
      void handleAlert(reading);
    },
    [handleAlert]
  );

  const fetchData = useCallback(async () => {
    try {
      const serial = deviceSerialRef.current ?? (await deviceService.getUserDeviceSerial());
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
        const newest = mappedHistory[0];
        if (newest.created_at > latestCreatedAtRef.current) {
          latestCreatedAtRef.current = newest.created_at;
          setHistory(mappedHistory);
          setData(newest);
          await handleAlert(newest);
          console.log(
            "[SensorContext:polling] Yeni veri:",
            newest.created_at,
            "| toplam:",
            mappedHistory.length
          );
        }
      } else if (latestCreatedAtRef.current !== "") {
        latestCreatedAtRef.current = "";
        setHistory([]);
        setData(null);
      }
      setLoading(false);
    } catch (error) {
      console.error("[SensorContext] fetchData HATA:", error);
      setLoading(false);
    }
  }, [handleAlert]);

  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Oturum acilinca / kapaninca state'i resetle ve ilk fetch'i tetikle
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
    fetchDataRef.current();
  }, [isLoggedIn]);

  // Polling — interval realtimeStatus'a gore dinamik
  // SUBSCRIBED iken seyrek (30sn sanity check), aksi halde sik (10sn yedek)
  useEffect(() => {
    if (!isLoggedIn) return;
    const ms =
      realtimeStatus === "SUBSCRIBED" ? POLL_INTERVAL_SLOW_MS : POLL_INTERVAL_FAST_MS;
    console.log(
      `[SensorContext] Polling interval: ${ms / 1000}sn (realtime=${realtimeStatus})`
    );
    const id = setInterval(() => fetchDataRef.current(), ms);
    return () => clearInterval(id);
  }, [isLoggedIn, realtimeStatus]);

  // Supabase Realtime
  useEffect(() => {
    if (!isLoggedIn || !deviceSerial) {
      setRealtimeStatus("IDLE");
      return;
    }

    setRealtimeStatus("CONNECTING");

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
            air_quality_status: (row.air_quality_status ??
              "UNKNOWN") as SensorData["air_quality_status"],
            created_at: String(row.created_at ?? ""),
          };
          applyReading(mapped, "realtime");
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] kanal durumu:", status, err ? `| err: ${err}` : "");
        const normalized: RealtimeStatus =
          status === "SUBSCRIBED" ||
          status === "TIMED_OUT" ||
          status === "CHANNEL_ERROR" ||
          status === "CLOSED"
            ? status
            : "CONNECTING";
        setRealtimeStatus(normalized);

        if (
          normalized === "CHANNEL_ERROR" ||
          normalized === "TIMED_OUT" ||
          normalized === "CLOSED"
        ) {
          console.warn(
            "[Realtime] Kanal kopuk; polling yedegi devrede. Supabase Dashboard'da " +
              "sensor_readings tablosu icin Realtime ENABLE mi kontrol edin."
          );
          fetchDataRef.current();
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setRealtimeStatus("IDLE");
    };
  }, [isLoggedIn, deviceSerial, applyReading]);

  const clearNotifications = () => setNotifications([]);
  const removeNotification = (id: string) =>
    setNotifications((prev) => prev.filter((item) => item.id !== id));

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
        realtimeStatus,
      }}
    >
      {children}
    </SensorContext.Provider>
  );
};

export const useSensorData = () => {
  const context = useContext(SensorContext);
  if (!context) {
    throw new Error("useSensorData must be used within a SensorProvider");
  }
  return context;
};

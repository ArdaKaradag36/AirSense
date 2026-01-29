// Dosya Yolu: mobile-app/context/SensorContext.tsx

import axios from "axios";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

// ✅ GÜNCELLEME: Senin Yerel IP Adresin ve Cihaz ID'n
// Telefonun ve bilgisayarın aynı Wi-Fi'da olmalı!
const API_URL = "http://192.168.1.104:8000/api/v1/history/ESP32_SALON_01";

// Veri Tipleri
interface SensorData {
  id: number;
  temperature: number;
  humidity: number;
  mq9_value: number; // MQ-9 artık zorunlu geliyor
  air_quality_status: string;
  created_at: string;
  // İleride eklenebilecek opsiyonel alanlar
  mq135_value?: number;
  co2?: number;
  ppm?: number;
  gas_value?: number;
}

interface SensorContextType {
  data: SensorData | null; // En son veri (Tekil)
  history: SensorData[]; // Geçmiş veriler (Grafik için liste)
  loading: boolean;
  refreshData: () => Promise<void>;
}

const SensorContext = createContext<SensorContextType | undefined>(undefined);

export const SensorProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await axios.get(API_URL);
      // Backend veriyi liste olarak dönüyor
      if (
        response.data &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        setHistory(response.data); // Listeyi kaydet (Grafikler için)
        setData(response.data[0]); // En güncel veriyi (ilk eleman) kaydet
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

    // ESP32 3 saniyede bir atıyor, biz de 3 saniyede bir çekelim.
    const interval: any = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SensorContext.Provider
      value={{ data, history, loading, refreshData: fetchData }}
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

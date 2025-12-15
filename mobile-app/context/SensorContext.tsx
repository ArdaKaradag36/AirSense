// Dosya Yolu: mobile-app/context/SensorContext.tsx

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import axios from 'axios';

// ✅ Senin Ngrok/FastAPI Adresin
const API_URL = 'https://charleigh-roentgenologic-annoyingly.ngrok-free.dev/api/v1/history/AIRSENSE-TEST-001';

// Veri Tipleri
interface SensorData {
  id: number;
  temperature: number;
  humidity: number;
  mq9_value?: number;
  mq135_value?: number;
  co2?: number;
  ppm?: number;
  gas_value?: number;
  air_quality_status: string;
  created_at: string;
}

interface SensorContextType {
  data: SensorData | null;      // En son veri (Tekil)
  history: SensorData[];        // Geçmiş veriler (Grafik için liste)
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
      if (response.data && response.data.length > 0) {
        setHistory(response.data);      // Listeyi kaydet
        setData(response.data[0]);      // En güncel veriyi kaydet
      }
      setLoading(false);
    } catch (error) {
      console.error("Veri Çekme Hatası:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // ✅ DÜZELTME: 'any' kullanarak TypeScript hatasını (Timeout vs Number) susturuyoruz.
    // React Native'de bu en güvenli yoldur.
    const interval: any = setInterval(fetchData, 10000); 
    
    return () => clearInterval(interval);
  }, []);

  return (
    <SensorContext.Provider value={{ data, history, loading, refreshData: fetchData }}>
      {children}
    </SensorContext.Provider>
  );
};

// Sayfalarda kullanacağımız özel kanca (hook)
export const useSensorData = () => {
  const context = useContext(SensorContext);
  if (!context) {
    throw new Error('useSensorData must be used within a SensorProvider');
  }
  return context;
};
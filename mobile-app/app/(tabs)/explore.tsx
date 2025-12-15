import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';

// ✅ ngrok Adresini Güncellemeyi Unutma
const API_URL = 'https://charleigh-roentgenologic-annoyingly.ngrok-free.dev/api/v1/history/AIRSENSE-TEST-001';

const screenWidth = Dimensions.get("window").width;

export default function AnalysisScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Veri Çekme
  const fetchData = async () => {
    try {
      const response = await axios.get(API_URL);
      if (response.data && response.data.length > 0) {
        setData(response.data[0]); // En son veriyi al
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 10sn'de bir yenile
    return () => clearInterval(interval);
  }, []);

  // --- MOCK VERİ HESAPLAMA ---
  const getSimulatedOxygen = (co2: number) => {
    const base = 20.9;
    const drop = co2 > 1000 ? 0.4 : 0.0;
    return (base - drop).toFixed(1);
  };

  const getSimulatedNitrogen = () => "78.0";

  // --- YAPAY ZEKA MANTIĞI ---
  const getAISuggestion = (status: string, temp: number, humidity: number) => {
    if (status === 'HAZARDOUS') return {
      text: "ACİL DURUM: Ortamda tehlikeli gaz seviyesi tespit edildi! Derhal ortamı terk et ve havalandırmayı aç.",
      color: ["#FFEBEE", "#D32F2F"],
      icon: "alert-octagon"
    };
    if (status === 'UNHEALTHY') return {
      text: "Hava kalitesi sağlığını etkileyecek düzeyde düştü. Baş ağrısı yaşamamak için odayı 15 dakika havalandır.",
      color: ["#FFF3E0", "#E65100"],
      icon: "weather-windy"
    };
    if (temp > 28) return {
      text: "Oda sıcaklığı çok yüksek, odaklanmanı zorlaştırabilir. Klimayı açabilir veya serin bir yere geçebilirsin.",
      color: ["#FFF3E0", "#BF360C"],
      icon: "thermometer-alert"
    };
    if (humidity > 70) return {
      text: "Nem oranı çok yüksek. Küf riskine karşı nem alma cihazı kullanman iyi olabilir.",
      color: ["#E3F2FD", "#1565C0"],
      icon: "water-percent"
    };
    
    return {
      text: "Şu an hava kalitesi mükemmel! Oksijen seviyesi ideal. Çalışmak veya dinlenmek için harika bir ortam.",
      color: ["#E8F5E9", "#2E7D32"],
      icon: "robot-happy"
    };
  };

  // Veri Tanımları
  const currentStatus = data ? data.air_quality_status : "UNKNOWN";
  const temp = data ? data.temperature : 0;
  const humidity = data ? data.humidity : 0;
  // Akıllı veri bulucu (Backend isim farkına karşı)
  const co2 = data ? (data.mq9_value || data.mq135_value || data.co2 || 0) : 0;

  const aiAdvice = getAISuggestion(currentStatus, temp, humidity);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Detaylı Analiz</Text>
        <Text style={styles.headerSubtitle}>Moleküler Bileşenler & AI</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00C853" style={{marginTop: 50}} />
      ) : (
        <>
          {/* --- AI CARD --- */}
          <View style={[styles.aiCard, { backgroundColor: aiAdvice.color[0] }]}>
            <View style={styles.aiHeader}>
              <MaterialCommunityIcons name="robot" size={28} color={aiAdvice.color[1]} />
              <Text style={[styles.aiTitle, { color: aiAdvice.color[1] }]}>AirSense AI Asistanı</Text>
            </View>
            <Text style={[styles.aiText, { color: aiAdvice.color[1] }]}>
              {aiAdvice.text}
            </Text>
          </View>

          {/* --- MOLEKÜLER GRİD --- */}
          <Text style={styles.sectionTitle}>Hava Bileşenleri</Text>
          <View style={styles.gridContainer}>
            
            <View style={styles.moleculeCard}>
              <View style={[styles.iconBox, {backgroundColor: '#E1F5FE'}]}>
                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#0288D1'}}>O₂</Text>
              </View>
              <Text style={styles.molValue}>{getSimulatedOxygen(co2)}%</Text>
              <Text style={styles.molLabel}>Oksijen</Text>
            </View>

            <View style={styles.moleculeCard}>
              <View style={[styles.iconBox, {backgroundColor: '#F3E5F5'}]}>
                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#7B1FA2'}}>N₂</Text>
              </View>
              <Text style={styles.molValue}>{getSimulatedNitrogen()}%</Text>
              <Text style={styles.molLabel}>Azot</Text>
            </View>

            <View style={styles.moleculeCard}>
              <View style={[styles.iconBox, {backgroundColor: '#FFEBEE'}]}>
                <MaterialCommunityIcons name="molecule-co2" size={24} color="#D32F2F" />
              </View>
              <Text style={styles.molValue}>{co2}</Text>
              <Text style={styles.molLabel}>PPM (CO/CO₂)</Text>
            </View>

            <View style={styles.moleculeCard}>
              <View style={[styles.iconBox, {backgroundColor: '#E3F2FD'}]}>
                <Ionicons name="water" size={24} color="#1976D2" />
              </View>
              <Text style={styles.molValue}>%{humidity}</Text>
              <Text style={styles.molLabel}>Nem Oranı</Text>
            </View>
            
             <View style={styles.moleculeCard}>
              <View style={[styles.iconBox, {backgroundColor: '#E0F2F1'}]}>
                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#00695C'}}>Ar</Text>
              </View>
              <Text style={styles.molValue}>0.9%</Text>
              <Text style={styles.molLabel}>Argon</Text>
            </View>

             <View style={styles.moleculeCard}>
              <View style={[styles.iconBox, {backgroundColor: '#FFF3E0'}]}>
                <FontAwesome5 name="temperature-high" size={20} color="#E65100" />
              </View>
              <Text style={styles.molValue}>{temp}°C</Text>
              <Text style={styles.molLabel}>Sıcaklık</Text>
            </View>
          </View>

          {/* --- YENİ EKLENEN KISIM: SAĞLIK & AKSİYON KARTLARI --- */}
          <View style={styles.recommendationSection}>
            <Text style={styles.sectionTitle}>Sağlık & Konfor Analizi</Text>
            
            {/* 1. KART: CO2 Durumu */}
            <View style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: co2 > 1000 ? '#FFEBEE' : '#E8F5E9' }]}>
                <MaterialCommunityIcons 
                  name={co2 > 1000 ? "brain" : "check-circle"} 
                  size={24} 
                  color={co2 > 1000 ? "#D32F2F" : "#2E7D32"} 
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Konsantrasyon Seviyesi</Text>
                <Text style={styles.actionDesc}>
                  {co2 > 1000 
                    ? "Yüksek CO2 baş ağrısı ve odaklanma sorunu yaratabilir." 
                    : "Hava temiz. Zihinsel performans için ideal seviyede."}
                </Text>
              </View>
            </View>

            {/* 2. KART: Konfor (Sıcaklık/Nem) */}
            <View style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: (temp > 26 || humidity > 65) ? '#FFF3E0' : '#E3F2FD' }]}>
                <MaterialCommunityIcons 
                  name={(temp > 26 || humidity > 65) ? "weather-sunny-alert" : "account-check"} 
                  size={24} 
                  color={(temp > 26 || humidity > 65) ? "#E65100" : "#1565C0"} 
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Termal Konfor</Text>
                <Text style={styles.actionDesc}>
                  {(temp > 26 || humidity > 65)
                    ? "Ortam biraz bunaltıcı olabilir. Serinlemeye çalışın." 
                    : "Sıcaklık ve nem dengesi insan konforu için uygun."}
                </Text>
              </View>
            </View>

            {/* 3. KART: Uyku Kalitesi */}
            <View style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                <MaterialCommunityIcons name="bed-king" size={24} color="#7B1FA2" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Uyku Ortamı</Text>
                <Text style={styles.actionDesc}>
                  {co2 < 800 
                    ? "Bu hava kalitesi deliksiz bir uyku için mükemmel." 
                    : "Uyumadan önce odayı havalandırmak uyku kaliteni artırır."}
                </Text>
              </View>
            </View>
          </View>
          {/* ------------------------------------------------------- */}

        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  header: { marginTop: 40, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  
  // AI Card Styles
  aiCard: { padding: 20, borderRadius: 20, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  aiTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  aiText: { fontSize: 16, lineHeight: 24, fontWeight: '500' },

  // Grid Styles
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moleculeCard: { 
    width: '31%', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 15, 
    alignItems: 'center',
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  iconBox: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  molValue: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  molLabel: { fontSize: 12, color: '#888' },

  // --- YENİ EKLENEN STİLLER: SAĞLIK KARTLARI ---
  recommendationSection: {
    marginTop: 10,
    marginBottom: 40,
  },
  actionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
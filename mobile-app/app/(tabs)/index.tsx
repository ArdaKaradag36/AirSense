import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Dimensions, ActivityIndicator, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import axios from 'axios';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

// ✅ ngrok Adresini Buradan Kontrol Et
const API_URL = 'https://charleigh-roentgenologic-annoyingly.ngrok-free.dev/api/v1/history/AIRSENSE-TEST-001';

const screenWidth = Dimensions.get("window").width;

// --- GÜNCELLENMİŞ CANLI RENK PALETİ ---
const COLORS = {
  GOOD: '#00C853',
  MODERATE: '#FFD600',
  UNHEALTHY: '#FF3D00',
  HAZARDOUS: '#D50000',
  UNKNOWN: '#B0BEC5'
};

// Zaman Aralığı Seçenekleri
const TIME_RANGES = ['Saatlik', 'Günlük', 'Haftalık', 'Aylık'];

export default function HomeScreen() {
  const [data, setData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true); 
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // --- YENİ STATE: Zaman Aralığı Seçimi ---
  const [timeRange, setTimeRange] = useState('Saatlik');
  const [isDropdownVisible, setDropdownVisible] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Veri Çekme Fonksiyonu
  const fetchData = async (silent = false) => {
    try {
      if (!silent) setErrorMsg(null);
      const response = await axios.get(API_URL);

      if (response.data && response.data.length > 0 && !silent) {
          // console.log("🔥 Backend Verisi:", response.data[0]);
      }

      setData(response.data);
      if (!silent) setFirstLoad(false);
    } catch (error: any) {
      console.error("Bağlantı Hatası:", error);
      if (!silent) {
        setErrorMsg("Sunucuya bağlanılamadı.");
        setFirstLoad(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => {
      fetchData(true);
    }, 10000); 

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData().then(() => setRefreshing(false));
  }, []);

  const findGasValue = (item: any) => {
    if (!item) return 0;
    const val = item.mq9_value || item.mq135_value || item.co2 || item.ppm || item.gas_value;
    return val !== undefined && val !== null ? Number(val) : 0;
  };

  const validData = Array.isArray(data) ? data : [];
  const latest = validData.length > 0 ? validData[0] : null;
  const currentStatus = latest ? latest.air_quality_status : "UNKNOWN";
  const gasValue = findGasValue(latest);
  const themeColor = getStatusColorFromString(currentStatus);

  // --- GRAFİK VERİSİ ---
  const chartDataPoints = validData.length > 0 
    ? validData.slice(0, 10).reverse().map(d => findGasValue(d))
    : [0];

  const chartLabels = validData.length > 0 
    ? validData.slice(0, 10).reverse().map((d, index) => {
        if (index % 2 !== 0) return ""; 
        const date = new Date(d.created_at);
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      }) 
    : ["-"];

  const lineChartData = {
    labels: chartLabels,
    datasets: [{
      data: chartDataPoints,
      color: (opacity = 1) => `rgba(0, 200, 83, ${opacity})`,
      strokeWidth: 3,
    }],
  };

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 200, 83, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, 0.6)`,
    fillShadowGradientFrom: COLORS.GOOD,
    fillShadowGradientTo: "#fff",
    fillShadowGradientFromOpacity: 0.5,
    fillShadowGradientToOpacity: 0.0,
    propsForDots: { r: "3", strokeWidth: "1", stroke: COLORS.GOOD },
    propsForBackgroundLines: { strokeDasharray: "", stroke: "#eee" }, 
  };

  // --- DROPDOWN SEÇİM FONKSİYONU ---
  const handleSelectRange = (range: string) => {
    setTimeRange(range);
    setDropdownVisible(false);
    // İleride buraya: fetchData(range) gibi backend isteği eklenebilir.
  };

  return (
    <View style={{flex: 1}}> 
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AirSense</Text>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        {firstLoad ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.GOOD} /></View>
        ) : errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : (
          <>
            <View style={styles.statusCard}>
              <View style={styles.statusBarsRow}>
                <View style={[styles.individualStatusBar, { backgroundColor: COLORS.GOOD, opacity: currentStatus === 'GOOD' ? 1 : 0.15 }]} />
                <View style={[styles.individualStatusBar, { backgroundColor: COLORS.MODERATE, opacity: currentStatus === 'MODERATE' ? 1 : 0.15 }]} />
                <View style={[styles.individualStatusBar, { backgroundColor: COLORS.UNHEALTHY, opacity: currentStatus === 'UNHEALTHY' ? 1 : 0.15 }]} />
                <View style={[styles.individualStatusBar, { backgroundColor: COLORS.HAZARDOUS, opacity: currentStatus === 'HAZARDOUS' ? 1 : 0.15 }]} />
              </View>
              <Text style={[styles.statusText, { color: themeColor }]}>
                 {getStatusTurkish(currentStatus)}
              </Text>
            </View>

            <View style={styles.chartCard}>
              {/* --- YENİ CHART HEADER: DROPDOWN EKLENDİ --- */}
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Kalite Trendi</Text>
                
                {/* Dropdown Tetikleyici Buton */}
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setDropdownVisible(true)}
                >
                  <Text style={styles.dropdownButtonText}>{timeRange}</Text>
                  <Ionicons name="chevron-down" size={14} color="#555" style={{marginLeft: 4}} />
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center', overflow: 'hidden' }}>
                <LineChart
                  data={lineChartData}
                  width={screenWidth - 60} 
                  height={220}
                  chartConfig={chartConfig}
                  bezier 
                  withDots={true}
                  withInnerLines={true}
                  withOuterLines={false}
                  withVerticalLines={false}
                  style={{ marginVertical: 8, borderRadius: 16, paddingRight: 0, marginLeft: -10 }}
                />
              </View>
            </View>

            {latest && (
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}><FontAwesome5 name="temperature-high" size={20} color={COLORS.UNHEALTHY} /></View>
                  <Text style={styles.detailLabel}>Sıcaklık:</Text>
                  <Text style={styles.detailValue}>{latest.temperature}°C</Text>
                </View>
                <View style={styles.separator} />
                
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}><Ionicons name="water-outline" size={22} color="#2196F3" /></View>
                  <Text style={styles.detailLabel}>Nem:</Text>
                  <Text style={styles.detailValue}>{latest.humidity}%</Text>
                </View>
                <View style={styles.separator} />

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}><MaterialCommunityIcons name="molecule-co2" size={24} color="#795548" /></View>
                  <Text style={styles.detailLabel}>CO2 (Tahmini):</Text>
                  <Text style={styles.detailValue}>{gasValue} ppm</Text>
                </View>
                <View style={styles.separator} />

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}><MaterialCommunityIcons name="air-filter" size={24} color="#607D8B" /></View>
                  <Text style={styles.detailLabel}>VOC Durumu:</Text>
                  <Text style={[styles.detailValue, { color: themeColor, fontWeight: 'bold' }]}>
                    {getStatusTurkish(currentStatus)}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* --- MODAL (DROPDOWN MENÜSÜ) --- */}
      <Modal
        visible={isDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownMenu}>
              <Text style={styles.dropdownHeaderTitle}>Aralık Seçin</Text>
              {TIME_RANGES.map((range, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.dropdownItem, 
                    timeRange === range && styles.dropdownItemSelected // Seçili olanı renklendir
                  ]}
                  onPress={() => handleSelectRange(range)}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    timeRange === range && styles.dropdownItemTextSelected
                  ]}>
                    {range}
                  </Text>
                  {timeRange === range && <Ionicons name="checkmark" size={18} color="#00C853" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

const getStatusColorFromString = (status: string | null) => {
    switch (status) {
        case "GOOD": return COLORS.GOOD;
        case "MODERATE": return COLORS.MODERATE;
        case "UNHEALTHY": return COLORS.UNHEALTHY;
        case "HAZARDOUS": return COLORS.HAZARDOUS;
        default: return COLORS.UNKNOWN;
    }
}

const getStatusTurkish = (status: string | null) => {
    switch (status) {
        case "GOOD": return "İyi";
        case "MODERATE": return "Orta";
        case "UNHEALTHY": return "Sağlıksız";
        case "HAZARDOUS": return "Tehlikeli";
        default: return "Bilinmiyor";
    }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 300 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 50, fontSize: 16, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 25, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  statusCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, marginHorizontal: 20, alignItems: 'center', shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  statusBarsRow: { flexDirection: 'row', height: 16, width: '100%', justifyContent: 'space-between', marginBottom: 15 },
  individualStatusBar: { flex: 1, borderRadius: 8, marginHorizontal: 4 },
  statusText: { fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  
  chartCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, marginHorizontal: 20, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  chartTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  // --- YENİ DROPDOWN STİLLERİ ---
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', // Arkaplanı hafif karart
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    width: 250,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  dropdownHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 10,
    textAlign: 'center',
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
  },
  dropdownItemSelected: {
    backgroundColor: '#E8F5E9', // Seçili olan hafif yeşil olsun
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#00C853',
    fontWeight: 'bold',
  },

  detailsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 30, marginHorizontal: 20, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  detailIconContainer: { width: 40, alignItems: 'center' },
  detailLabel: { flex: 1, fontSize: 16, color: '#555', marginLeft: 10 },
  detailValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 50 },
});
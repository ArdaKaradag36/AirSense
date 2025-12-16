import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Dimensions, ActivityIndicator, TouchableOpacity, Modal, TouchableWithoutFeedback, Image } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSensorData } from '../../context/SensorContext';
// 👇 Tema Verisini Çek
import { useTheme } from '../../context/ThemeContext';

const screenWidth = Dimensions.get("window").width;

const COLORS = {
  GOOD: '#00C853',
  MODERATE: '#FFD600',
  UNHEALTHY: '#FF3D00',
  HAZARDOUS: '#D50000',
  UNKNOWN: '#B0BEC5'
};

const TIME_RANGES = ['Saatlik', 'Günlük', 'Haftalık', 'Aylık'];

export default function HomeScreen() {
  const { history, data: latest, loading, refreshData } = useSensorData();
  
  // ✅ Tema Bağlantısı
  const { isDarkMode, theme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('Saatlik');
  const [isDropdownVisible, setDropdownVisible] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const findGasValue = (item: any) => {
    if (!item) return 0;
    const val = item.mq9_value || item.mq135_value || item.co2 || item.ppm || item.gas_value;
    return val !== undefined && val !== null ? Number(val) : 0;
  };

  const validData = Array.isArray(history) ? history : [];
  const currentStatus = latest ? latest.air_quality_status : "UNKNOWN";
  const gasValue = findGasValue(latest);
  const themeColor = getStatusColorFromString(currentStatus);

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
    backgroundGradientFrom: theme.chartBackground,
    backgroundGradientTo: theme.chartBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 200, 83, ${opacity})`,
    labelColor: (opacity = 1) => theme.chartLabel,
    fillShadowGradientFrom: COLORS.GOOD,
    fillShadowGradientTo: theme.chartBackground,
    fillShadowGradientFromOpacity: 0.5,
    fillShadowGradientToOpacity: 0.0,
    propsForDots: { r: "3", strokeWidth: "1", stroke: COLORS.GOOD },
    propsForBackgroundLines: { strokeDasharray: "", stroke: isDarkMode ? "#333" : "#eee" }, 
  };

  const handleSelectRange = (range: string) => {
    setTimeRange(range);
    setDropdownVisible(false);
  };

  return (
    <View style={{flex: 1, backgroundColor: theme.background}}> 
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
      >
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View style={styles.headerLogoContainer}>
            <Image 
              source={require('../../assets/images/logo.png')}
              style={[
                  styles.headerLogoImage, 
                  // Logo arka plan ayarı (Karanlık modda beyaz kutucuk)
                  { backgroundColor: theme.logoBackground, borderRadius: theme.logoRadius, padding: theme.logoPadding }
              ]}
              resizeMode="contain" 
            />
            <Text style={[styles.headerTitle, { color: theme.text }]}>AirSense</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={28} color={theme.icon} />
          </TouchableOpacity>
        </View>

        {loading && !latest ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.GOOD} /></View>
        ) : (
          <>
            {/* DURUM KARTI */}
            <View style={[styles.statusCard, { backgroundColor: theme.card }]}>
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

            {/* GRAFİK KARTI */}
            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Kalite Trendi</Text>
                
                <TouchableOpacity 
                  style={[styles.dropdownButton, { backgroundColor: isDarkMode ? '#333' : '#F0F0F0' }]}
                  onPress={() => setDropdownVisible(true)}
                >
                  <Text style={[styles.dropdownButtonText, { color: theme.text }]}>{timeRange}</Text>
                  <Ionicons name="chevron-down" size={14} color={theme.subText} style={{marginLeft: 4}} />
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

            {/* DETAY KARTI */}
            {latest && (
              <View style={[styles.detailsCard, { backgroundColor: theme.card }]}>
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}><FontAwesome5 name="temperature-high" size={20} color={COLORS.UNHEALTHY} /></View>
                  <Text style={[styles.detailLabel, { color: theme.subText }]}>Sıcaklık:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{latest.temperature}°C</Text>
                </View>
                <View style={[styles.separator, { backgroundColor: theme.border }]} />
                
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}><Ionicons name="water-outline" size={22} color="#2196F3" /></View>
                  <Text style={[styles.detailLabel, { color: theme.subText }]}>Nem:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{latest.humidity}%</Text>
                </View>
                <View style={[styles.separator, { backgroundColor: theme.border }]} />

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}><MaterialCommunityIcons name="molecule-co2" size={24} color="#795548" /></View>
                  <Text style={[styles.detailLabel, { color: theme.subText }]}>CO2 (Tahmini):</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{gasValue} ppm</Text>
                </View>
                <View style={[styles.separator, { backgroundColor: theme.border }]} />

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}><MaterialCommunityIcons name="air-filter" size={24} color="#607D8B" /></View>
                  <Text style={[styles.detailLabel, { color: theme.subText }]}>VOC Durumu:</Text>
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
            <View style={[styles.dropdownMenu, { backgroundColor: theme.card }]}>
              <Text style={styles.dropdownHeaderTitle}>Aralık Seçin</Text>
              {TIME_RANGES.map((range, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.dropdownItem, 
                    timeRange === range && { backgroundColor: isDarkMode ? '#333' : '#E8F5E9' }
                  ]}
                  onPress={() => handleSelectRange(range)}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    { color: theme.text },
                    timeRange === range && { color: '#00C853', fontWeight: 'bold' }
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 300 },
  
  // ✅ DÜZELTME BURADA YAPILDI: 
  // Safety'deki toplam boşluk (20 padding + 60 margin = 80px)
  // Buradaki toplam boşluk (0 padding + 80 margin = 80px)
  // Artık milimetrik olarak eşitler.
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 80, 
    marginBottom: 20, 
    paddingHorizontal: 20 
  },
  headerLogoContainer: { flexDirection: 'row', alignItems: 'center' },
  headerLogoImage: { width: 50, height: 50, marginRight: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },

  statusCard: { borderRadius: 20, padding: 20, marginBottom: 20, marginHorizontal: 20, alignItems: 'center', shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  statusBarsRow: { flexDirection: 'row', height: 16, width: '100%', justifyContent: 'space-between', marginBottom: 15 },
  individualStatusBar: { flex: 1, borderRadius: 8, marginHorizontal: 4 },
  statusText: { fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  
  chartCard: { borderRadius: 20, padding: 20, marginBottom: 20, marginHorizontal: 20, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  chartTitle: { fontSize: 18, fontWeight: 'bold' },
  
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  dropdownButtonText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownMenu: { width: 250, borderRadius: 16, padding: 10, shadowColor: "#000", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  dropdownHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#999', marginBottom: 10, textAlign: 'center', paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10 },
  dropdownItemText: { fontSize: 16 },
  
  detailsCard: { borderRadius: 20, padding: 20, marginBottom: 30, marginHorizontal: 20, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  detailIconContainer: { width: 40, alignItems: 'center' },
  detailLabel: { flex: 1, fontSize: 16, marginLeft: 10 },
  detailValue: { fontSize: 18, fontWeight: 'bold' },
  separator: { height: 1, marginLeft: 50 },
});
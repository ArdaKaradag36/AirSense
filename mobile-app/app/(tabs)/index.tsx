import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import axios from 'axios';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

// ✅ ngrok Adresin Güncellendi!
const API_URL = 'https://charleigh-roentgenologic-annoyingly.ngrok-free.dev/api/v1/history/AIRSENSE-TEST-001';

// Ekran Genişliği
const screenWidth = Dimensions.get("window").width;

export default function HomeScreen() {
  const [data, setData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setErrorMsg(null);
      console.log("Bağlanılan Adres:", API_URL); 
      const response = await axios.get(API_URL);
      setData(response.data);
      setLoading(false);
    } catch (error: any) {
      console.error("Bağlantı Hatası:", error);
      setErrorMsg("Sunucuya bağlanılamadı. ngrok açık mı?");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData().then(() => setRefreshing(false));
  }, []);

  // En güncel veri
  const latest = data.length > 0 ? data[0] : null;
  const currentStatus = latest ? latest.air_quality_status : "Bilinmiyor";
  const gasValue = latest ? latest.mq9_value : 0;

  // Grafik Verisi Hazırlığı (Son 10 veri)
  const chartDataPoints = data.length > 0 ? data.slice(0, 10).reverse().map(d => d.mq9_value) : [0,0,0,0,0];
  const chartLabels = data.length > 0 ? data.slice(0, 10).reverse().map(d => {
      const date = new Date(d.created_at);
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  }) : ["-","-","-","-","-"];

  const lineChartData = {
    labels: chartLabels,
    datasets: [
      {
        data: chartDataPoints,
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, 
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, 
    labelColor: (opacity = 1) => `rgba(0, 0, 0, 0.5)`,
    fillShadowGradientFrom: "#4CAF50", 
    fillShadowGradientTo: "#ffffff",   
    fillShadowGradientFromOpacity: 0.6,
    fillShadowGradientToOpacity: 0.1,
    propsForDots: { r: "0" }, 
    propsForBackgroundLines: { strokeDasharray: "", stroke: "#eee" }, 
  };

  return (
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

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4CAF50" /></View>
      ) : errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : (
        <>
          <View style={styles.statusCard}>
            <View style={styles.statusBarContainer}>
              <View style={[styles.statusBarSegment, {backgroundColor: '#4CAF50', opacity: currentStatus === 'GOOD' ? 1 : 0.3}]} />
              <View style={[styles.statusBarSegment, {backgroundColor: '#FFC107', opacity: currentStatus === 'MODERATE' ? 1 : 0.3}]} />
              <View style={[styles.statusBarSegment, {backgroundColor: '#FF9800', opacity: currentStatus === 'UNHEALTHY' ? 1 : 0.3}]} />
              <View style={[styles.statusBarSegment, {backgroundColor: '#F44336', opacity: currentStatus === 'HAZARDOUS' ? 1 : 0.3}]} />
            </View>
            <Text style={[styles.statusText, {color: getStatusColor(gasValue)}]}>
              {currentStatus} ({getStatusTurkish(currentStatus)})
            </Text>
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Hava Kalitesi Trendi</Text>
              <Text style={styles.chartSubtitle}>Son Ölçümler</Text>
            </View>
            <LineChart
              data={lineChartData}
              width={screenWidth - 60}
              height={200}
              chartConfig={chartConfig}
              bezier 
              withDots={false} 
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              style={styles.chart}
            />
          </View>

          {latest && (
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}><FontAwesome5 name="temperature-high" size={20} color="#FF9800" /></View>
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
                <Text style={[styles.detailValue, {color: getStatusColor(gasValue), fontWeight: 'bold'}]}>
                  {getStatusTurkish(currentStatus)}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const getStatusColor = (value: number) => {
  if (value < 600) return '#4CAF50';
  if (value < 1200) return '#FFC107';
  if (value < 2000) return '#FF9800';
  return '#F44336';
};

const getStatusTurkish = (status: string) => {
    switch (status) {
        case "GOOD": return "İyi";
        case "MODERATE": return "Orta";
        case "UNHEALTHY": return "Sağlıksız";
        case "HAZARDOUS": return "Tehlikeli";
        default: return "";
    }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 300 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 50, fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 25 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  statusCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, alignItems: 'center', shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  statusBarContainer: { flexDirection: 'row', height: 12, width: '100%', borderRadius: 6, overflow: 'hidden', marginBottom: 15 },
  statusBarSegment: { flex: 1 },
  statusText: { fontSize: 18, fontWeight: 'bold' },
  chartCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  chartTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  chartSubtitle: { fontSize: 14, color: '#999' },
  chart: { paddingRight: 0, paddingLeft: 0, marginLeft: -20 }, 
  detailsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 30, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  detailIconContainer: { width: 40, alignItems: 'center' },
  detailLabel: { flex: 1, fontSize: 16, color: '#555', marginLeft: 10 },
  detailValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 50 },
});
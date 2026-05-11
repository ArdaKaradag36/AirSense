// Dosya: mobile-app/app/(tabs)/index.tsx

import React, { useState } from 'react';
// 👇 Platform EKLENDİ
import { StyleSheet, Text, View, ScrollView, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSensorData } from '../../context/SensorContext';
import { useTheme } from '../../context/ThemeContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import CustomHeader from '../../components/CustomHeader';
import { mapCo2SeriesToQualityScores, padLineChartPairs } from '../../utils/co2QualityChart';

const screenWidth = Dimensions.get("window").width;

const COLORS = {
  GOOD: '#00C853',
  MODERATE: '#FFD600',
  UNHEALTHY: '#FF3D00',
  HAZARDOUS: '#D50000',
  UNKNOWN: '#B0BEC5'
};
export default function HomeScreen() {
  usePushNotifications(); // Token alma işlemi

  // UI katmani yalnizca Context'ten gelen hazir veriyi kullanir; dogrudan servis/backend cagrisi yapmaz.
  const { history, data: latest, loading, refreshData } = useSensorData();
  const { isDarkMode, theme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const validData = Array.isArray(history) ? history : [];
  const currentStatus = latest ? latest.air_quality_status : null;
  const co2Value = latest ? Number(latest.co2_ppm) : 0;
  const vocValue = latest ? Number(latest.voc_index) : 0;
  const themeColor = getStatusColorFromString(currentStatus);

  const chartWindow = validData.slice(0, 24).reverse();
  const co2SeriesForChart =
    chartWindow.length > 0 ? chartWindow.map((d) => Number(d.co2_ppm)) : [];
  const rawScores = mapCo2SeriesToQualityScores(co2SeriesForChart);

  const chartLabelsRaw =
    chartWindow.length > 0
      ? chartWindow.map((d, index) => {
          if (index % 3 !== 0) return '';
          const date = new Date(d.created_at);
          return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        })
      : ['—'];

  const { scores: chartDataPoints, labels: chartLabels } = padLineChartPairs(rawScores, chartLabelsRaw);
  const chartHasRealPoints = chartWindow.length > 0;
  const dynamicChartWidth = Math.max(screenWidth - 48, chartDataPoints.length * 36);
  const lastUpdateText =
    latest && latest.created_at
      ? new Date(latest.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '--:--:--';

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

  // --- RENDER ---
  return (
    <View style={{flex: 1, backgroundColor: theme.background}}> 
      <CustomHeader />
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
      >
        {loading && !latest ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.GOOD} /></View>
        ) : (
          <>
            {/* STATUS CARD */}
            <View style={[styles.statusCard, { backgroundColor: theme.card }]}>
              <View style={styles.statusBarsRow}>
                <View style={[styles.individualStatusBar, { backgroundColor: COLORS.GOOD, opacity: currentStatus === 'GOOD' ? 1 : 0.15 }]} />
                <View style={[styles.individualStatusBar, { backgroundColor: COLORS.MODERATE, opacity: currentStatus === 'MODERATE' ? 1 : 0.15 }]} />
                <View style={[styles.individualStatusBar, { backgroundColor: COLORS.UNHEALTHY, opacity: currentStatus === 'UNHEALTHY' ? 1 : 0.15 }]} />
                <View style={[styles.individualStatusBar, { backgroundColor: COLORS.HAZARDOUS, opacity: currentStatus === 'HAZARDOUS' ? 1 : 0.15 }]} />
              </View>
              <Text style={[styles.statusText, { color: themeColor }]}>
                {latest ? getStatusTurkish(currentStatus) : (loading ? "Kalibre Ediliyor..." : "Bulut Bağlantısı Bekleniyor...")}
              </Text>
            </View>

            {/* CHART CARD */}
            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>Canlı kalite grafiği</Text>
              <Text style={[styles.chartCaption, { color: theme.subText }]}>
                Çizgi, tahmini CO2 değerine göre hesaplanan{' '}
                <Text style={{ fontWeight: '700', color: theme.text }}>hava kalitesi skorudur</Text>
                {' '}(0–100).{'\n'}
                Yukarı daha temiz, aşağı daha kirli ortam demektir. Veriler yaklaşık 10 saniyede bir yenilenir.
              </Text>
              {!chartHasRealPoints ? (
                <Text style={[styles.chartEmpty, { color: theme.subText }]}>
                  Grafik için sunucuda birkaç ardışık ölçüm birikmeli. Cihaz gönderiyorsa bir dakika içinde çizgi belirir.
                </Text>
              ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chartScrollContent}
              >
                <LineChart
                  data={lineChartData}
                  width={dynamicChartWidth}
                  height={220}
                  chartConfig={chartConfig}
                  fromZero
                  segments={4}
                  yAxisSuffix=""
                  bezier
                  withDots={chartDataPoints.length <= 12}
                  withInnerLines={true}
                  withOuterLines={false}
                  withVerticalLines={false}
                  style={{ marginVertical: 8, borderRadius: 16, paddingRight: 0, marginLeft: -10 }}
                />
              </ScrollView>
              )}
              <Text style={[styles.lastUpdateNote, { color: theme.subText }]}>
                Son güncelleme: {lastUpdateText}
              </Text>
            </View>

            {/* DETAILS CARD */}
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
                  <Text style={[styles.detailLabel, { color: theme.subText }]}>Karbondioksit:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{co2Value} ppm</Text>
                </View>
                <View style={[styles.separator, { backgroundColor: theme.border }]} />

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}><MaterialCommunityIcons name="air-filter" size={24} color="#607D8B" /></View>
                  <View style={styles.detailTextColumn}>
                    <Text style={[styles.detailColumnTitle, { color: theme.subText }]}>
                      Organik gazlar (VOC indeksi)
                    </Text>
                    <Text style={[styles.vocExplain, { color: theme.subText }]}>
                      Düşük sayı = daha temiz hava (Sensirion tarzı ölçek).
                    </Text>
                  </View>
                  <View style={styles.detailValueColumn}>
                    <Text style={[styles.detailValue, { color: themeColor, fontWeight: 'bold' }]}>
                      {vocValue}
                    </Text>
                    <Text style={[styles.vocBand, { color: themeColor }]}>{vocBandLabel(vocValue)}</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

    </View>
  );
}

// --- HELPERS ---
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
        default: return "Bulut Baglantisi Bekleniyor...";
    }
};

/** VOC: düşük = iyi (≤100 iyi, ≤200 orta, …). */
const vocBandLabel = (voc: number): string => {
  if (!Number.isFinite(voc) || voc <= 0) return 'Ölçüm yok';
  if (voc <= 100) return 'İyi aralık';
  if (voc <= 200) return 'Orta aralık';
  if (voc <= 300) return 'Sağlıksız aralık';
  return 'Tehlikeli aralık';
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 300 },

  // Kartlar
  statusCard: { borderRadius: 20, padding: 20, marginBottom: 20, marginHorizontal: 20, alignItems: 'center', shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  statusBarsRow: { flexDirection: 'row', height: 28, width: '100%', justifyContent: 'space-between', marginBottom: 18 },
  individualStatusBar: { flex: 1, borderRadius: 11, marginHorizontal: 6 },
  statusText: { fontSize: 25, fontWeight: 'bold', marginTop: 8 },
  
  chartCard: { borderRadius: 20, padding: 20, marginBottom: 20, marginHorizontal: 20, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  chartCaption: { fontSize: 13, marginBottom: 12, lineHeight: 20 },
  chartTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  chartEmpty: { fontSize: 13, marginBottom: 8, lineHeight: 18 },
  chartScrollContent: { paddingRight: 10 },
  lastUpdateNote: { marginTop: 8, fontSize: 12, textAlign: 'right' },
  
  detailsCard: { borderRadius: 20, padding: 20, marginBottom: 30, marginHorizontal: 20, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  detailIconContainer: { width: 40, alignItems: 'center' },
  detailLabel: { flex: 1, fontSize: 16, marginLeft: 10 },
  detailTextColumn: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  detailValueColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  detailColumnTitle: { fontSize: 16 },
  vocBand: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  detailValue: { fontSize: 18, fontWeight: 'bold' },
  separator: { height: 1, marginLeft: 50 },

});
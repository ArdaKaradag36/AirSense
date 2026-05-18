import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import CustomHeader from '../../components/CustomHeader';
import { apiService } from '../../services/apiService';
import { deviceService } from '../../services/deviceService';
import { SensorData } from '../../types/sensor.types';
import { mapCo2SeriesToQualityScores } from '../../utils/co2QualityChart';

const screenWidth = Dimensions.get('window').width;

type PeriodKey = '1h' | '24h' | '7d';
type MetricKey = 'co2_ppm' | 'temperature';

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: '1h', label: '1 Saat' },
  { key: '24h', label: '24 Saat' },
  { key: '7d', label: '7 Gun' },
];

const PERIOD_LIMIT_MAP: Record<PeriodKey, number> = {
  '1h': 12,
  '24h': 24,
  '7d': 56,
};
const PERIOD_QUERY_MAP: Record<PeriodKey, string> = {
  '1h': '1h',
  '24h': '24h',
  '7d': '7d',
};

const WEEKDAY_TR = ['Paz', 'Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt'];

function formatTimeLabel(dateString: string, period: PeriodKey): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '--';

  if (period === '7d') return WEEKDAY_TR[date.getDay()];
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatTooltipTime(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '--';
  const dd = date.getDate().toString().padStart(2, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const hh = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${dd}.${mm} ${hh}:${min}`;
}

export default function StatsScreen() {
  const { isDarkMode, theme } = useTheme();
  const [period, setPeriod] = useState<PeriodKey>('24h');
  const [loading, setLoading] = useState(true);
  const [deviceSerial, setDeviceSerial] = useState<string | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [co2Tooltip, setCo2Tooltip] = useState<string>('Noktaya dokunarak detay gor.');
  const [tempTooltip, setTempTooltip] = useState<string>('Noktaya dokunarak detay gor.');

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setErrorText(null);
      try {
        const serial = await deviceService.getUserDeviceSerial();
        setDeviceSerial(serial);
        if (!serial) {
          setHistory([]);
          setErrorText('Bu hesapta bagli cihaz bulunamadi.');
          return;
        }

        const limit = PERIOD_LIMIT_MAP[period];
        const rows = await apiService.getHistory({
          serialNumber: serial,
          limit,
          period: PERIOD_QUERY_MAP[period],
        });
        const chronological = [...rows].reverse();
        setHistory(chronological);
      } catch (error) {
        console.error('[Stats] veri yukleme hatasi:', error);
        setErrorText('Analiz verileri yuklenemedi. Lutfen tekrar deneyin.');
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [period]);

  const sparseLabels = useMemo(() => {
    if (history.length === 0) return ['--'];
    const every = period === '1h' ? 2 : period === '24h' ? 4 : 8;
    return history.map((item, index) => (index % every === 0 ? formatTimeLabel(item.created_at, period) : ''));
  }, [history, period]);

  const co2ValuesRaw = useMemo(
    () => (history.length > 0 ? history.map((item) => Number(item.co2_ppm ?? 0)) : [0]),
    [history]
  );
  const co2ChartScores = useMemo(() => mapCo2SeriesToQualityScores(co2ValuesRaw), [co2ValuesRaw]);
  const tempValues = useMemo(
    () => (history.length > 0 ? history.map((item) => Number(item.temperature ?? 0)) : [0]),
    [history]
  );

  const maxCo2 = useMemo(() => (co2ValuesRaw.length > 0 ? Math.max(...co2ValuesRaw) : 0), [co2ValuesRaw]);
  const avgTemp = useMemo(() => {
    if (tempValues.length === 0) return 0;
    const total = tempValues.reduce((sum, value) => sum + value, 0);
    return total / tempValues.length;
  }, [tempValues]);

  const statusBad = maxCo2 > 1000;
  const chartWidth = Math.max(screenWidth - 64, sparseLabels.length * 30);

  const baseChartConfig = {
    backgroundColor: theme.card,
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) =>
      isDarkMode ? `rgba(255, 255, 255, ${opacity * 0.75})` : `rgba(51, 51, 51, ${opacity * 0.75})`,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#10B981',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
  };

  const handleDataPointClick = (metric: MetricKey, index: number, chartYValue: number) => {
    const source = history[index];
    const timeText = source ? formatTooltipTime(source.created_at) : '--';
    const rawCo2 = source ? Number(source.co2_ppm ?? 0) : 0;
    const valueText =
      metric === 'co2_ppm'
        ? `${Math.round(rawCo2)} ppm (kalite ${Math.round(chartYValue)} / 100)`
        : `${chartYValue.toFixed(1)} °C`;
    const text = `${timeText} • ${valueText}`;
    if (metric === 'co2_ppm') setCo2Tooltip(text);
    if (metric === 'temperature') setTempTooltip(text);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmentedControl}>
          {PERIOD_OPTIONS.map((option) => {
            const active = option.key === period;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.segmentButton,
                  {
                    backgroundColor: active ? '#10B981' : theme.card,
                    borderColor: active ? '#10B981' : theme.border,
                  },
                ]}
                onPress={() => setPeriod(option.key)}
              >
                <Text style={[styles.segmentText, { color: active ? '#FFFFFF' : theme.subText }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={[styles.loadingCard, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={[styles.loadingText, { color: theme.subText }]}>Analiz verileri yukleniyor...</Text>
          </View>
        ) : (
          <>
            {errorText ? (
              <View style={[styles.errorCard, { backgroundColor: theme.card }]}>
                <Ionicons name="alert-circle-outline" size={22} color="#EF4444" />
                <Text style={[styles.errorText, { color: theme.text }]}>{errorText}</Text>
              </View>
            ) : null}

            {!errorText ? (
              <>
                <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                  <Text style={[styles.chartTitle, { color: theme.text }]}>Hava kalitesi (CO2)</Text>
                  <Text style={[styles.chartSubtitle, { color: theme.subText }]}>
                    Yuksek cizgi = daha iyi hava (0-100 skor)
                  </Text>
                  <Text style={[styles.tooltipText, { color: theme.subText }]}>{co2Tooltip}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={{
                        labels: sparseLabels,
                        datasets: [{ data: co2ChartScores }],
                      }}
                      width={chartWidth}
                      height={220}
                      yAxisSuffix=""
                      withInnerLines
                      withOuterLines={false}
                      withShadow
                      bezier
                      chartConfig={{
                        ...baseChartConfig,
                        color: (opacity = 1) => `rgba(220, 38, 38, ${opacity})`,
                        fillShadowGradient: '#10B981',
                        fillShadowGradientOpacity: 0.22,
                        propsForDots: { ...baseChartConfig.propsForDots, stroke: '#DC2626' },
                      }}
                      style={styles.chart}
                      onDataPointClick={(point) => handleDataPointClick('co2_ppm', point.index, point.value)}
                    />
                  </ScrollView>
                </View>

                <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                  <Text style={[styles.chartTitle, { color: theme.text }]}>Sicaklik Grafigi</Text>
                  <Text style={[styles.tooltipText, { color: theme.subText }]}>{tempTooltip}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={{
                        labels: sparseLabels,
                        datasets: [{ data: tempValues }],
                      }}
                      width={chartWidth}
                      height={220}
                      yAxisSuffix="°C"
                      withInnerLines
                      withOuterLines={false}
                      withShadow
                      bezier
                      chartConfig={{
                        ...baseChartConfig,
                        color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                        fillShadowGradient: '#F59E0B',
                        fillShadowGradientOpacity: 0.24,
                        propsForDots: { ...baseChartConfig.propsForDots, stroke: '#F59E0B' },
                      }}
                      style={styles.chart}
                      onDataPointClick={(point) => handleDataPointClick('temperature', point.index, point.value)}
                    />
                  </ScrollView>
                </View>

                <View style={styles.insightsRow}>
                  <View style={[styles.insightCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.insightLabel, { color: theme.subText }]}>Maksimum CO2</Text>
                    <Text style={[styles.insightValue, { color: theme.text }]}>{Math.round(maxCo2)} ppm</Text>
                  </View>
                  <View style={[styles.insightCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.insightLabel, { color: theme.subText }]}>Ortalama Sicaklik</Text>
                    <Text style={[styles.insightValue, { color: theme.text }]}>{avgTemp.toFixed(1)} °C</Text>
                  </View>
                </View>

                <View style={[styles.statusCard, { backgroundColor: theme.card }]}>
                  <MaterialCommunityIcons
                    name={statusBad ? 'alert-circle' : 'check-circle'}
                    size={24}
                    color={statusBad ? '#EF4444' : '#10B981'}
                  />
                  <View style={styles.statusTextContainer}>
                    <Text style={[styles.statusTitle, { color: theme.text }]}>Durum Ozeti</Text>
                    <Text style={[styles.statusDescription, { color: statusBad ? '#EF4444' : '#10B981' }]}>
                      {statusBad ? 'Havalandirma yetersiz' : 'Hava kalitesi ideal'}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </>
        )}

        <Text style={[styles.serialText, { color: theme.subText }]}>
          {deviceSerial ? `Aktif cihaz: ${deviceSerial}` : 'Aktif cihaz bulunamadi'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 30 },

  segmentedControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentText: { fontSize: 13, fontWeight: '700' },

  loadingCard: {
    borderRadius: 16,
    paddingVertical: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loadingText: { marginTop: 12, fontSize: 14 },

  errorCard: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  errorText: { fontSize: 14, flex: 1 },

  chartCard: {
    borderRadius: 18,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 0,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  chartTitle: { fontSize: 17, fontWeight: '700', paddingHorizontal: 14, marginBottom: 4 },
  chartSubtitle: { fontSize: 12, paddingHorizontal: 14, marginBottom: 6, lineHeight: 16 },
  tooltipText: { fontSize: 12, paddingHorizontal: 14, marginBottom: 8 },
  chart: { borderRadius: 16 },

  insightsRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  insightCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  insightLabel: { fontSize: 12, marginBottom: 6 },
  insightValue: { fontSize: 20, fontWeight: '700' },

  statusCard: {
    borderRadius: 14,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTextContainer: { marginLeft: 10 },
  statusTitle: { fontSize: 13, fontWeight: '600' },
  statusDescription: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  serialText: { marginTop: 14, fontSize: 12, textAlign: 'right' },
});

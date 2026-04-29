import React from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useSensorData } from '../../context/SensorContext';
// 👇 Tema Verisini Çek
import { useTheme } from '../../context/ThemeContext';
import CustomHeader from '../../components/CustomHeader';

const screenWidth = Dimensions.get("window").width;

export default function AnalysisScreen() {
  // Explore ekrani da yalnizca Context'ten beslenir; veri kaynagi degisse bu dosya etkilenmez.
  const { data, loading } = useSensorData();
  
  // ✅ Tema Kontrolü
  const { isDarkMode, theme } = useTheme();

  const getVocLevel = (vocIndex: number) => {
    if (vocIndex <= 100) return "GOOD";
    if (vocIndex <= 200) return "MODERATE";
    return "BAD";
  };

  const getCo2Level = (co2: number) => {
    if (co2 <= 1000) return "GOOD";
    if (co2 <= 1500) return "MODERATE";
    return "BAD";
  };

  const getAISuggestion = (vocIndex: number, co2: number, temp: number, humidity: number) => {
    const vocLevel = getVocLevel(vocIndex);
    const co2Level = getCo2Level(co2);

    if (vocLevel === "BAD" || co2Level === "BAD") return {
      text: "Hava kalitesi kotu seviyede. VOC veya CO2 degerleri riskli olabilir; ortami hemen havalandirin.",
      color: isDarkMode ? ["#4A0000", "#FF5252"] : ["#FFEBEE", "#D32F2F"],
      icon: "alert-octagon"
    };
    if (vocLevel === "MODERATE" || co2Level === "MODERATE") return {
      text: "Hava kalitesi orta seviyede. Daha iyi odaklanma ve konfor icin kisa bir havalandirma onerilir.",
      color: isDarkMode ? ["#3E1B00", "#FF9800"] : ["#FFF3E0", "#E65100"],
      icon: "weather-windy"
    };
    if (temp > 28) return {
      text: "Oda sıcaklığı çok yüksek, odaklanmanı zorlaştırabilir. Klimayı açabilir veya serin bir yere geçebilirsin.",
      color: isDarkMode ? ["#3E1B00", "#FF5722"] : ["#FFF3E0", "#BF360C"],
      icon: "thermometer-alert"
    };
    if (humidity > 70) return {
      text: "Nem oranı çok yüksek. Küf riskine karşı nem alma cihazı kullanman iyi olabilir.",
      color: isDarkMode ? ["#0D47A1", "#42A5F5"] : ["#E3F2FD", "#1565C0"],
      icon: "water-percent"
    };
    
    return {
      text: "Şu an hava kalitesi mükemmel! Oksijen seviyesi ideal. Çalışmak veya dinlenmek için harika bir ortam.",
      color: isDarkMode ? ["#003300", "#66BB6A"] : ["#E8F5E9", "#2E7D32"],
      icon: "robot-happy"
    };
  };

  const temp = data ? data.temperature : 0;
  const humidity = data ? data.humidity : 0;
  const co2 = data ? data.co2_ppm : 0;
  const vocIndex = data ? data.voc_index : 0;

  const aiAdvice = getAISuggestion(vocIndex, co2, temp, humidity);

  const getIconBoxColor = (lightColor: string) => isDarkMode ? '#2C2C2C' : lightColor;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomHeader />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {loading && !data ? (
          <ActivityIndicator size="large" color="#00C853" style={{marginTop: 50}} />
        ) : (
          <>
            <View style={[styles.aiCard, { backgroundColor: aiAdvice.color[0], borderColor: isDarkMode ? 'transparent' : 'rgba(0,0,0,0.05)' }]}>
              <View style={styles.aiHeader}>
                <MaterialCommunityIcons name="robot" size={28} color={aiAdvice.color[1]} />
                <Text style={[styles.aiTitle, { color: aiAdvice.color[1] }]}>AirSense AI Asistanı</Text>
              </View>
              <Text style={[styles.aiText, { color: aiAdvice.color[1] }]}>
                {aiAdvice.text}
              </Text>
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Hava Bileşenleri</Text>
            <View style={styles.gridContainer}>

            <View style={[styles.moleculeCard, { backgroundColor: theme.card }]}>
              <View style={[styles.iconBox, {backgroundColor: getIconBoxColor('#FFEBEE')}]}>
                <MaterialCommunityIcons name="molecule-co2" size={24} color="#D32F2F" />
              </View>
              <Text style={[styles.molValue, { color: theme.text }]}>{co2}</Text>
              <Text style={[styles.molLabel, { color: theme.subText }]}>PPM</Text>
            </View>

            <View style={[styles.moleculeCard, { backgroundColor: theme.card }]}>
              <View style={[styles.iconBox, {backgroundColor: getIconBoxColor('#ECEFF1')}]}>
                <MaterialCommunityIcons name="air-filter" size={22} color="#455A64" />
              </View>
              <Text style={[styles.molValue, { color: theme.text }]}>{vocIndex}</Text>
              <Text style={[styles.molLabel, { color: theme.subText }]}>VOC Index</Text>
            </View>

            <View style={[styles.moleculeCard, { backgroundColor: theme.card }]}>
              <View style={[styles.iconBox, {backgroundColor: getIconBoxColor('#E3F2FD')}]}>
                <Ionicons name="water" size={24} color="#1976D2" />
              </View>
              <Text style={[styles.molValue, { color: theme.text }]}>%{humidity}</Text>
              <Text style={[styles.molLabel, { color: theme.subText }]}>Nem Oranı</Text>
            </View>

            <View style={[styles.moleculeCard, { backgroundColor: theme.card }]}>
              <View style={[styles.iconBox, {backgroundColor: getIconBoxColor('#FFF3E0')}]}>
                <FontAwesome5 name="temperature-high" size={20} color="#E65100" />
              </View>
              <Text style={[styles.molValue, { color: theme.text }]}>{temp}°C</Text>
              <Text style={[styles.molLabel, { color: theme.subText }]}>Sıcaklık</Text>
            </View>
          </View>

          <View style={styles.recommendationSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Sağlık & Konfor Analizi</Text>
            
            <View style={[styles.actionCard, { backgroundColor: theme.card }]}>
              <View style={[styles.actionIcon, { backgroundColor: getIconBoxColor(co2 > 1500 ? '#FFEBEE' : co2 > 1000 ? '#FFF3E0' : '#E8F5E9') }]}>
                <MaterialCommunityIcons 
                  name={co2 > 1500 ? "brain" : co2 > 1000 ? "alert-circle-outline" : "check-circle"} 
                  size={24} 
                  color={co2 > 1500 ? "#D32F2F" : co2 > 1000 ? "#E65100" : "#2E7D32"} 
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Konsantrasyon Seviyesi</Text>
                <Text style={[styles.actionDesc, { color: theme.subText }]}>
                  {co2 > 1500
                    ? "CO2 seviyesi kotu. Bas agrisi ve dikkat dusuklugu riski yuksek."
                    : co2 > 1000
                    ? "CO2 seviyesi orta. Uzun sure ayni ortamda kalmadan havalandirma yapin."
                    : "CO2 seviyesi iyi. Odaklanma ve bilissel performans icin uygun."}
                </Text>
              </View>
            </View>

            <View style={[styles.actionCard, { backgroundColor: theme.card }]}>
              <View style={[styles.actionIcon, { backgroundColor: getIconBoxColor((temp > 26 || humidity > 65) ? '#FFF3E0' : '#E3F2FD') }]}>
                <MaterialCommunityIcons 
                  name={(temp > 26 || humidity > 65) ? "weather-sunny-alert" : "account-check"} 
                  size={24} 
                  color={(temp > 26 || humidity > 65) ? "#E65100" : "#1565C0"} 
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Termal Konfor</Text>
                <Text style={[styles.actionDesc, { color: theme.subText }]}>
                  {(temp > 26 || humidity > 65)
                    ? "Ortam biraz bunaltıcı olabilir. Serinlemeye çalışın." 
                    : "Sıcaklık ve nem dengesi insan konforu için uygun."}
                </Text>
              </View>
            </View>

            <View style={[styles.actionCard, { backgroundColor: theme.card }]}>
              <View style={[styles.actionIcon, { backgroundColor: getIconBoxColor('#F3E5F5') }]}>
                <MaterialCommunityIcons name="bed-king" size={24} color="#7B1FA2" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Uyku Ortamı</Text>
                <Text style={[styles.actionDesc, { color: theme.subText }]}>
                  {(co2 <= 1000 && vocIndex <= 100)
                    ? "CO2 ve VOC degerleri iyi. Kaliteli uyku icin uygun bir ortam."
                    : (co2 <= 1500 && vocIndex <= 200)
                    ? "Ortam orta seviyede. Uyumadan once kisa bir havalandirma onerilir."
                    : "CO2 veya VOC seviyesi kotu. Uyumadan once ortami mutlaka havalandirin."}
                </Text>
              </View>
            </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20 },
  
  aiCard: { padding: 26, borderRadius: 24, marginBottom: 34, borderWidth: 1 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  aiTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  aiText: { fontSize: 17, lineHeight: 26, fontWeight: '500' },

  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moleculeCard: { 
    width: '48%', 
    borderRadius: 16, 
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16, 
    alignItems: 'center',
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  iconBox: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  molValue: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  molLabel: { fontSize: 13 },

  recommendationSection: { marginTop: 10, marginBottom: 40 },
  actionCard: { flexDirection: 'row', borderRadius: 16, padding: 15, marginBottom: 12, alignItems: 'center', shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  actionIcon: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  actionDesc: { fontSize: 13 },
});
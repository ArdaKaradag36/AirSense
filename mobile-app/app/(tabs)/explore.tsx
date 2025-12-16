import React from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useSensorData } from '../../context/SensorContext';
// 👇 Tema Verisini Çek
import { useTheme } from '../../context/ThemeContext';

const screenWidth = Dimensions.get("window").width;

export default function AnalysisScreen() {
  const { data, loading } = useSensorData();
  
  // ✅ Tema Kontrolü
  const { isDarkMode, theme } = useTheme();

  const getSimulatedOxygen = (co2: number) => {
    const base = 20.9;
    const drop = co2 > 1000 ? 0.4 : 0.0;
    return (base - drop).toFixed(1);
  };
  const getSimulatedNitrogen = () => "78.0";

  const getAISuggestion = (status: string, temp: number, humidity: number) => {
    if (status === 'HAZARDOUS') return {
      text: "ACİL DURUM: Ortamda tehlikeli gaz seviyesi tespit edildi! Derhal ortamı terk et ve havalandırmayı aç.",
      color: isDarkMode ? ["#4A0000", "#FF5252"] : ["#FFEBEE", "#D32F2F"],
      icon: "alert-octagon"
    };
    if (status === 'UNHEALTHY') return {
      text: "Hava kalitesi sağlığını etkileyecek düzeyde düştü. Baş ağrısı yaşamamak için odayı 15 dakika havalandır.",
      color: isDarkMode ? ["#3E1B00", "#FF9800"] : ["#FFF3E0", "#E65100"],
      icon: "weather-windy"
    };
    if (status === 'MODERATE') return {
      text: "Hava kalitesi orta seviyede. Uzun süre kapalı kalmak yorgunluk yapabilir, taze hava girişi sağla.",
      color: isDarkMode ? ["#332A00", "#FFEB3B"] : ["#FFFDE7", "#FBC02D"],
      icon: "alert-circle-outline"
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

  const currentStatus = data ? data.air_quality_status : "UNKNOWN";
  const temp = data ? data.temperature : 0;
  const humidity = data ? data.humidity : 0;
  const co2 = data ? (data.mq9_value || data.mq135_value || data.co2 || data.ppm || 0) : 0;

  const aiAdvice = getAISuggestion(currentStatus, temp, humidity);

  const getIconBoxColor = (lightColor: string) => isDarkMode ? '#2C2C2C' : lightColor;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLogoContainer}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={[
                styles.headerLogoImage, 
                { backgroundColor: theme.logoBackground, borderRadius: theme.logoRadius, padding: theme.logoPadding }
            ]}
            resizeMode="contain" 
          />
          <Text style={[styles.headerTitle, { color: theme.text }]}>Analiz</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={28} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={{marginBottom: 20}}>
        <Text style={[styles.pageSubtitle, { color: theme.subText }]}>Moleküler Bileşenler & AI</Text>
      </View>

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
              <View style={[styles.iconBox, {backgroundColor: getIconBoxColor('#E1F5FE')}]}>
                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#0288D1'}}>O₂</Text>
              </View>
              <Text style={[styles.molValue, { color: theme.text }]}>{getSimulatedOxygen(co2)}%</Text>
              <Text style={styles.molLabel}>Oksijen</Text>
            </View>

            <View style={[styles.moleculeCard, { backgroundColor: theme.card }]}>
              <View style={[styles.iconBox, {backgroundColor: getIconBoxColor('#F3E5F5')}]}>
                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#7B1FA2'}}>N₂</Text>
              </View>
              <Text style={[styles.molValue, { color: theme.text }]}>{getSimulatedNitrogen()}%</Text>
              <Text style={styles.molLabel}>Azot</Text>
            </View>

            <View style={[styles.moleculeCard, { backgroundColor: theme.card }]}>
              <View style={[styles.iconBox, {backgroundColor: getIconBoxColor('#FFEBEE')}]}>
                <MaterialCommunityIcons name="molecule-co2" size={24} color="#D32F2F" />
              </View>
              <Text style={[styles.molValue, { color: theme.text }]}>{co2}</Text>
              <Text style={styles.molLabel}>PPM</Text>
            </View>

            <View style={[styles.moleculeCard, { backgroundColor: theme.card }]}>
              <View style={[styles.iconBox, {backgroundColor: getIconBoxColor('#E3F2FD')}]}>
                <Ionicons name="water" size={24} color="#1976D2" />
              </View>
              <Text style={[styles.molValue, { color: theme.text }]}>%{humidity}</Text>
              <Text style={styles.molLabel}>Nem Oranı</Text>
            </View>
            
             <View style={[styles.moleculeCard, { backgroundColor: theme.card }]}>
              <View style={[styles.iconBox, {backgroundColor: getIconBoxColor('#E0F2F1')}]}>
                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#00695C'}}>Ar</Text>
              </View>
              <Text style={[styles.molValue, { color: theme.text }]}>0.9%</Text>
              <Text style={styles.molLabel}>Argon</Text>
            </View>

             <View style={[styles.moleculeCard, { backgroundColor: theme.card }]}>
              <View style={[styles.iconBox, {backgroundColor: getIconBoxColor('#FFF3E0')}]}>
                <FontAwesome5 name="temperature-high" size={20} color="#E65100" />
              </View>
              <Text style={[styles.molValue, { color: theme.text }]}>{temp}°C</Text>
              <Text style={styles.molLabel}>Sıcaklık</Text>
            </View>
          </View>

          <View style={styles.recommendationSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Sağlık & Konfor Analizi</Text>
            
            <View style={[styles.actionCard, { backgroundColor: theme.card }]}>
              <View style={[styles.actionIcon, { backgroundColor: getIconBoxColor(co2 > 1000 ? '#FFEBEE' : '#E8F5E9') }]}>
                <MaterialCommunityIcons 
                  name={co2 > 1000 ? "brain" : "check-circle"} 
                  size={24} 
                  color={co2 > 1000 ? "#D32F2F" : "#2E7D32"} 
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Konsantrasyon Seviyesi</Text>
                <Text style={[styles.actionDesc, { color: theme.subText }]}>
                  {co2 > 1000 
                    ? "Yüksek CO2 baş ağrısı ve odaklanma sorunu yaratabilir." 
                    : "Hava temiz. Zihinsel performans için ideal seviyede."}
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
                  {co2 < 800 
                    ? "Bu hava kalitesi deliksiz bir uyku için mükemmel." 
                    : "Uyumadan önce odayı havalandırmak uyku kaliteni artırır."}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 60, 
    marginBottom: 20 
  },
  headerLogoContainer: { flexDirection: 'row', alignItems: 'center' },
  headerLogoImage: { width: 50, height: 50, marginRight: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  pageSubtitle: { fontSize: 16, marginTop: 5 },
  
  aiCard: { padding: 20, borderRadius: 20, marginBottom: 30, borderWidth: 1 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  aiTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  aiText: { fontSize: 16, lineHeight: 24, fontWeight: '500' },

  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moleculeCard: { 
    width: '31%', 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 15, 
    alignItems: 'center',
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  iconBox: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  molValue: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  molLabel: { fontSize: 12, color: '#888' },

  recommendationSection: { marginTop: 10, marginBottom: 40 },
  actionCard: { flexDirection: 'row', borderRadius: 16, padding: 15, marginBottom: 12, alignItems: 'center', shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  actionIcon: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  actionDesc: { fontSize: 13 },
});
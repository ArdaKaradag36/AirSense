import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Linking, Alert, Dimensions } from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

const screenWidth = Dimensions.get("window").width;

export default function SafetyScreen() {
  // Ayarlar State'leri (Demo amaçlı)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [alarmSoundEnabled, setAlarmSoundEnabled] = useState(true);
  const [autoCallEnabled, setAutoCallEnabled] = useState(false);

  // Acil Arama Fonksiyonu
  const handleEmergencyCall = () => {
    Alert.alert(
      "Acil Arama",
      "112 Acil Çağrı Merkezi aranacak. Onaylıyor musunuz?",
      [
        { text: "İptal", style: "cancel" },
        { text: "ARA", onPress: () => Linking.openURL('tel:112') }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Güvenlik Merkezi</Text>
        <Text style={styles.headerSubtitle}>Prosedürler & Ayarlar</Text>
      </View>

      {/* --- BÖLÜM 1: PANİK BUTONU --- */}
      <View style={styles.panicSection}>
        <TouchableOpacity style={styles.panicButton} onPress={handleEmergencyCall}>
          <View style={styles.panicIconContainer}>
            <MaterialCommunityIcons name="phone-alert" size={40} color="#fff" />
          </View>
          <View>
            <Text style={styles.panicTitle}>112 ACİL ARA</Text>
            <Text style={styles.panicSubtitle}>Tek dokunuşla yardım çağır</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* --- BÖLÜM 2: ACİL DURUM REHBERİ --- */}
      <Text style={styles.sectionTitle}>Acil Durum Rehberi</Text>
      
      {/* Gaz Sızıntısı Kartı */}
      <View style={styles.guideCard}>
        <View style={styles.guideHeader}>
          <MaterialCommunityIcons name="gas-cylinder" size={32} color="#FF9800" />
          <Text style={styles.guideTitle}>Gaz Sızıntısı / Koku</Text>
        </View>
        <View style={styles.guideSteps}>
          <StepItem number="1" text="Elektrik düğmelerine/prize DOKUNMA." />
          <StepItem number="2" text="Çakmak veya kibrit YAKMA." />
          <StepItem number="3" text="Pencereleri ve kapıları AÇ." />
          <StepItem number="4" text="Doğalgaz vanasını KAPAT." />
          <StepItem number="5" text="Hemen dışarı çık ve 187'yi ara." />
        </View>
      </View>

      {/* Karbonmonoksit Kartı */}
      <View style={styles.guideCard}>
        <View style={styles.guideHeader}>
          <MaterialCommunityIcons name="molecule-co" size={32} color="#D32F2F" />
          <Text style={styles.guideTitle}>Yüksek CO (Karbonmonoksit)</Text>
        </View>
        <View style={styles.guideSteps}>
          <StepItem number="1" text="Baş ağrısı/mide bulantısı varsa hemen çık." />
          <StepItem number="2" text="Tüm pencereleri AÇ." />
          <StepItem number="3" text="Kombiyi veya sobayı SÖNDÜR." />
          <StepItem number="4" text="Temiz havaya çık ve sağlık ekiplerini ara." />
        </View>
      </View>

      {/* --- BÖLÜM 3: SİSTEM AYARLARI --- */}
      <Text style={styles.sectionTitle}>Sistem Ayarları</Text>
      <View style={styles.settingsCard}>
        
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="notifications" size={24} color="#555" />
            <Text style={styles.settingText}>Anlık Bildirimler</Text>
          </View>
          <Switch 
            value={notificationsEnabled} 
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#767577", true: "#4CAF50" }}
          />
        </View>

        <View style={styles.separator} />

        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <MaterialCommunityIcons name="alarm-light" size={24} color="#555" />
            <Text style={styles.settingText}>Sesli Alarm</Text>
          </View>
          <Switch 
            value={alarmSoundEnabled} 
            onValueChange={setAlarmSoundEnabled}
            trackColor={{ false: "#767577", true: "#4CAF50" }}
          />
        </View>

        <View style={styles.separator} />

        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <MaterialCommunityIcons name="phone-outgoing" size={24} color="#555" />
            <View>
              <Text style={styles.settingText}>Otomatik Arama</Text>
              <Text style={styles.settingSubText}>Tehlike anında oto-ara</Text>
            </View>
          </View>
          <Switch 
            value={autoCallEnabled} 
            onValueChange={setAutoCallEnabled}
            trackColor={{ false: "#767577", true: "#F44336" }}
          />
        </View>

      </View>

      {/* Profil / Çıkış */}
      <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutText}>Oturumu Kapat</Text>
      </TouchableOpacity>
      
      <View style={{height: 50}} /> 
    </ScrollView>
  );
}

// Yardımcı Bileşen: Adım Satırı
const StepItem = ({ number, text }: { number: string, text: string }) => (
  <View style={styles.stepContainer}>
    <View style={styles.stepBadge}>
      <Text style={styles.stepNumber}>{number}</Text>
    </View>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  header: { marginTop: 40, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 16, color: '#666', marginTop: 5 },

  // Panic Button
  panicSection: { marginBottom: 30, alignItems: 'center' },
  panicButton: {
    flexDirection: 'row',
    backgroundColor: '#D32F2F',
    width: '100%',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#D32F2F",
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  panicIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 50,
    marginRight: 15
  },
  panicTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  panicSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },

  // Section Title
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },

  // Guide Cards
  guideCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  guideHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10 },
  guideTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 10 },
  guideSteps: { paddingLeft: 5 },
  
  stepContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepBadge: { 
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#ECEFF1', 
    justifyContent: 'center', alignItems: 'center', marginRight: 10 
  },
  stepNumber: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  stepText: { fontSize: 15, color: '#444', flex: 1 },

  // Settings
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 5,
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  settingLabelContainer: { flexDirection: 'row', alignItems: 'center' },
  settingText: { fontSize: 16, marginLeft: 15, color: '#333', fontWeight: '500' },
  settingSubText: { fontSize: 12, marginLeft: 15, color: '#888' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 15 },

  // Logout
  logoutButton: {
    marginTop: 30,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  logoutText: { color: '#D32F2F', fontSize: 16, fontWeight: 'bold' },
});
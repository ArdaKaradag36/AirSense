import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Linking, Alert, Dimensions } from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import CustomHeader from '../../components/CustomHeader';
import { useSensorData } from '../../context/SensorContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useAuth } from '../../context/AuthContext';
import { deviceService } from '../../services/deviceService';

const screenWidth = Dimensions.get("window").width;

export default function SafetyScreen() {
  const [alarmSoundEnabled, setAlarmSoundEnabled] = useState(true);
  const [autoCallEnabled, setAutoCallEnabled] = useState(false);
  const [deviceSerial, setDeviceSerial] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  // Safety ekrani servis detaylarini bilmez; Context uzerinden hazir state ve aksiyon alir.
  const { phoneNotificationsEnabled, setPhoneNotificationsEnabled } = useSensorData();
  const { expoPushToken, saveTokenToBackend, removeTokenFromBackend } = usePushNotifications();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      console.log("[Safety] Logout Basladi");
      await signOut();
      console.log("[Safety] signOut() tamamlandi, zorla '/' ekranina yonlendiriliyor");
      router.replace("/");
      setTimeout(() => router.replace("/"), 0);
    } catch (error) {
      console.error("[Safety] handleSignOut hatasi:", error);
    }
  };

  useEffect(() => {
    const loadUserContext = async () => {
      try {
        const [serial, currentUsername] = await Promise.all([
          deviceService.getUserDeviceSerial(),
          deviceService.getCurrentUsername(),
        ]);
        setDeviceSerial(serial);
        setUsername(currentUsername);
      } catch (error) {
        console.error("[Safety] kullanici/cihaz bilgisi okunamadi:", error);
      }
    };

    loadUserContext();
  }, []);


  // ✅ Tema Kontrolü
  const { isDarkMode, toggleTheme, theme } = useTheme();

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

  // Tema uyumlu StepItem
  const StepItem = ({ number, text }: { number: string, text: string }) => (
    <View style={styles.stepContainer}>
      <View style={[styles.stepBadge, { backgroundColor: theme.border }]}>
        <Text style={[styles.stepNumber, { color: theme.text }]}>{number}</Text>
      </View>
      <Text style={[styles.stepText, { color: theme.subText }]}>{text}</Text>
    </View>
  );

  const handlePhoneNotificationsToggle = async (enabled: boolean) => {
    setPhoneNotificationsEnabled(enabled);
    const token = expoPushToken ?? '';
    if (!token) return;

    if (enabled) {
      await saveTokenToBackend(token);
    } else {
      await removeTokenFromBackend(token);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomHeader />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      {/* PANİK BUTONU */}
      <View style={styles.panicSection}>
        <TouchableOpacity style={styles.panicButton} onPress={handleEmergencyCall}>
          <View style={styles.panicIconContainer}>
            <MaterialCommunityIcons name="phone-alert" size={50} color="#fff" />
          </View>
          <View>
            <Text style={styles.panicTitle}>112 ACİL ARA</Text>
            <Text style={styles.panicSubtitle}>Tek dokunuşla yardım çağır</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ACİL DURUM REHBERİ */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Acil Durum Rehberi</Text>
      
      {/* Gaz Sızıntısı Kartı */}
      <View style={[styles.guideCard, { backgroundColor: theme.card }]}>
        <View style={[styles.guideHeader, { borderBottomColor: theme.border }]}>
          <MaterialCommunityIcons name="gas-cylinder" size={32} color="#FF9800" />
          <Text style={[styles.guideTitle, { color: theme.text }]}>Gaz Sızıntısı / Koku</Text>
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
      <View style={[styles.guideCard, { backgroundColor: theme.card }]}>
        <View style={[styles.guideHeader, { borderBottomColor: theme.border }]}>
          <MaterialCommunityIcons name="molecule-co" size={32} color="#D32F2F" />
          <Text style={[styles.guideTitle, { color: theme.text }]}>Yüksek CO (Karbonmonoksit)</Text>
        </View>
        <View style={styles.guideSteps}>
          <StepItem number="1" text="Baş ağrısı/mide bulantısı varsa hemen çık." />
          <StepItem number="2" text="Tüm pencereleri AÇ." />
          <StepItem number="3" text="Kombiyi veya sobayı SÖNDÜR." />
          <StepItem number="4" text="Temiz havaya çık ve sağlık ekiplerini ara." />
        </View>
      </View>

      {/* SİSTEM AYARLARI */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Sistem Ayarları</Text>
      <View style={[styles.settingsCard, { backgroundColor: theme.card }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="person-circle-outline" size={24} color={theme.subText} />
            <View>
              <Text style={[styles.settingText, { color: theme.text }]}>
                {username ? `Hos geldin, ${username}` : "Hos geldin"}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <MaterialCommunityIcons name="identifier" size={24} color={theme.subText} />
            <View>
              <Text style={[styles.settingText, { color: theme.text }]}>Aktif Cihaz</Text>
              <Text style={[styles.settingSubText, { color: theme.subText }]}>
                {deviceSerial
                  ? `Bu cihazi kullaniyorsun: ${deviceSerial}`
                  : "Bu hesapta cihaz baglantisi bulunamadi."}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.separator, { backgroundColor: theme.border }]} />
        
        {/* 👇 YENİ EKLENEN KARANLIK MOD BUTONU */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="moon" size={24} color={theme.subText} />
            <Text style={[styles.settingText, { color: theme.text }]}>Karanlık Mod</Text>
          </View>
          <Switch 
            value={isDarkMode} 
            onValueChange={toggleTheme} 
            trackColor={{ false: "#767577", true: "#2196F3" }} // Mavi renk yaptık
          />
        </View>

        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        {/* Anlık Bildirimler */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="notifications" size={24} color={theme.subText} />
            <Text style={[styles.settingText, { color: theme.text }]}>Anlık Bildirimler</Text>
          </View>
          <Switch 
            value={phoneNotificationsEnabled}
            onValueChange={handlePhoneNotificationsToggle}
            trackColor={{ false: isDarkMode ? "#555" : "#767577", true: "#4CAF50" }}
          />
        </View>

        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        {/* Sesli Alarm */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <MaterialCommunityIcons name="alarm-light" size={24} color={theme.subText} />
            <Text style={[styles.settingText, { color: theme.text }]}>Sesli Alarm</Text>
          </View>
          <Switch 
            value={alarmSoundEnabled} 
            onValueChange={setAlarmSoundEnabled}
            trackColor={{ false: isDarkMode ? "#555" : "#767577", true: "#4CAF50" }}
          />
        </View>

        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        {/* Otomatik Arama */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <MaterialCommunityIcons name="phone-outgoing" size={24} color={theme.subText} />
            <View>
              <Text style={[styles.settingText, { color: theme.text }]}>Otomatik Arama</Text>
              <Text style={[styles.settingSubText, { color: theme.subText }]}>Tehlike anında oto-ara</Text>
            </View>
          </View>
          <Switch 
            value={autoCallEnabled} 
            onValueChange={setAutoCallEnabled}
            trackColor={{ false: isDarkMode ? "#555" : "#767577", true: "#F44336" }}
          />
        </View>

      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.logoutText}>Oturumu Kapat</Text>
      </TouchableOpacity>
      
      <View style={{height: 50}} /> 
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20 },

  panicSection: { marginBottom: 30, alignItems: 'center' },
  panicButton: {
    flexDirection: 'row',
    backgroundColor: '#D32F2F',
    width: '100%',
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderRadius: 24,
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
    padding: 12,
    borderRadius: 50,
    marginRight: 15
  },
  panicTitle: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  panicSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },

  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },

  guideCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  guideHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, paddingBottom: 10 },
  guideTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  guideSteps: { paddingLeft: 5 },
  
  stepContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepBadge: { 
    width: 24, height: 24, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center', marginRight: 10 
  },
  stepNumber: { fontSize: 12, fontWeight: 'bold' },
  stepText: { fontSize: 15, flex: 1 },

  settingsCard: {
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
  settingText: { fontSize: 16, marginLeft: 15, fontWeight: '500' },
  settingSubText: { fontSize: 12, marginLeft: 15 },
  separator: { height: 1, marginHorizontal: 15 },

  logoutButton: {
    marginTop: 30,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  logoutText: { color: '#D32F2F', fontSize: 16, fontWeight: 'bold' },
});
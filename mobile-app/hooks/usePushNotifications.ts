// Dosya: mobile-app/hooks/usePushNotifications.ts

import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { DEMO_MODE } from '../constants/demo';
import { apiService } from '../services/apiService';

// Bildirim davranış ayarları
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Bildirim izni verilmedi!');
      return;
    }

    try {
      // ✅ İŞTE ÇÖZÜM BURADA: ID'yi elle yazdık
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: "3127318d-2604-4fea-86d9-07dd167edf63"
      })).data;
      
      console.log("🔥 EXPO PUSH TOKEN ALINDI:", token);
    } catch (e) {
      console.error("Token alınırken hata:", e);
    }
  } else {
    console.log('Fiziksel cihaz kullanmalısın. Emülatörde Push çalışmaz.');
  }

  return token;
}

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (DEMO_MODE) return;

    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);

      if (token) saveTokenToBackend(token);
    });
  }, []);

  const saveTokenToBackend = async (token: string) => {
    try {
      // Bu fonksiyon servis katmanını çağırır; yarın HTTP yerine başka bir protokol gelirse sadece apiService güncellenir.
      await apiService.registerPushToken(token);
      console.log("✅ Token Backend'e kaydedildi.");
    } catch (error) {
      console.error("❌ Token Backend'e gönderilemedi:", error);
    }
  };

  const removeTokenFromBackend = async (token: string) => {
    try {
      // Ağ erişimini UI/hook içinde tutmuyoruz; gevşek bağlılık için servis katmanına delege ediyoruz.
      await apiService.unregisterPushToken(token);
      console.log("🧹 Token Backend'den silindi.");
    } catch (error) {
      console.error("❌ Token Backend'den silinemedi:", error);
    }
  };

  return { expoPushToken, saveTokenToBackend, removeTokenFromBackend };
};
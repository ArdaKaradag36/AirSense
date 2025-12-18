// Dosya: mobile-app/hooks/usePushNotifications.ts

import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

// 👇 BURAYA DİKKAT: Bilgisayarının IP adresi doğru mu? (192.168.1.100 olarak kalmış)
const BACKEND_URL = "http://192.168.1.100:8000/api/v1/register-token"; 

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
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);

      if (token) {
        saveTokenToBackend(token);
      }
    });
  }, []);

  const saveTokenToBackend = async (token: string) => {
    try {
      await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Backend güvenlik şifresi açıksa burayı aktif et:
          // 'x-api-key': 'airsense-2025-secure-key-v1'
        },
        body: JSON.stringify({ token: token }),
      });
      console.log("✅ Token Backend'e kaydedildi.");
    } catch (error) {
      console.error("❌ Token Backend'e gönderilemedi:", error);
    }
  };

  return { expoPushToken };
};
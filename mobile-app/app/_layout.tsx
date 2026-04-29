import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ActivityIndicator, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SensorProvider } from '../context/SensorContext';
// 👇 1. Yeni Tema Merkezini çağırıyoruz
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    // Tum global state'leri tek noktadan sagliyoruz: auth + sensor + tema.
    <AuthProvider>
      <SensorProvider>
        <ThemeProvider> 
        <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AppNavigator />
        </NavigationThemeProvider>
        </ThemeProvider>
      </SensorProvider>
    </AuthProvider>
  );
}

function AppNavigator() {
  const { loading, user, recoveryMode } = useAuth();
  const router = useRouter();

  /**
   * Sifre sifirlama deep link akisi:
   *
   * 1. Kullanici email'deki linke dokunur.
   * 2. Cihaz `mobileapp://reset-password#access_token=...&refresh_token=...&type=recovery`
   *    URL'i ile uygulamayi acar.
   * 3. Asagidaki listener URL fragment'indaki tokenlari ayiklar ve
   *    Supabase'e iletir; bu cagri AuthContext'teki PASSWORD_RECOVERY
   *    event'ini tetikler ve `recoveryMode` true olur.
   *
   * Yapilandirma kontrol listesi:
   *   * app.json icindeki `expo.scheme` "mobileapp" olmali (ayarli).
   *   * Supabase Dashboard -> Authentication -> URL Configuration ->
   *     Redirect URLs listesine "mobileapp://reset-password" eklenmeli.
   *   * iOS / Android native build'larinda otomatik olarak bu scheme
   *     yakalanir; Expo Go ile test ederken `exp://` URL'i kullanilir
   *     ve `Linking.createURL` bunu kendisi degisik formata cevirir.
   */
  useEffect(() => {
    const handleUrl = async (incomingUrl: string | null) => {
      if (!incomingUrl) return;

      const fragment = incomingUrl.split("#")[1] ?? "";
      if (!fragment) return;

      const params = new URLSearchParams(fragment);
      const type = params.get("type");
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (type !== "recovery" || !accessToken || !refreshToken) return;

      try {
        console.log("[RootLayout] recovery URL yakalandi, setSession cagriliyor.");
        await authService.setRecoverySession(accessToken, refreshToken);
      } catch (error) {
        console.error("[RootLayout] recovery setSession hatasi:", error);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  /**
   * recoveryMode true olunca otomatik olarak reset-password ekranina yonlendir.
   * Stack remount'unu engellemek icin stackKey'i de "recovery" olarak sabitliyoruz.
   */
  useEffect(() => {
    if (recoveryMode) {
      console.log("[RootLayout] recoveryMode aktif, reset-password ekranina yonlendiriliyor.");
      router.replace("/(auth)/reset-password");
    }
  }, [recoveryMode, router]);

  if (loading) {
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
          backgroundColor: 'rgba(0,0,0,0.08)',
        }}
      >
        <ActivityIndicator size="large" color="#00C853" />
      </View>
    );
  }

  /**
   * Kritik fix:
   * Stack'e user durumuna gore key vererek logout/login aninda navigation state'i sifirliyoruz.
   * Bu sayede tabs icinde "kilitli kalma" problemi ortadan kalkar.
   *
   * recoveryMode aktifken key'i sabit tutuyoruz; aksi halde setSession sonrasi
   * user non-null olunca stack remount olur ve kullanici yanlislikla tabs'a
   * yonlendirilebilir.
   */
  const stackKey = recoveryMode ? "recovery" : user ? "signed-in" : "signed-out";

  return (
    <Stack key={stackKey}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
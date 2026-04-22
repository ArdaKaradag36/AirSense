import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Redirect, Stack, usePathname, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ActivityIndicator, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SensorProvider } from '../context/SensorContext';
// 👇 1. Yeni Tema Merkezini çağırıyoruz
import { ThemeProvider } from '../context/ThemeContext'; 
import { AuthProvider, useAuth } from '../context/AuthContext';

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
          <AuthGate />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </NavigationThemeProvider>
        </ThemeProvider>
      </SensorProvider>
    </AuthProvider>
  );
}

function AuthGate() {
  const segments = useSegments();
  const pathname = usePathname();
  const { loading, user } = useAuth();
  const inTabsGroup = segments[0] === '(tabs)';
  const inAuthGroup = segments[0] === '(auth)';
  const isWelcomeScreen = pathname === '/';

  /**
   * Guvenli navigasyon kurali:
   * - Device-first kurali nedeniyle ilk acilis her zaman VIP karsilama ekranidir (`/`).
   * - Giris yapmamis kullanici tab ekranlarina gidemez; cihaz dogrulama akisina geri doner.
   * - Girisli kullanici auth veya welcome ekranindaysa dogrudan dashboard akisina yonlendirilir.
   */
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

  if (!user && inTabsGroup) {
    return <Redirect href="/" />;
  }

  if (user && (inAuthGroup || isWelcomeScreen)) {
    return <Redirect href="/(tabs)" />;
  }

  return null;
}
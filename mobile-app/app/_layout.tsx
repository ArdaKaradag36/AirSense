import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { ActivityIndicator, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SensorProvider } from '../context/SensorContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { deviceService } from '../services/deviceService';

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
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  return (
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
  const { loading, initializing, user, recoveryMode } = useAuth();
  const router = useRouter();
  const navLock = useRef(false);
  const prevUserId = useRef<string | null>(null);

  // Recovery (şifre sıfırlama) deep-link
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const fragment = url.split('#')[1] ?? '';
      if (!fragment) return;
      const p = new URLSearchParams(fragment);
      if (p.get('type') !== 'recovery') return;
      const at = p.get('access_token');
      const rt = p.get('refresh_token');
      if (!at || !rt) return;
      try { await authService.setRecoverySession(at, rt); }
      catch (e) { console.error('[RootLayout] recovery hatasi:', e); }
    };
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (recoveryMode) router.replace('/(auth)/reset-password');
  }, [recoveryMode]);

  /**
   * Auth gate: user state React tarafından commit edildikten SONRA (useEffect)
   * çalışır — böylece Tabs layout doğru user değerini görür.
   */
  useEffect(() => {
    if (initializing || recoveryMode) return;
    if (navLock.current) return;

    const currentId = user?.id ?? null;
    const prevId = prevUserId.current;

    console.log('[AppNavigator] effect: currentId=', currentId, 'prevId=', prevId, 'initializing=', initializing);

    if (currentId === prevId) return;
    prevUserId.current = currentId;

    if (!user) {
      console.log('[AppNavigator] user null -> login yonlendirmesi');
      if (prevId !== null) {
        router.replace('/(auth)/login');
      }
      return;
    }

    navLock.current = true;
    console.log('[AppNavigator] user var -> tabs yonlendirmesi basliyor, id=', user.id);
    deviceService.getDeviceSerialForUserId(user.id)
      .then((serial) => {
        console.log('[AppNavigator] user=', user.id, 'serial=', serial);
        router.replace('/(tabs)');
      })
      .catch((e) => {
        console.error('[AppNavigator] serial sorgu hatasi:', e);
        router.replace('/(tabs)');
      })
      .finally(() => { navLock.current = false; });
  }, [user, initializing, recoveryMode]);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#00C853" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
    </Stack>
  );
}

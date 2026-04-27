import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
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
          <AppNavigator />
        </NavigationThemeProvider>
        </ThemeProvider>
      </SensorProvider>
    </AuthProvider>
  );
}

function AppNavigator() {
  const { loading, user } = useAuth();
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
   */
  const stackKey = user ? "signed-in" : "signed-out";

  return (
    <Stack key={stackKey}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
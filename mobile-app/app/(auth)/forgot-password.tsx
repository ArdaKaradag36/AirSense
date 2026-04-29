import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { Link, useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { authService } from "../../services/authService";

/**
 * Sifre sifirlama emailindeki `redirect_to` degeri.
 *
 * - Bos birakilirsa: `Linking.createURL` Expo Go icin `exp://IP:8081/--/reset-password`
 *   uretir. Bu linki **sadece telefonda** (Expo Go ile) acmak gerekir; masaustu
 *   Chrome `exp://` acamaz, gri/bos sayfa gorunur — bu normal.
 * - Sabit sema istersen: mobile-app/.env icine ornegin
 *   EXPO_PUBLIC_PASSWORD_RESET_REDIRECT=mobileapp://reset-password
 *   (development build / production icin; Supabase Redirect URLs'te tanimli olmali.)
 */
function getPasswordResetRedirectUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT?.trim();
  if (fromEnv) return fromEnv;
  return Linking.createURL(RESET_REDIRECT_PATH);
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const [email, setEmail] = useState("");
  const [errorText, setErrorText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isDisabled = useMemo(() => !email.trim() || submitting, [email, submitting]);

  const handleSendReset = async () => {
    setErrorText("");
    setSubmitting(true);
    try {
      const redirectTo = getPasswordResetRedirectUrl();
      console.log("[ForgotPassword] resetPasswordForEmail redirect:", redirectTo);
      await authService.sendPasswordResetEmail(email.trim(), redirectTo);
      Alert.alert(
        "E-postani kontrol et",
        "Sifre sifirlama baglantisi gonderildi.\n\n" +
          "ONEMLI: Baglantiyi telefonunda ac — Gmail veya Expo Go uygulamasi icinden. " +
          "Masaustu tarayicisinda (Chrome) exp:// veya mobil uygulama linkini acmak " +
          "genelde bos/gri sayfa verir; bu hata degil.\n\n" +
          "Wi-Fi veya IP degistiyse once yeni sifir maili iste (redirect adresi guncellenir).",
        [{ text: "Tamam", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Email gonderilirken bir hata olustu.";
      setErrorText(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.brand, { color: theme.text }]}>Sifremi Unuttum</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          Hesabina kayitli e-postani gir. Sifre sifirlama linkini hemen ileteceğiz.
        </Text>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: isDarkMode ? "#262626" : "#F4F6F8", color: theme.text, borderColor: theme.border },
          ]}
          placeholder="E-posta"
          placeholderTextColor={theme.subText}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
        />

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

        <Text style={[styles.hint, { color: theme.subText }]}>
          Gonderdigimiz baglantiyi telefonda acman gerekir (Expo Go yuklu ayni cihaz).
          Masaustu Gmail + Chrome ile acmak buyuk ihtimalle calismaz.
        </Text>

        <Pressable
        >
          {submitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Gonderiliyor...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Sifre Sifirlama Linki Gonder</Text>
          )}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: theme.subText }]}>Sifreni hatirladin mi?</Text>
          <Link href="/(auth)/login" style={styles.linkText}>
            Giris Yap
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  brand: { fontSize: 26, fontWeight: "800", marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 22, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: "#00C853",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  error: { color: "#D32F2F", fontSize: 13, marginBottom: 8 },
  footerRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  footerText: { fontSize: 13 },
  linkText: { color: "#00C853", fontSize: 13, fontWeight: "700" },
});

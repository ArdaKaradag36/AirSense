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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { PASSWORD_MIN_LENGTH, validatePasswordForRegister } from "../../utils/password";

/**
 * Yeni Sifre Belirleme ekrani.
 *
 * BU EKRANA NASIL ULASILIR?
 * 1. Kullanici "Sifremi Unuttum" sayfasinda email girer.
 * 2. Supabase, "mobileapp://reset-password" deep link'i icin imzali bir
 *    redirect URL ile email gonderir.
 * 3. Kullanici email'deki linke dokununca cihaz bu ekrani acar.
 * 4. Root layout (_layout.tsx) URL fragment'indaki access/refresh token'i
 *    Supabase'e iletir, AuthContext recoveryMode flag'ini set eder ve bu
 *    ekrana yonlendirir.
 *
 * ONEMLI: Bu ekran dogrudan navigasyon ile de acilabilir, fakat aktif bir
 * recovery oturumu yoksa `auth.updateUser` 401 hatasi dondurur.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { clearRecoveryMode } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const passwordChecks = useMemo(() => validatePasswordForRegister(password), [password]);

  const isDisabled = useMemo(
    () => !password || !confirmPassword || !passwordChecks.ok || submitting,
    [password, confirmPassword, passwordChecks.ok, submitting]
  );

  const handleUpdatePassword = async () => {
    setErrorText("");
    if (!passwordChecks.ok) {
      setErrorText("Lutfen asagidaki sifre kurallarinin tumunu saglayin.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorText("Sifreler eslesmiyor.");
      return;
    }

    setSubmitting(true);
    try {
      await authService.updatePassword(password);
      Alert.alert(
        "Sifre guncellendi",
        "Yeni sifrenle giris yapabilirsin.",
        [
          {
            text: "Tamam",
            onPress: () => {
              clearRecoveryMode();
              router.replace("/(auth)/login");
            },
          },
        ]
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Sifre guncellenirken bir hata olustu.";
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
        <Text style={[styles.brand, { color: theme.text }]}>Yeni Sifre</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          Hesabin icin guvenli bir yeni sifre belirle.
        </Text>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: isDarkMode ? "#262626" : "#F4F6F8", color: theme.text, borderColor: theme.border },
          ]}
          placeholder="Yeni Sifre"
          placeholderTextColor={theme.subText}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View
          style={[
            styles.rulesCard,
            { backgroundColor: isDarkMode ? "#1A1A1A" : "#F0F4F8", borderColor: theme.border },
          ]}
        >
          <Text style={[styles.rulesTitle, { color: theme.text }]}>Sifre gereksinimleri</Text>
          <RuleRow met={passwordChecks.hasMinLength} theme={theme} text={`En az ${PASSWORD_MIN_LENGTH} karakter`} />
          <RuleRow met={passwordChecks.hasUpper} theme={theme} text="En az bir buyuk harf (A-Z)" />
          <RuleRow met={passwordChecks.hasLower} theme={theme} text="En az bir kucuk harf (a-z)" />
          <RuleRow met={passwordChecks.hasDigit} theme={theme} text="En az bir rakam (0-9)" />
          <RuleRow
            met={passwordChecks.hasSpecial}
            theme={theme}
            text="En az bir ozel karakter (! @ # $ % & * vb.)"
          />
        </View>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: isDarkMode ? "#262626" : "#F4F6F8", color: theme.text, borderColor: theme.border },
          ]}
          placeholder="Yeni Sifre (Tekrar)"
          placeholderTextColor={theme.subText}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

        <Pressable
          onPress={handleUpdatePassword}
          disabled={isDisabled}
          style={[styles.primaryButton, { opacity: isDisabled ? 0.6 : 1 }]}
        >
          {submitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Guncelleniyor...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Sifreyi Guncelle</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function RuleRow({ met, theme, text }: { met: boolean; theme: { text: string; subText: string }; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons
        name={met ? "checkmark-circle" : "ellipse-outline"}
        size={18}
        color={met ? "#00C853" : theme.subText}
      />
      <Text style={[styles.ruleText, { color: met ? theme.text : theme.subText }]}>{text}</Text>
    </View>
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
  rulesCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  rulesTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ruleText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
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
});

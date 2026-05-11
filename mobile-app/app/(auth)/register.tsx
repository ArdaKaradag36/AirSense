import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { deviceService } from "../../services/deviceService";
import { PASSWORD_MIN_LENGTH, validatePasswordForRegister } from "../../utils/password";

export default function RegisterScreen() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { signUp, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [checkingDevice, setCheckingDevice] = useState(true);
  const [signingUp, setSigningUp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkPendingDevice = async () => {
      const pendingSerial = await deviceService.getPendingDeviceSerial();
      if (cancelled) return;
      if (!pendingSerial) {
        setErrorText("Kayit adimindan once cihazinizi dogrulamaniz gerekiyor.");
        router.replace("/");
        return;
      }
      setCheckingDevice(false);
    };

    if (!signingUp) {
      checkPendingDevice();
    }
    return () => { cancelled = true; };
  }, []);

  const passwordChecks = useMemo(() => validatePasswordForRegister(password), [password]);

  const isDisabled = useMemo(
    () =>
      !fullName ||
      !email ||
      !password ||
      !confirmPassword ||
      !passwordChecks.ok ||
      loading,
    [fullName, email, password, confirmPassword, passwordChecks.ok, loading]
  );

  const handleRegister = async () => {
    setErrorText("");
    if (!passwordChecks.ok) {
      setErrorText("Lutfen asagidaki sifre kurallarinin tumunu saglayin.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorText("Sifreler eslesmiyor.");
      return;
    }

    try {
      setSigningUp(true);
      console.log("[RegisterScreen] signUp cagiriliyor...");
      await signUp(email.trim(), password, fullName.trim());
      console.log("[RegisterScreen] signUp BASARILI — tabs'a yonlendirilmeli");
    } catch (error: unknown) {
      setSigningUp(false);
      const message = error instanceof Error ? error.message : "Kayit sirasinda bir hata olustu.";
      console.error("[RegisterScreen] signUp HATA:", message, error);
      setErrorText(message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.brand, { color: theme.text }]}>AirSense Pro</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>Yeni hesap olustur ve dashboard&apos;a baglan</Text>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: isDarkMode ? "#262626" : "#F4F6F8", color: theme.text, borderColor: theme.border },
          ]}
          placeholder="Ad Soyad"
          placeholderTextColor={theme.subText}
          value={fullName}
          autoCapitalize="words"
          onChangeText={setFullName}
        />

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
        <TextInput
          style={[
            styles.input,
            { backgroundColor: isDarkMode ? "#262626" : "#F4F6F8", color: theme.text, borderColor: theme.border },
          ]}
          placeholder="Sifre"
          placeholderTextColor={theme.subText}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={[styles.rulesCard, { backgroundColor: isDarkMode ? "#1A1A1A" : "#F0F4F8", borderColor: theme.border }]}>
          <Text style={[styles.rulesTitle, { color: theme.text }]}>Sifre gereksinimleri</Text>
          <RuleRow met={passwordChecks.hasMinLength} theme={theme} text={`En az ${PASSWORD_MIN_LENGTH} karakter`} />
          <RuleRow met={passwordChecks.hasUpper} theme={theme} text="En az bir buyuk harf (A-Z)" />
          <RuleRow met={passwordChecks.hasLower} theme={theme} text="En az bir kucuk harf (a-z)" />
          <RuleRow met={passwordChecks.hasDigit} theme={theme} text="En az bir rakam (0-9)" />
          <RuleRow
            met={passwordChecks.hasSpecial}
            theme={theme}
            text='En az bir ozel karakter (! @ # $ % & * vb.)'
          />
        </View>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: isDarkMode ? "#262626" : "#F4F6F8", color: theme.text, borderColor: theme.border },
          ]}
          placeholder="Sifre (Tekrar)"
          placeholderTextColor={theme.subText}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

        {checkingDevice ? (
          <View style={styles.checkingRow}>
            <ActivityIndicator size="small" color="#00C853" />
            <Text style={[styles.checkingText, { color: theme.subText }]}>Cihaz dogrulamasi kontrol ediliyor...</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleRegister}
          disabled={isDisabled || checkingDevice}
          style={[styles.primaryButton, { opacity: isDisabled ? 0.6 : 1 }]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Kayit olusturuluyor...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Kayit Ol</Text>
          )}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: theme.subText }]}>Hesabin var mi?</Text>
          <Link href="/(auth)/login" style={styles.linkText}>
            Giris Yap
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function RuleRow({ met, theme, text }: { met: boolean; theme: { text: string; subText: string }; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons name={met ? "checkmark-circle" : "ellipse-outline"} size={18} color={met ? "#00C853" : theme.subText} />
      <Text style={[styles.ruleText, { color: met ? theme.text : theme.subText }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
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
  brand: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#00C853",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  error: {
    color: "#D32F2F",
    fontSize: 13,
    marginBottom: 8,
  },
  footerRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 13,
  },
  checkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  checkingText: {
    fontSize: 12.5,
  },
  linkText: {
    color: "#00C853",
    fontSize: 13,
    fontWeight: "700",
  },
  rulesCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ruleText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
});

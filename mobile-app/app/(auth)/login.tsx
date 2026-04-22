import React, { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState("");

  const isDisabled = useMemo(() => !email || !password || loading, [email, password, loading]);

  const handleSignIn = async () => {
    setErrorText("");
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (error: any) {
      setErrorText(error?.message ?? "Giris yapilirken bir hata olustu.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.brand, { color: theme.text }]}>AirSense Pro</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>Akilli hava takibi icin guvenli giris</Text>

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

        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

        <Pressable
          onPress={handleSignIn}
          disabled={isDisabled}
          style={[styles.primaryButton, { opacity: isDisabled ? 0.6 : 1 }]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Giris yapiliyor...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Giris Yap</Text>
          )}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: theme.subText }]}>Hesabin yok mu?</Text>
          <Link href="/(auth)/register" style={styles.linkText}>
            Kayit Ol
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  linkText: {
    color: "#00C853",
    fontSize: 13,
    fontWeight: "700",
  },
});

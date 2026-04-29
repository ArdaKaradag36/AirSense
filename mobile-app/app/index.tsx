import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { deviceService } from "../services/deviceService";

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const [serialNumber, setSerialNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const disabled = useMemo(() => loading || !serialNumber.trim(), [loading, serialNumber]);

  const handleVerifyDevice = async () => {
    setErrorText("");
    setLoading(true);
    try {
      const normalized = serialNumber.trim().toUpperCase();
      const isValidUnclaimed = await deviceService.verifyUnclaimedDevice(normalized);

      if (!isValidUnclaimed) {
        setErrorText("Cihaz dogrulanamadi. Seri numarasi hatali veya cihaz zaten eslestirilmis.");
        return;
      }

      // Kayit adimina gecene kadar seri numarasini gecici hafizada tutuyoruz.
      await deviceService.savePendingDeviceSerial(normalized);
      router.push("/(auth)/register");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Cihaz dogrulanirken bir hata olustu.";
      setErrorText(message);
    } finally {
      setLoading(false);
    }
  };

  const handleQrPress = () => {
    Alert.alert("QR Okut", "QR okutma adimi sonraki iterasyonda kamera entegrasyonu ile aktif edilecek.");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.brand, { color: theme.text }]}>AirSense Pro</Text>
        <Text style={[styles.title, { color: theme.text }]}>AirSense Pro&apos;ya Hos Geldiniz</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>Devam etmek icin cihazinizi eslestirin</Text>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: isDarkMode ? "#262626" : "#F4F6F8", color: theme.text, borderColor: theme.border },
          ]}
          placeholder="Seri Numarasi"
          placeholderTextColor={theme.subText}
          value={serialNumber}
          autoCapitalize="characters"
          onChangeText={setSerialNumber}
        />

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <Pressable
          onPress={handleVerifyDevice}
          disabled={disabled}
          style={[styles.primaryButton, { opacity: disabled ? 0.6 : 1 }]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Dogrulaniyor...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Dogrula ve Ilerle</Text>
          )}
        </Pressable>

        <Pressable onPress={handleQrPress} style={[styles.qrButton, { borderColor: theme.border }]}>
          <Ionicons name="qr-code-outline" size={18} color={theme.text} />
          <Text style={[styles.qrText, { color: theme.text }]}>QR Okut</Text>
        </Pressable>

        <View style={styles.bottomRow}>
          <Text style={[styles.bottomHint, { color: theme.subText }]}>Zaten bir hesabin ve cihazin var mi?</Text>
          <Link href="/(auth)/login" style={styles.bottomLink}>
            Giris Yap
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
    paddingHorizontal: 22,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
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
  title: {
    fontSize: 21,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 14,
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
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: "#00C853",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qrButton: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 11,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  qrText: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 13,
    marginBottom: 8,
  },
  bottomRow: {
    marginTop: 16,
    alignItems: "center",
    gap: 4,
  },
  bottomHint: {
    fontSize: 13,
  },
  bottomLink: {
    color: "#00C853",
    fontSize: 14,
    fontWeight: "700",
  },
});

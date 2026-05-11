import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "../services/authService";
import { deviceService } from "../services/deviceService";
import { safeStorage, supabase } from "../services/supabaseClient";

interface AuthContextType {
  loading: boolean;
  initializing: boolean;
  user: User | null;
  session: Session | null;
  /**
   * Sifre kurtarma deep link'i ile uygulama acilinca true olur.
   * Root layout bu flag aktifken navigator'i auth stack'inde tutar ve
   * reset-password ekranina yonlendirir. Sifre guncellendikten sonra
   * `clearRecoveryMode` ile kapatilmalidir.
   */
  recoveryMode: boolean;
  clearRecoveryMode: () => void;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  /** Basarili giris sonrasi user (yönlendirme icin id gerekir) */
  signIn: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const bootstrap = async () => {
      try {
        const currentSession = await authService.getCurrentSession();
        console.log("[AuthContext] bootstrap: session=", currentSession?.user?.id ?? "yok");
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error("[AuthContext] bootstrap hatasi:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    bootstrap();

    try {
      const subscription = authService.onAuthStateChange((nextSession, event) => {
        console.log("[AuthContext] onAuthStateChange: event=", event, "user=", nextSession?.user?.id ?? "null");
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (event === "PASSWORD_RECOVERY") {
          console.log("[AuthContext] PASSWORD_RECOVERY event yakalandi. recoveryMode=true");
          setRecoveryMode(true);
        }
        setLoading(false);
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch (error) {
      console.warn("[AuthContext] Auth listener devre disi:", error);
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      loading,
      initializing,
      user,
      session,
      recoveryMode,
      clearRecoveryMode: () => setRecoveryMode(false),
      signUp: async (email, password, fullName) => {
        setLoading(true);
        try {
          console.log("[AuthContext] signUp: basladi, email=", email);
          const result = await authService.signUp(email, password, fullName);
          console.log("[AuthContext] signUp: kullanici olusturuldu, id=", result.user?.id, "| session=", result.session ? "var" : "yok (email onayi gerekebilir)");

          if (!result.user?.id) {
            throw new Error("Kullanici ID alinamadigi icin cihaz zimmetleme yapilamadi.");
          }

          if (!result.session) {
            console.warn("[AuthContext] signUp: session null — email onay bekliyor olabilir. signIn ile devam ediliyor...");
            try {
              const signInResult = await authService.signIn(email, password);
              console.log("[AuthContext] signUp: otomatik signIn basarili, session=", signInResult.session ? "var" : "yok");
              if (signInResult.session) {
                result.session = signInResult.session;
              }
            } catch (signInErr) {
              console.warn("[AuthContext] signUp: otomatik signIn basarisiz (email onayi gerekebilir):", signInErr);
            }
          }

          // public.users tablosuna kayit ekle (trigger yoksa fallback)
          try {
            const { error: profileError } = await supabase
              .from("users")
              .upsert({
                id: result.user.id,
                username: fullName.trim() || email.split("@")[0],
                email,
                created_at: new Date().toISOString(),
              }, { onConflict: "id" });
            if (profileError) {
              console.warn("[AuthContext] signUp: public.users upsert hatasi (trigger handle edebilir):", profileError.message);
            } else {
              console.log("[AuthContext] signUp: public.users profili olusturuldu");
            }
          } catch (profileErr) {
            console.warn("[AuthContext] signUp: public.users upsert exception:", profileErr);
          }

          const pendingSerial = await deviceService.getPendingDeviceSerial();
          console.log("[AuthContext] signUp: pendingSerial=", pendingSerial);

          if (!pendingSerial) {
            throw new Error("Kayit icin once cihaz dogrulamasi yapmaniz gerekiyor.");
          }

          await deviceService.claimDevice(pendingSerial, result.user.id);
          console.log("[AuthContext] Cihaz Zimmetlendi:", pendingSerial, "->", result.user.id);

          setSession(result.session);
          setUser(result.user);

          await deviceService.clearPendingDeviceSerial();
          console.log("[AuthContext] signUp: cihaz zimmetlendi ve pending serial temizlendi");
        } finally {
          setLoading(false);
        }
      },
      signIn: async (email, password) => {
        setLoading(true);
        try {
          console.log("[AuthContext] signIn: basladi, email=", email);
          const result = await authService.signIn(email, password);
          console.log("[AuthContext] signIn: basarili, id=", result.user?.id);
          setSession(result.session);
          setUser(result.user);
          return result.user ?? null;
        } finally {
          setLoading(false);
        }
      },
      signOut: async () => {
        setLoading(true);
        try {
          console.log("[AuthContext] Logout Basladi");
          // Logout'un UI tarafini aninda kapat: kullanici tabs'ta kilitli kalmasin.
          setSession(null);
          setUser(null);
          setRecoveryMode(false);

          const cleanupResults = await Promise.allSettled([
            supabase.auth.signOut(),
            AsyncStorage.clear(),
            safeStorage.clearAll(),
            deviceService.clearPendingDeviceSerial(),
          ]);

          const [signOutResult] = cleanupResults;
          if (signOutResult.status === "fulfilled" && signOutResult.value.error) {
            console.error("[AuthContext] supabase signOut hatasi:", signOutResult.value.error.message);
          } else if (signOutResult.status === "rejected") {
            console.error("[AuthContext] supabase signOut rejected:", signOutResult.reason);
          }

          console.log("[AuthContext] Storage Temizlendi");
          console.log("[AuthContext] Logout Tamamlandi: session/user sifirlandi");
        } finally {
          setLoading(false);
        }
      },
    }),
    [loading, initializing, session, user, recoveryMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

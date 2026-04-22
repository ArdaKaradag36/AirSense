import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { authService } from "../services/authService";
import { deviceService } from "../services/deviceService";

interface AuthContextType {
  loading: boolean;
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const bootstrap = async () => {
      try {
        /**
         * Uygulama ilk acildiginda kalici oturumu kontrol ediyoruz.
         * Bu adim sayesinde kullanici her acilista tekrar login olmak zorunda kalmaz.
         */
        const currentSession = await authService.getCurrentSession();
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error("Auth bootstrap hatasi:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    bootstrap();

    /**
     * Gercek zamanli auth dinleyicisi:
     * Login/logout/session refresh olaylarinda state'i merkezi olarak gunceller.
     */
    try {
      const subscription = authService.onAuthStateChange((nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch (error) {
      // Supabase env henuz tanimli degilse dinleyici kurulmaz; uygulama auth'suz fallback akista acilmaya devam eder.
      console.warn("Auth listener devre disi:", error);
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      loading,
      user,
      session,
      signUp: async (email, password) => {
        setLoading(true);
        try {
          const result = await authService.signUp(email, password);

          /**
           * Device-first onboarding:
           * Kayit basarili olduktan hemen sonra, gecici hafizadaki seri numarasini kullanarak
           * cihazi yeni olusan kullaniciya zimmetliyoruz.
           */
          const pendingSerial = await deviceService.getPendingDeviceSerial();
          if (!pendingSerial) {
            throw new Error("Kayit icin once cihaz dogrulamasi yapmaniz gerekiyor.");
          }
          await deviceService.claimDevice(pendingSerial);
          await deviceService.clearPendingDeviceSerial();

          setSession(result.session);
          setUser(result.user);
        } finally {
          setLoading(false);
        }
      },
      signIn: async (email, password) => {
        setLoading(true);
        try {
          const result = await authService.signIn(email, password);
          setSession(result.session);
          setUser(result.user);
        } finally {
          setLoading(false);
        }
      },
      signOut: async () => {
        setLoading(true);
        try {
          await authService.signOut();
          setSession(null);
          setUser(null);
        } finally {
          setLoading(false);
        }
      },
    }),
    [loading, session, user]
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

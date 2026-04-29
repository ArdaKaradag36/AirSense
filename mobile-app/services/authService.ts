import { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

/**
 * Auth servis katmani yalnizca Supabase cagrilarini merkezde toplar.
 * UI ve Context katmani Supabase SDK detaylarini bilmez; sadece bu fonksiyonlari kullanir.
 */
export const authService = {
  ensureConfig() {
    if (!isSupabaseConfigured) {
      throw new Error(
        "Supabase ayarlari eksik. `mobile-app/.env` dosyasina gecerli EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY degerlerini ekleyin."
      );
    }
  },

  async signUp(email: string, password: string, fullName?: string): Promise<{ user: User | null; session: Session | null }> {
    this.ensureConfig();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName?.trim() || "",
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {
    this.ensureConfig();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut(): Promise<void> {
    this.ensureConfig();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    this.ensureConfig();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user ?? null;
  },

  async getCurrentSession(): Promise<Session | null> {
    this.ensureConfig();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session ?? null;
  },

  onAuthStateChange(callback: (session: Session | null, event: AuthChangeEvent) => void) {
    this.ensureConfig();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      callback(session, event);
    });

    return subscription;
  },

  /**
   * Sifre sifirlama emaili gonder. `redirectTo` URL'i Supabase Dashboard
   * Auth -> URL Configuration -> Redirect URLs listesinde de tanimli olmali.
   */
  async sendPasswordResetEmail(email: string, redirectTo: string): Promise<void> {
    this.ensureConfig();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  },

  /**
   * Aktif (recovery) oturumun sahibi icin yeni parolayi yazar.
   */
  async updatePassword(newPassword: string): Promise<void> {
    this.ensureConfig();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  /**
   * Recovery deep link'inde URL fragment'inda gelen access/refresh token
   * ciftini Supabase istemcisine iletir; bu cagri PASSWORD_RECOVERY event'ini
   * tetikler ve `auth.updateUser({ password })` cagrisini mumkun kilar.
   */
  async setRecoverySession(accessToken: string, refreshToken: string): Promise<void> {
    this.ensureConfig();
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  },
};

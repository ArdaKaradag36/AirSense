/**
 * Parola dogrulama yardimcilari.
 * Kayit (register) ve sifre sifirlama (reset-password) ekranlari ortak
 * kurallari kullanmasi icin tek kaynak burasidir.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export interface PasswordChecks {
  ok: boolean;
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
}

export function validatePasswordForRegister(password: string): PasswordChecks {
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = PASSWORD_SPECIAL_RE.test(password);
  const ok = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;
  return { ok, hasMinLength, hasUpper, hasLower, hasDigit, hasSpecial };
}

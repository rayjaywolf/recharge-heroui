import { isPlaceholderEmail, PHONE_PLACEHOLDER_EMAIL_SUFFIX } from "./phone";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lowercase trimmed email, or empty string when absent. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  if (!EMAIL_PATTERN.test(email)) return false;
  if (isPlaceholderEmail(email)) return false;
  if (email.endsWith(PHONE_PLACEHOLDER_EMAIL_SUFFIX)) return false;
  return true;
}

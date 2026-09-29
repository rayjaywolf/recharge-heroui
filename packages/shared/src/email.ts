const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISALLOWED_EMAIL_SUFFIXES = [
  "@phone.neocharge.local",
  "@phone.rechargepro.local",
];

/** Lowercase trimmed email, or empty string when absent. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  if (!EMAIL_PATTERN.test(email)) return false;
  if (DISALLOWED_EMAIL_SUFFIXES.some((suffix) => email.endsWith(suffix))) {
    return false;
  }
  return true;
}

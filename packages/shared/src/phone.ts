/** Normalize Indian mobile numbers to 10 digits (no country code). */
export function normalizePhoneNumber(phone: string): string {
  let cleanPhone = phone.replace(/\D/g, "");

  if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) {
    cleanPhone = cleanPhone.substring(2);
  }

  // Common in India: 0 + 10-digit mobile
  if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
    cleanPhone = cleanPhone.substring(1);
  }

  return cleanPhone;
}

export function validatePhoneNumber(phone: string): boolean {
  const cleanPhone = normalizePhoneNumber(phone);

  if (cleanPhone.length === 10) {
    return /^[6-9]\d{9}$/.test(cleanPhone);
  }

  return false;
}

/** Suffix for synthetic emails stored for phone-only sign-up (Better Auth requires an email). */
export const PHONE_PLACEHOLDER_EMAIL_SUFFIX = "@phone.rechargepro.local";

/** Internal placeholder when the user signs up without an email. */
export function phoneToPlaceholderEmail(phone: string): string {
  return `${normalizePhoneNumber(phone)}${PHONE_PLACEHOLDER_EMAIL_SUFFIX}`;
}

export function isPlaceholderEmail(email: string): boolean {
  return email.endsWith(PHONE_PLACEHOLDER_EMAIL_SUFFIX);
}

type UserContactFields = {
  email: string;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
};

/** Phone to show in UI (never the synthetic email). */
export function getDisplayPhone(user: UserContactFields): string | null {
  if (user.phoneNumber) return user.phoneNumber;
  if (user.whatsappNumber) return user.whatsappNumber;
  if (isPlaceholderEmail(user.email)) {
    const extracted = user.email.slice(0, -PHONE_PLACEHOLDER_EMAIL_SUFFIX.length);
    return validatePhoneNumber(extracted) ? extracted : null;
  }
  return null;
}

/** Real email for UI, or null when the account is phone-only. */
export function getDisplayEmail(email: string): string | null {
  return isPlaceholderEmail(email) ? null : email;
}

/** Single-line contact for tables and dropdowns. */
export function formatUserContactLine(user: UserContactFields): string {
  const phone = getDisplayPhone(user);
  const email = getDisplayEmail(user.email);
  if (phone && email) return `${phone} · ${email}`;
  return phone ?? email ?? "—";
}

/** True when the user is signing in with an email (legacy accounts). */
export function isEmailLoginIdentifier(value: string): boolean {
  return value.trim().includes("@");
}

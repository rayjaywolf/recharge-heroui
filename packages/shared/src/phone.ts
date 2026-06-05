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

type UserContactFields = {
  email?: string | null;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
};

/** Phone to show in UI. */
export function getDisplayPhone(user: UserContactFields): string | null {
  if (user.phoneNumber) return user.phoneNumber;
  if (user.whatsappNumber) return user.whatsappNumber;
  return null;
}

/** Real email for UI, or null when unset. */
export function getDisplayEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim();
  return trimmed ? trimmed : null;
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

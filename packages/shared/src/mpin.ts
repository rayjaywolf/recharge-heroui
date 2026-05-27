/** Four-digit MPIN (0000–9999). */
export function validateMpin(mpin: string): boolean {
  return /^\d{4}$/.test(mpin);
}

export function generateRandomMpin(): string {
  return String(Math.floor(Math.random() * 10_000)).padStart(4, "0");
}

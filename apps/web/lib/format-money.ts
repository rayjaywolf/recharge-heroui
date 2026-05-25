export const amountClassName = "tabular-nums";

export type FormatInrOptions = {
  fractionDigits?: number;
};

export function formatInr(amount: number, options?: FormatInrOptions): string {
  const { fractionDigits } = options ?? {};
  return `₹${amount.toLocaleString(
    "en-IN",
    fractionDigits !== undefined
      ? {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        }
      : undefined,
  )}`;
}

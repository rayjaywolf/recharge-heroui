/** Non-recharge operators stored on transaction rows. */

export const LEDGER_EXCLUDED_OPERATORS = [
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
] as const;

export const RECHARGE_EXCLUDED_OPERATORS = [
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "FUNDS_SENT",
  "FUNDS_RECEIVED",
] as const;

export const FUND_TRANSFER_OPERATORS = [
  "FUNDS_SENT",
  "FUNDS_RECEIVED",
] as const;

export type AdminTransactionTypeFilter = "RECHARGE" | "FUNDS" | "ALL";

/** Carrier dropdown values shared by ledger and earnings filters. */
export const CARRIER_FILTER_OPTIONS = [
  { id: "ALL", label: "All carriers" },
  { id: "JIO", label: "Jio" },
  { id: "AIRTEL", label: "Airtel" },
  { id: "VI", label: "Vodafone Idea" },
  { id: "BSNL", label: "BSNL" },
] as const;

/** Maps filter keys to transaction.operator values stored in the DB. */
const CARRIER_FILTER_TO_OPERATORS: Record<string, readonly string[]> = {
  JIO: ["Jio"],
  AIRTEL: ["Airtel"],
  VI: ["Vi", "Idea"],
  BSNL: ["BSNL Recharge", "BSNL Topup"],
};

/** Resolves a carrier filter param to exact DB operator names. */
export function resolveCarrierFilterOperators(filter: string): string[] {
  const trimmed = filter.trim();
  if (!trimmed || trimmed.toUpperCase() === "ALL") return [];

  const mapped = CARRIER_FILTER_TO_OPERATORS[trimmed.toUpperCase()];
  if (mapped) return [...mapped];

  return [trimmed];
}

/** @deprecated Use applyTransactionTypeCondition in admin-transactions-query */
export function getExcludedOperatorsForType(
  type: AdminTransactionTypeFilter,
): readonly string[] {
  if (type === "FUNDS") return [...FUND_TRANSFER_OPERATORS];
  return type === "ALL"
    ? [...LEDGER_EXCLUDED_OPERATORS]
    : [...RECHARGE_EXCLUDED_OPERATORS];
}

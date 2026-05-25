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

/** @deprecated Use applyTransactionTypeCondition in admin-transactions-query */
export function getExcludedOperatorsForType(
  type: AdminTransactionTypeFilter,
): readonly string[] {
  if (type === "FUNDS") return [...FUND_TRANSFER_OPERATORS];
  return type === "ALL"
    ? [...LEDGER_EXCLUDED_OPERATORS]
    : [...RECHARGE_EXCLUDED_OPERATORS];
}

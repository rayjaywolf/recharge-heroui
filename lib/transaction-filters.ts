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

export type AdminTransactionTypeFilter = "RECHARGE" | "ALL";

export function getExcludedOperatorsForType(
  type: AdminTransactionTypeFilter
): readonly string[] {
  return type === "ALL"
    ? LEDGER_EXCLUDED_OPERATORS
    : RECHARGE_EXCLUDED_OPERATORS;
}

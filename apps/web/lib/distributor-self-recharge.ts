import type { AdminTransactionRow } from "@/components/admin/transactions-table";

/** Distributor recharging from own wallet (no upline distributor). */
export function isDistributorSelfRecharge(
  tx: Pick<AdminTransactionRow, "userRole" | "rechargerDistributorId">,
): boolean {
  return (
    tx.userRole === "DISTRIBUTOR" &&
    (tx.rechargerDistributorId == null || tx.rechargerDistributorId === "")
  );
}

/** Retailer-margin share shown to distributor (₹ and % of amount). */
export function distributorSelfYourCutInr(tx: AdminTransactionRow): number {
  return isDistributorSelfRecharge(tx) ? tx.retailerCommission : tx.distributorCommission;
}

export function distributorLedgerActorLabel(
  tx: Pick<AdminTransactionRow, "user" | "userRole" | "rechargerDistributorId">,
): string {
  return isDistributorSelfRecharge(tx) ? "You" : tx.user.name;
}

export function distributorSelfYourMarginPercent(
  tx: Pick<AdminTransactionRow, "amount" | "retailerCommission">,
): string | null {
  if (tx.amount <= 0 || tx.retailerCommission <= 0) return null;
  return `${((tx.retailerCommission / tx.amount) * 100).toFixed(2)}%`;
}

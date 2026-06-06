import {
  fetchAdminTransactions,
  type AdminTransactionsSearchParams,
  type TransactionsSort,
} from "@/lib/admin-transactions-query";
import type { AdminTransactionRow } from "@/components/admin/transactions-table";
import { requireRetailer } from "@/lib/retailer-auth";
import type { AdminTransactionTypeFilter } from "@/lib/transaction-filters";

export async function fetchRetailerLedger(
  params: AdminTransactionsSearchParams,
  options?: { paginate?: boolean; exportAll?: boolean },
): Promise<{
  rows: AdminTransactionRow[];
  type: AdminTransactionTypeFilter;
  status: string;
  sort: TransactionsSort;
  totalCount: number;
  page: number;
  pageSize: number;
}> {
  const retailer = await requireRetailer();

  return fetchAdminTransactions(params, {
    defaultType: "ALL",
    userId: retailer.id,
    paginate: options?.paginate,
    exportAll: options?.exportAll,
  });
}

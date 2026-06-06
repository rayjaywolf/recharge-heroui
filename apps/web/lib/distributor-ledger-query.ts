import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, user } from "@repo/db";

import type { AdminTransactionRow } from "@/components/admin/transactions-table";
import { auth } from "@/lib/auth";
import {
  fetchAdminTransactions,
  type AdminTransactionsSearchParams,
  type TransactionsSort,
} from "@/lib/admin-transactions-query";
import type { AdminTransactionTypeFilter } from "@/lib/transaction-filters";

export async function fetchDistributorLedger(
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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const [distributor] = await db
    .select({
      id: user.id,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!distributor || distributor.role !== "DISTRIBUTOR") {
    redirect("/login");
  }

  return fetchAdminTransactions(params, {
    defaultType: "ALL",
    networkDistributorId: distributor.id,
    paginate: options?.paginate,
    exportAll: options?.exportAll,
  });
}

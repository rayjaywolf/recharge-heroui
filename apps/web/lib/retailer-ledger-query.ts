import { eq } from "drizzle-orm";
import { db, transaction, user } from "@repo/db";

import type { AdminTransactionRow } from "@/components/admin/transactions-table";
import {
  buildTransactionWhereClause,
  resolveTransactionTypeFilter,
  resolveTransactionsSort,
  transactionsOrderBy,
  type AdminTransactionsSearchParams,
  type TransactionsSort,
} from "@/lib/admin-transactions-query";
import { requireRetailer } from "@/lib/retailer-auth";
import type { AdminTransactionTypeFilter } from "@/lib/transaction-filters";

export async function fetchRetailerLedger(
  params: AdminTransactionsSearchParams,
): Promise<{
  rows: AdminTransactionRow[];
  type: AdminTransactionTypeFilter;
  status: string;
  sort: TransactionsSort;
}> {
  const retailer = await requireRetailer();

  const type = resolveTransactionTypeFilter(params.type, {
    defaultType: "ALL",
  });
  const status =
    params.status && params.status !== "ALL" ? params.status : "ALL";
  const sort = resolveTransactionsSort(params.sort);
  const whereClause = buildTransactionWhereClause(params, {
    defaultType: "ALL",
    userId: retailer.id,
  });

  const transactions = await db
    .select({
      id: transaction.id,
      userId: transaction.userId,
      targetPhone: transaction.targetPhone,
      operator: transaction.operator,
      amount: transaction.amount,
      circleCode: transaction.circleCode,
      provider: transaction.provider,
      status: transaction.status,
      apiReferenceId: transaction.apiReferenceId,
      apiMessage: transaction.apiMessage,
      idempotencyKey: transaction.idempotencyKey,
      retailerCommission: transaction.retailerCommission,
      distributorCommission: transaction.distributorCommission,
      adminCommission: transaction.adminCommission,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      role: user.role,
      distributorId: user.distributorId,
    })
    .from(transaction)
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(whereClause)
    .orderBy(transactionsOrderBy(sort, { scopedUser: true }))
    .limit(150);

  const rows: AdminTransactionRow[] = transactions.map((tx) => ({
    id: tx.id,
    userId: tx.userId,
    targetPhone: tx.targetPhone,
    operator: tx.operator,
    amount: tx.amount,
    circleCode: tx.circleCode,
    provider: tx.provider,
    status: tx.status,
    apiReferenceId: tx.apiReferenceId,
    apiMessage: tx.apiMessage,
    idempotencyKey: tx.idempotencyKey,
    retailerCommission: tx.retailerCommission,
    distributorCommission: tx.distributorCommission,
    adminCommission: tx.adminCommission,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    user: {
      name: retailer.name,
      email: retailer.email,
      phoneNumber: retailer.phoneNumber,
      whatsappNumber: retailer.whatsappNumber,
    },
    userRole: tx.role,
    rechargerDistributorId: tx.distributorId,
  }));

  return { rows, type, status, sort };
}

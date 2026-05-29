import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, transaction, user } from "@repo/db";

import type { AdminTransactionRow } from "@/components/admin/transactions-table";
import { auth } from "@/lib/auth";
import {
  buildTransactionWhereClause,
  resolveTransactionTypeFilter,
  resolveTransactionsSort,
  transactionsOrderBy,
  type AdminTransactionsSearchParams,
  type TransactionsSort,
} from "@/lib/admin-transactions-query";
import type { AdminTransactionTypeFilter } from "@/lib/transaction-filters";

export async function fetchDistributorLedger(
  params: AdminTransactionsSearchParams,
): Promise<{
  rows: AdminTransactionRow[];
  type: AdminTransactionTypeFilter;
  status: string;
  sort: TransactionsSort;
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

  const type = resolveTransactionTypeFilter(params.type, {
    defaultType: "ALL",
  });
  const status =
    params.status && params.status !== "ALL" ? params.status : "ALL";
  const sort = resolveTransactionsSort(params.sort);
  const whereClause = buildTransactionWhereClause(params, {
    defaultType: "ALL",
    networkDistributorId: distributor.id,
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
      userName: user.name,
      userEmail: user.email,
      userPhoneNumber: user.phoneNumber,
      userWhatsappNumber: user.whatsappNumber,
      userRole: user.role,
      rechargerDistributorId: user.distributorId,
    })
    .from(transaction)
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(whereClause)
    .orderBy(transactionsOrderBy(sort, { scopedUser: false }))
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
      name: tx.userName,
      email: tx.userEmail,
      phoneNumber: tx.userPhoneNumber,
      whatsappNumber: tx.userWhatsappNumber,
    },
    userRole: tx.userRole,
    rechargerDistributorId: tx.rechargerDistributorId,
  }));

  return { rows, type, status, sort };
}

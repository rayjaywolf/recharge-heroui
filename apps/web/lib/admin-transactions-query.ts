import {
  and,
  desc,
  eq,
  gte,
  ilike,
  lte,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";
import { db, transaction, user, type TxStatus } from "@repo/db";
import {
  getExcludedOperatorsForType,
  type AdminTransactionTypeFilter,
} from "@/lib/transaction-filters";

import type { AdminTransactionRow } from "@/components/admin/transactions-table";

export type AdminTransactionsSearchParams = {
  status?: string;
  operator?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
};

export type FetchAdminTransactionsOptions = {
  defaultType?: AdminTransactionTypeFilter;
  lockedType?: AdminTransactionTypeFilter;
  lockedStatus?: string;
};

export function resolveTransactionTypeFilter(
  typeParam: string | undefined,
  options?: FetchAdminTransactionsOptions,
): AdminTransactionTypeFilter {
  if (options?.lockedType) return options.lockedType;
  return typeParam === "ALL" ? "ALL" : (options?.defaultType ?? "RECHARGE");
}

export function buildTransactionWhereClause(
  params: AdminTransactionsSearchParams,
  options?: FetchAdminTransactionsOptions,
): SQL | undefined {
  const type = resolveTransactionTypeFilter(params.type, options);
  const status =
    options?.lockedStatus ??
    (params.status && params.status !== "ALL" ? params.status : undefined);

  const conditions: SQL[] = [
    notInArray(transaction.operator, [
      ...getExcludedOperatorsForType(type),
    ]),
  ];

  if (status) {
    conditions.push(
      eq(transaction.status, status as TxStatus),
    );
  }

  if (params.operator && params.operator !== "ALL") {
    conditions.push(eq(transaction.operator, params.operator));
  }

  const search = params.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(transaction.targetPhone, pattern),
        ilike(transaction.apiReferenceId, pattern),
        ilike(transaction.id, pattern),
        ilike(user.name, pattern),
        ilike(user.email, pattern),
      )!,
    );
  }

  if (params.dateFrom) {
    conditions.push(gte(transaction.createdAt, new Date(params.dateFrom)));
  }

  if (params.dateTo) {
    const endsAt = new Date(params.dateTo);
    endsAt.setDate(endsAt.getDate() + 1);
    conditions.push(lte(transaction.createdAt, endsAt));
  }

  return and(...conditions);
}

export async function fetchAdminTransactions(
  params: AdminTransactionsSearchParams,
  options?: FetchAdminTransactionsOptions,
): Promise<{
  rows: AdminTransactionRow[];
  type: AdminTransactionTypeFilter;
  status: string;
}> {
  const type = resolveTransactionTypeFilter(params.type, options);
  const status =
    options?.lockedStatus ?? (params.status && params.status !== "ALL" ? params.status : "ALL");

  const whereClause = buildTransactionWhereClause(params, options);

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
    })
    .from(transaction)
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(whereClause)
    .orderBy(desc(transaction.createdAt))
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
  }));

  return { rows, type, status };
}

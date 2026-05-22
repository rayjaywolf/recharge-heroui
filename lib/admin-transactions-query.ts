import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/auth";
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
  /** Applied when search param `type` is absent. */
  defaultType?: AdminTransactionTypeFilter;
  /** Forces recharge vs all ledger; ignores URL `type`. */
  lockedType?: AdminTransactionTypeFilter;
  /** Forces status filter; ignores URL `status`. */
  lockedStatus?: string;
};

export function resolveTransactionTypeFilter(
  typeParam: string | undefined,
  options?: FetchAdminTransactionsOptions
): AdminTransactionTypeFilter {
  if (options?.lockedType) return options.lockedType;
  return typeParam === "ALL" ? "ALL" : (options?.defaultType ?? "RECHARGE");
}

export function buildTransactionWhereClause(
  params: AdminTransactionsSearchParams,
  options?: FetchAdminTransactionsOptions
): Prisma.TransactionWhereInput {
  const type = resolveTransactionTypeFilter(params.type, options);
  const status =
    options?.lockedStatus ??
    (params.status && params.status !== "ALL" ? params.status : undefined);

  const whereClause: Prisma.TransactionWhereInput = {
    operator: { notIn: [...getExcludedOperatorsForType(type)] },
  };

  if (status) {
    whereClause.status = status as Prisma.EnumTxStatusFilter;
  }

  if (params.operator && params.operator !== "ALL") {
    whereClause.operator = params.operator;
  }

  if (params.search?.trim()) {
    whereClause.OR = [
      { targetPhone: { contains: params.search.trim(), mode: "insensitive" } },
      { apiReferenceId: { contains: params.search.trim(), mode: "insensitive" } },
      { id: { contains: params.search.trim(), mode: "insensitive" } },
      { user: { name: { contains: params.search.trim(), mode: "insensitive" } } },
      { user: { email: { contains: params.search.trim(), mode: "insensitive" } } },
    ];
  }

  if (params.dateFrom || params.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (params.dateFrom) {
      createdAt.gte = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      const endsAt = new Date(params.dateTo);
      endsAt.setDate(endsAt.getDate() + 1);
      createdAt.lte = endsAt;
    }
    whereClause.createdAt = createdAt;
  }

  return whereClause;
}

export async function fetchAdminTransactions(
  params: AdminTransactionsSearchParams,
  options?: FetchAdminTransactionsOptions
): Promise<{
  rows: AdminTransactionRow[];
  type: AdminTransactionTypeFilter;
  status: string;
}> {
  const type = resolveTransactionTypeFilter(params.type, options);
  const status =
    options?.lockedStatus ?? (params.status && params.status !== "ALL" ? params.status : "ALL");

  const transactions = await prisma.transaction.findMany({
    where: buildTransactionWhereClause(params, options),
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phoneNumber: true,
          whatsappNumber: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

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
    user: tx.user,
  }));

  return { rows, type, status };
}

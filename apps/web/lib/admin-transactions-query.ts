import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";
import { db, transaction, user, type TxStatus } from "@repo/db";
import {
  FUND_TRANSFER_OPERATORS,
  LEDGER_EXCLUDED_OPERATORS,
  RECHARGE_EXCLUDED_OPERATORS,
  resolveCarrierFilterOperators,
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
  sort?: string;
};

export type TransactionsSort =
  | "date_desc"
  | "date_asc"
  | "amount_desc"
  | "amount_asc"
  | "retailer_asc"
  | "operator_asc";

const DEFAULT_SORT: TransactionsSort = "date_desc";

export type FetchAdminTransactionsOptions = {
  defaultType?: AdminTransactionTypeFilter;
  lockedType?: AdminTransactionTypeFilter;
  lockedStatus?: string;
  /** When set, limits rows to this user and search skips retailer name/email. */
  userId?: string;
  /** Distributor's own transactions plus all retailers under this distributor. */
  networkDistributorId?: string;
};

export function resolveTransactionTypeFilter(
  typeParam: string | undefined,
  options?: FetchAdminTransactionsOptions,
): AdminTransactionTypeFilter {
  if (options?.lockedType) return options.lockedType;
  if (typeParam === "FUNDS" || typeParam === "ALL") return typeParam;
  return options?.defaultType ?? "RECHARGE";
}

export function resolveTransactionsSort(
  sortParam: string | undefined,
): TransactionsSort {
  const allowed: TransactionsSort[] = [
    "date_desc",
    "date_asc",
    "amount_desc",
    "amount_asc",
    "retailer_asc",
    "operator_asc",
  ];
  if (sortParam && allowed.includes(sortParam as TransactionsSort)) {
    return sortParam as TransactionsSort;
  }
  return DEFAULT_SORT;
}

export function transactionsOrderBy(
  sort: TransactionsSort,
  options?: { scopedUser?: boolean },
) {
  switch (sort) {
    case "date_asc":
      return asc(transaction.createdAt);
    case "amount_desc":
      return desc(transaction.amount);
    case "amount_asc":
      return asc(transaction.amount);
    case "retailer_asc":
      return options?.scopedUser
        ? asc(transaction.operator)
        : asc(user.name);
    case "operator_asc":
      return asc(transaction.operator);
    case "date_desc":
    default:
      return desc(transaction.createdAt);
  }
}

function applyTransactionTypeCondition(
  conditions: SQL[],
  type: AdminTransactionTypeFilter,
) {
  if (type === "FUNDS") {
    conditions.push(
      inArray(transaction.operator, [...FUND_TRANSFER_OPERATORS]),
    );
  } else if (type === "RECHARGE") {
    conditions.push(
      notInArray(transaction.operator, [...RECHARGE_EXCLUDED_OPERATORS]),
    );
  } else {
    conditions.push(
      notInArray(transaction.operator, [...LEDGER_EXCLUDED_OPERATORS]),
    );
  }
}

export function buildTransactionWhereClause(
  params: AdminTransactionsSearchParams,
  options?: FetchAdminTransactionsOptions,
): SQL | undefined {
  const type = resolveTransactionTypeFilter(params.type, options);
  const status =
    options?.lockedStatus ??
    (params.status && params.status !== "ALL" ? params.status : undefined);

  const conditions: SQL[] = [];

  if (options?.userId) {
    conditions.push(eq(transaction.userId, options.userId));
  } else if (options?.networkDistributorId) {
    conditions.push(
      or(
        eq(transaction.userId, options.networkDistributorId),
        eq(user.distributorId, options.networkDistributorId),
      )!,
    );
  }

  const singleUserScope = Boolean(options?.userId);
  const skipTypeFilter =
    (singleUserScope || options?.networkDistributorId) && type === "ALL";
  if (!skipTypeFilter) {
    applyTransactionTypeCondition(conditions, type);
  }

  if (status) {
    conditions.push(eq(transaction.status, status as TxStatus));
  }

  const carrierOperators = resolveCarrierFilterOperators(params.operator ?? "");
  if (carrierOperators.length === 1) {
    conditions.push(eq(transaction.operator, carrierOperators[0]!));
  } else if (carrierOperators.length > 1) {
    conditions.push(inArray(transaction.operator, carrierOperators));
  }

  const search = params.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      singleUserScope
        ? or(
            ilike(transaction.targetPhone, pattern),
            ilike(transaction.apiReferenceId, pattern),
            ilike(transaction.id, pattern),
            ilike(transaction.apiMessage, pattern),
          )!
        : or(
            ilike(transaction.targetPhone, pattern),
            ilike(transaction.apiReferenceId, pattern),
            ilike(transaction.id, pattern),
            ilike(transaction.apiMessage, pattern),
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
  sort: TransactionsSort;
}> {
  const type = resolveTransactionTypeFilter(params.type, options);
  const status =
    options?.lockedStatus ?? (params.status && params.status !== "ALL" ? params.status : "ALL");
  const sort = resolveTransactionsSort(params.sort);
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
      userRole: user.role,
      rechargerDistributorId: user.distributorId,
    })
    .from(transaction)
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(whereClause)
    .orderBy(
      transactionsOrderBy(sort, {
        scopedUser: Boolean(options?.userId),
      }),
    )
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

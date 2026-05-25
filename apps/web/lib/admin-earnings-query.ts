import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import { db, transaction, user, type TxStatus } from "@repo/db";

import type { AdminEarningRow } from "@/components/admin/earnings-download-button";

export type AdminEarningsSearchParams = {
  status?: string;
  operator?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
};

export type EarningsSort =
  | "date_desc"
  | "date_asc"
  | "commission_desc"
  | "commission_asc"
  | "amount_desc"
  | "amount_asc"
  | "retailer_asc"
  | "operator_asc";

const DEFAULT_SORT: EarningsSort = "date_desc";

export function resolveEarningsSort(sortParam: string | undefined): EarningsSort {
  const allowed: EarningsSort[] = [
    "date_desc",
    "date_asc",
    "commission_desc",
    "commission_asc",
    "amount_desc",
    "amount_asc",
    "retailer_asc",
    "operator_asc",
  ];
  if (sortParam && allowed.includes(sortParam as EarningsSort)) {
    return sortParam as EarningsSort;
  }
  return DEFAULT_SORT;
}

function earningsOrderBy(sort: EarningsSort) {
  switch (sort) {
    case "date_asc":
      return asc(transaction.createdAt);
    case "commission_desc":
      return desc(transaction.adminCommission);
    case "commission_asc":
      return asc(transaction.adminCommission);
    case "amount_desc":
      return desc(transaction.amount);
    case "amount_asc":
      return asc(transaction.amount);
    case "retailer_asc":
      return asc(user.name);
    case "operator_asc":
      return asc(transaction.operator);
    case "date_desc":
    default:
      return desc(transaction.createdAt);
  }
}

export function buildEarningsWhereClause(
  params: AdminEarningsSearchParams,
): SQL | undefined {
  const conditions: SQL[] = [gt(transaction.adminCommission, 0)];

  if (params.status && params.status !== "ALL") {
    conditions.push(eq(transaction.status, params.status as TxStatus));
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
        ilike(transaction.id, pattern),
        ilike(transaction.operator, pattern),
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

export async function fetchAdminEarnings(
  params: AdminEarningsSearchParams,
): Promise<{
  rows: AdminEarningRow[];
  status: string;
  sort: EarningsSort;
}> {
  const status =
    params.status && params.status !== "ALL" ? params.status : "ALL";
  const sort = resolveEarningsSort(params.sort);
  const whereClause = buildEarningsWhereClause(params);

  const transactions = await db
    .select({
      id: transaction.id,
      createdAt: transaction.createdAt,
      amount: transaction.amount,
      status: transaction.status,
      operator: transaction.operator,
      adminCommission: transaction.adminCommission,
      userName: user.name,
      userEmail: user.email,
    })
    .from(transaction)
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(whereClause)
    .orderBy(earningsOrderBy(sort))
    .limit(150);

  const rows: AdminEarningRow[] = transactions.map((tx) => ({
    id: tx.id,
    createdAt: tx.createdAt.toISOString(),
    amount: tx.amount,
    status: tx.status,
    operator: tx.operator,
    adminCommission: tx.adminCommission,
    user: { name: tx.userName, email: tx.userEmail },
  }));

  return { rows, status, sort };
}

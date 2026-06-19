import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, transaction, user, type TxStatus } from "@repo/db";

import type { EarningRow } from "@/components/admin/earnings-download-button";
import { transactionAmountSearchCondition } from "@/lib/admin-transactions-query";
import {
  clampPage,
  EXPORT_MAX_ROWS,
  parsePageParam,
  TABLE_PAGE_SIZE,
} from "@/lib/table-pagination";
import { resolveCarrierFilterOperators } from "@/lib/transaction-filters";

export type AdminEarningsSearchParams = {
  status?: string;
  operator?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  page?: string;
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

export type EarningsScope = "admin" | "distributor";

export type FetchEarningsOptions = {
  distributorId?: string;
  paginate?: boolean;
  exportAll?: boolean;
};

function earningsOrderBy(sort: EarningsSort, scope: EarningsScope) {
  const commission =
    scope === "distributor"
      ? transaction.distributorCommission
      : transaction.adminCommission;

  switch (sort) {
    case "date_asc":
      return asc(transaction.createdAt);
    case "commission_desc":
      return desc(commission);
    case "commission_asc":
      return asc(commission);
    case "amount_desc":
      return desc(transaction.amount);
    case "amount_asc":
      return asc(transaction.amount);
    case "retailer_asc":
      return asc(sql`COALESCE(${user.storeName}, ${user.name})`);
    case "operator_asc":
      return asc(transaction.operator);
    case "date_desc":
    default:
      return desc(transaction.createdAt);
  }
}

export function buildEarningsWhereClause(
  params: AdminEarningsSearchParams,
  options?: FetchEarningsOptions,
): SQL | undefined {
  const scope: EarningsScope = options?.distributorId ? "distributor" : "admin";

  const conditions: SQL[] = [];

  if (options?.distributorId) {
    // Network: commission from retailers under this distributor.
    // Self: distributor recharges earn the retailer margin on their own account.
    conditions.push(
      or(
        and(
          eq(user.distributorId, options.distributorId),
          gt(transaction.distributorCommission, 0),
        ),
        and(
          eq(transaction.userId, options.distributorId),
          gt(transaction.retailerCommission, 0),
        ),
      )!,
    );
  } else {
    conditions.push(gt(transaction.adminCommission, 0));
  }

  if (params.status && params.status !== "ALL") {
    conditions.push(eq(transaction.status, params.status as TxStatus));
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
      or(
        ilike(transaction.targetPhone, pattern),
        ilike(transaction.id, pattern),
        ilike(transaction.operator, pattern),
        transactionAmountSearchCondition(search),
        ilike(user.name, pattern),
        ilike(user.storeName, pattern),
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

export async function fetchEarnings(
  params: AdminEarningsSearchParams,
  options?: FetchEarningsOptions,
): Promise<{
  rows: EarningRow[];
  status: string;
  sort: EarningsSort;
  scope: EarningsScope;
  totalCount: number;
  page: number;
  pageSize: number;
}> {
  const scope: EarningsScope = options?.distributorId ? "distributor" : "admin";
  const status =
    params.status && params.status !== "ALL" ? params.status : "ALL";
  const sort = resolveEarningsSort(params.sort);
  const whereClause = buildEarningsWhereClause(params, options);
  const paginate = options?.paginate ?? false;
  const exportAll = options?.exportAll ?? false;
  const pageSize = TABLE_PAGE_SIZE;
  const requestedPage = parsePageParam(params.page);

  const [{ value: totalCount }] = await db
    .select({ value: count() })
    .from(transaction)
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(whereClause);

  const page = paginate ? clampPage(requestedPage, totalCount, pageSize) : 1;
  const rowLimit = exportAll
    ? EXPORT_MAX_ROWS
    : paginate
      ? pageSize
      : 150;
  const rowOffset = paginate && !exportAll ? (page - 1) * pageSize : 0;

  const baseQuery = db
    .select({
      id: transaction.id,
      userId: transaction.userId,
      createdAt: transaction.createdAt,
      amount: transaction.amount,
      status: transaction.status,
      operator: transaction.operator,
      adminCommission: transaction.adminCommission,
      distributorCommission: transaction.distributorCommission,
      retailerCommission: transaction.retailerCommission,
      userName: user.name,
      userStoreName: user.storeName,
      userEmail: user.email,
    })
    .from(transaction)
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(whereClause)
    .orderBy(earningsOrderBy(sort, scope))
    .limit(rowLimit);

  const transactions =
    rowOffset > 0 ? await baseQuery.offset(rowOffset) : await baseQuery;

  const distributorId = options?.distributorId;

  const rows: EarningRow[] = transactions.map((tx) => {
    const isOwnRecharge =
      scope === "distributor" &&
      distributorId != null &&
      tx.userId === distributorId;

    return {
      id: tx.id,
      createdAt: tx.createdAt.toISOString(),
      amount: tx.amount,
      status: tx.status,
      operator: tx.operator,
      commission: isOwnRecharge
        ? tx.retailerCommission
        : scope === "distributor"
          ? tx.distributorCommission
          : tx.adminCommission,
      user: {
        name: isOwnRecharge ? "You" : (tx.userStoreName || tx.userName),
        email: tx.userEmail,
      },
    };
  });

  return { rows, status, sort, scope, totalCount, page, pageSize };
}

export async function fetchAdminEarnings(
  params: AdminEarningsSearchParams,
  options?: Pick<FetchEarningsOptions, "paginate" | "exportAll">,
) {
  const result = await fetchEarnings(params, options);
  return {
    rows: result.rows,
    status: result.status,
    sort: result.sort,
    totalCount: result.totalCount,
    page: result.page,
    pageSize: result.pageSize,
  };
}

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
  lt,
  lte,
  or,
  sum,
  type SQL,
} from "drizzle-orm";
import { db, transaction } from "@repo/db";

import {
  resolveEarningsSort,
  type AdminEarningsSearchParams,
  type EarningsSort,
} from "@/lib/admin-earnings-query";
import { transactionAmountSearchCondition } from "@/lib/admin-transactions-query";
import { buildRetailerRechargeVolumeFilter } from "@/lib/retailer-recharge-volume";
import { requireRetailer } from "@/lib/retailer-auth";
import { computePercentChange, getDayBounds } from "@/lib/stat-trend";
import {
  clampPage,
  EXPORT_MAX_ROWS,
  parsePageParam,
  TABLE_PAGE_SIZE,
} from "@/lib/table-pagination";
import { resolveCarrierFilterOperators } from "@/lib/transaction-filters";

type RetailerEarningRow = {
  id: string;
  createdAt: string;
  amount: number;
  status: string;
  operator: string;
  targetPhone: string;
  commission: number;
  user: { name: string; email: string };
};

function buildRetailerEarningsConditions(
  retailerId: string,
  params: AdminEarningsSearchParams,
  status: string,
): SQL[] {
  const conditions: SQL[] = [
    eq(transaction.userId, retailerId),
    gt(transaction.retailerCommission, 0),
  ];
  if (status !== "ALL") {
    conditions.push(
      eq(transaction.status, status as "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED"),
    );
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

  return conditions;
}

function retailerEarningsOrderBy(sort: EarningsSort) {
  return sort === "date_asc"
    ? asc(transaction.createdAt)
    : sort === "amount_desc"
      ? desc(transaction.amount)
      : sort === "amount_asc"
        ? asc(transaction.amount)
        : sort === "commission_desc"
          ? desc(transaction.retailerCommission)
          : sort === "commission_asc"
            ? asc(transaction.retailerCommission)
            : sort === "operator_asc"
              ? asc(transaction.operator)
              : desc(transaction.createdAt);
}

export async function fetchRetailerEarnings(
  params: AdminEarningsSearchParams,
  options?: { paginate?: boolean; exportAll?: boolean },
) {
  const retailer = await requireRetailer();
  const sort = resolveEarningsSort(params.sort);
  const status =
    params.status && params.status !== "ALL" ? params.status : "ALL";
  const paginate = options?.paginate ?? false;
  const exportAll = options?.exportAll ?? false;
  const pageSize = TABLE_PAGE_SIZE;
  const requestedPage = parsePageParam(params.page);
  const whereClause = and(
    ...buildRetailerEarningsConditions(retailer.id, params, status),
  );

  const [{ value: totalCount }] = await db
    .select({ value: count() })
    .from(transaction)
    .where(whereClause);

  const page = paginate ? clampPage(requestedPage, totalCount, pageSize) : 1;
  const rowLimit = exportAll
    ? EXPORT_MAX_ROWS
    : paginate
      ? pageSize
      : 150;
  const rowOffset = paginate && !exportAll ? (page - 1) * pageSize : 0;

  const sortOrder = retailerEarningsOrderBy(sort);

  const baseQuery = db
    .select({
      id: transaction.id,
      createdAt: transaction.createdAt,
      amount: transaction.amount,
      status: transaction.status,
      operator: transaction.operator,
      targetPhone: transaction.targetPhone,
      commission: transaction.retailerCommission,
    })
    .from(transaction)
    .where(whereClause)
    .orderBy(sortOrder)
    .limit(rowLimit);

  const rowsDb =
    rowOffset > 0 ? await baseQuery.offset(rowOffset) : await baseQuery;

  const rows: RetailerEarningRow[] = rowsDb.map((tx) => ({
      ...tx,
      createdAt: tx.createdAt.toISOString(),
      user: { name: "You", email: retailer.email },
    }));

  const { todayStart, yesterdayStart } = getDayBounds();
  const rechargeVolumeFilter = buildRetailerRechargeVolumeFilter(retailer.id);

  const [
    [totalEarningsRow],
    [todaysEarningsRow],
    [totalVolumeRow],
    [todaysVolumeRow],
    [yesterdaysEarningsRow],
    [yesterdaysVolumeRow],
  ] = await Promise.all([
    db
      .select({ total: sum(transaction.retailerCommission) })
      .from(transaction)
      .where(and(eq(transaction.userId, retailer.id), gt(transaction.retailerCommission, 0))),
    db
      .select({ total: sum(transaction.retailerCommission) })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, retailer.id),
          gt(transaction.retailerCommission, 0),
          gte(transaction.createdAt, todayStart),
        ),
      ),
    db.select({ total: sum(transaction.amount) }).from(transaction).where(rechargeVolumeFilter),
    db
      .select({ total: sum(transaction.amount) })
      .from(transaction)
      .where(and(rechargeVolumeFilter, gte(transaction.createdAt, todayStart))),
    db
      .select({ total: sum(transaction.retailerCommission) })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, retailer.id),
          gt(transaction.retailerCommission, 0),
          gte(transaction.createdAt, yesterdayStart),
          lt(transaction.createdAt, todayStart),
        ),
      ),
    db
      .select({ total: sum(transaction.amount) })
      .from(transaction)
      .where(
        and(
          rechargeVolumeFilter,
          gte(transaction.createdAt, yesterdayStart),
          lt(transaction.createdAt, todayStart),
        ),
      ),
  ]);

  const totalEarnings = Number(totalEarningsRow?.total ?? 0);
  const todaysEarnings = Number(todaysEarningsRow?.total ?? 0);
  const totalVolume = Number(totalVolumeRow?.total ?? 0);
  const todaysVolume = Number(todaysVolumeRow?.total ?? 0);
  const yesterdaysEarnings = Number(yesterdaysEarningsRow?.total ?? 0);
  const yesterdaysVolume = Number(yesterdaysVolumeRow?.total ?? 0);
  const earningsThroughYesterday = totalEarnings - todaysEarnings;
  const volumeThroughYesterday = totalVolume - todaysVolume;

  return {
    rows,
    status,
    sort,
    totalCount,
    page,
    pageSize,
    stats: {
      totalEarnings,
      todaysEarnings,
      totalVolume,
      todaysVolume,
      earningsTrend: computePercentChange(totalEarnings, earningsThroughYesterday),
      todaysEarningsTrend: computePercentChange(todaysEarnings, yesterdaysEarnings),
      volumeTrend: computePercentChange(totalVolume, volumeThroughYesterday),
      todaysVolumeTrend: computePercentChange(todaysVolume, yesterdaysVolume),
    },
  };
}

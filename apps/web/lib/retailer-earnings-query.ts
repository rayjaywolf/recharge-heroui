import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  lt,
  lte,
  or,
  sum,
  type SQL,
} from "drizzle-orm";
import { db, transaction } from "@repo/db";

import { resolveEarningsSort, type AdminEarningsSearchParams } from "@/lib/admin-earnings-query";
import { computePercentChange, getDayBounds } from "@/lib/stat-trend";
import { buildRetailerRechargeVolumeFilter } from "@/lib/retailer-recharge-volume";
import { requireRetailer } from "@/lib/retailer-auth";

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

export async function fetchRetailerEarnings(params: AdminEarningsSearchParams) {
  const retailer = await requireRetailer();
  const sort = resolveEarningsSort(params.sort);
  const status =
    params.status && params.status !== "ALL" ? params.status : "ALL";

  const conditions: SQL[] = [
    eq(transaction.userId, retailer.id),
    gt(transaction.retailerCommission, 0),
  ];
  if (status !== "ALL") {
    conditions.push(eq(transaction.status, status as "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED"));
  }
  if (params.operator && params.operator !== "ALL") {
    conditions.push(eq(transaction.operator, params.operator));
  }
  if (params.search?.trim()) {
    const pattern = `%${params.search.trim()}%`;
    conditions.push(
      or(
        ilike(transaction.targetPhone, pattern),
        ilike(transaction.id, pattern),
        ilike(transaction.operator, pattern),
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

  const sortOrder =
    sort === "date_asc"
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

  const rowsDb = await db
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
    .where(and(...conditions))
    .orderBy(sortOrder)
    .limit(150);

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

import {
  and,
  eq,
  gt,
  gte,
  lt,
  sum,
} from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, transaction, user } from "@repo/db";

import {
  fetchEarnings,
  type AdminEarningsSearchParams,
  type FetchEarningsOptions,
} from "@/lib/admin-earnings-query";
import { buildDistributorRechargeVolumeFilter } from "@/lib/distributor-recharge-volume";
import { computePercentChange, getDayBounds } from "@/lib/stat-trend";
import { auth } from "@/lib/auth";

export async function fetchDistributorEarnings(
  params: AdminEarningsSearchParams,
  options?: Pick<FetchEarningsOptions, "paginate" | "exportAll">,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const [distributor] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!distributor || distributor.role !== "DISTRIBUTOR") {
    redirect("/login");
  }

  const earningsResult = await fetchEarnings(params, {
    distributorId: distributor.id,
    paginate: options?.paginate,
    exportAll: options?.exportAll,
  });

  const { todayStart, yesterdayStart } = getDayBounds();

  const retailers = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.distributorId, distributor.id));

  const retailerIds = retailers.map((r) => r.id);

  const rechargeVolumeFilter = buildDistributorRechargeVolumeFilter(
    distributor.id,
    retailerIds,
  );

  const [
    [networkEarningsRow],
    [selfEarningsRow],
    [todaysNetworkEarningsRow],
    [todaysSelfEarningsRow],
    [totalVolumeRow],
    [todaysVolumeRow],
    [yesterdaysNetworkEarningsRow],
    [yesterdaysSelfEarningsRow],
    [yesterdaysVolumeRow],
  ] = await Promise.all([
    db
      .select({ total: sum(transaction.distributorCommission) })
      .from(transaction)
      .innerJoin(user, eq(transaction.userId, user.id))
      .where(
        and(
          gt(transaction.distributorCommission, 0),
          eq(user.distributorId, distributor.id),
        ),
      ),
    db
      .select({ total: sum(transaction.retailerCommission) })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, distributor.id),
          gt(transaction.retailerCommission, 0),
        ),
      ),
    db
      .select({ total: sum(transaction.distributorCommission) })
      .from(transaction)
      .innerJoin(user, eq(transaction.userId, user.id))
      .where(
        and(
          gt(transaction.distributorCommission, 0),
          eq(user.distributorId, distributor.id),
          gte(transaction.createdAt, todayStart),
        ),
      ),
    db
      .select({ total: sum(transaction.retailerCommission) })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, distributor.id),
          gt(transaction.retailerCommission, 0),
          gte(transaction.createdAt, todayStart),
        ),
      ),
    db
      .select({ total: sum(transaction.amount) })
      .from(transaction)
      .where(rechargeVolumeFilter),
    db
      .select({ total: sum(transaction.amount) })
      .from(transaction)
      .where(
        and(rechargeVolumeFilter, gte(transaction.createdAt, todayStart)),
      ),
    db
      .select({ total: sum(transaction.distributorCommission) })
      .from(transaction)
      .innerJoin(user, eq(transaction.userId, user.id))
      .where(
        and(
          gt(transaction.distributorCommission, 0),
          eq(user.distributorId, distributor.id),
          gte(transaction.createdAt, yesterdayStart),
          lt(transaction.createdAt, todayStart),
        ),
      ),
    db
      .select({ total: sum(transaction.retailerCommission) })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, distributor.id),
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

  const totalEarnings =
    Number(networkEarningsRow?.total ?? 0) + Number(selfEarningsRow?.total ?? 0);
  const todaysEarnings =
    Number(todaysNetworkEarningsRow?.total ?? 0) +
    Number(todaysSelfEarningsRow?.total ?? 0);
  const yesterdaysEarnings =
    Number(yesterdaysNetworkEarningsRow?.total ?? 0) +
    Number(yesterdaysSelfEarningsRow?.total ?? 0);
  const totalVolume = Number(totalVolumeRow?.total ?? 0);
  const todaysVolume = Number(todaysVolumeRow?.total ?? 0);
  const yesterdaysVolume = Number(yesterdaysVolumeRow?.total ?? 0);
  const earningsThroughYesterday = totalEarnings - todaysEarnings;
  const volumeThroughYesterday = totalVolume - todaysVolume;

  return {
    ...earningsResult,
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

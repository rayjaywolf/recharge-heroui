import { and, eq, inArray, notInArray, or, type SQL } from "drizzle-orm";
import { transaction } from "@repo/db";

import { RECHARGE_EXCLUDED_OPERATORS } from "@/lib/transaction-filters";

/** Successful recharge volume for a distributor and their retailer network. */
export function buildDistributorRechargeVolumeFilter(
  distributorId: string,
  retailerIds: string[],
): SQL {
  const participantFilter =
    retailerIds.length > 0
      ? or(
          inArray(transaction.userId, retailerIds),
          eq(transaction.userId, distributorId),
        )!
      : eq(transaction.userId, distributorId);

  return and(
    eq(transaction.status, "SUCCESS"),
    notInArray(transaction.operator, [...RECHARGE_EXCLUDED_OPERATORS]),
    participantFilter,
  )!;
}

/** Recharge attempts (resolved) for success-rate stats across the network. */
export function buildDistributorRechargeActivityFilter(
  distributorId: string,
  retailerIds: string[],
): SQL {
  const participantFilter =
    retailerIds.length > 0
      ? or(
          inArray(transaction.userId, retailerIds),
          eq(transaction.userId, distributorId),
        )!
      : eq(transaction.userId, distributorId);

  return and(
    notInArray(transaction.operator, [...RECHARGE_EXCLUDED_OPERATORS]),
    inArray(transaction.status, ["SUCCESS", "FAILED", "REFUNDED"]),
    participantFilter,
  )!;
}

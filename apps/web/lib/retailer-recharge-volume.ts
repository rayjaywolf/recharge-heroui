import { and, eq, inArray, notInArray, type SQL } from "drizzle-orm";
import { transaction } from "@repo/db";

import { RECHARGE_EXCLUDED_OPERATORS } from "@/lib/transaction-filters";

export function buildRetailerRechargeVolumeFilter(retailerId: string): SQL {
  return and(
    eq(transaction.userId, retailerId),
    eq(transaction.status, "SUCCESS"),
    notInArray(transaction.operator, [...RECHARGE_EXCLUDED_OPERATORS]),
  )!;
}

export function buildRetailerRechargeActivityFilter(retailerId: string): SQL {
  return and(
    eq(transaction.userId, retailerId),
    notInArray(transaction.operator, [...RECHARGE_EXCLUDED_OPERATORS]),
    inArray(transaction.status, ["SUCCESS", "FAILED", "REFUNDED"]),
  )!;
}

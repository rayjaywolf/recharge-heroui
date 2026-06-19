import { and, eq } from "drizzle-orm";

import {
  commissionRule,
  db,
  retailerCommissionOverride,
} from "@repo/db";

export type CommissionMargins = {
  providerMargin: number;
  adminMargin: number;
  distributorMargin: number;
  retailerMargin: number;
};

export type EffectiveCommissionMargins = CommissionMargins & {
  source: "default" | "override";
  overrideId?: string;
};

type DbClient = Pick<typeof db, "select">;

export async function getEffectiveCommissionMargins(
  database: DbClient,
  params: {
    userId: string;
    operator: string;
    applyRetailerOverride?: boolean;
  },
): Promise<EffectiveCommissionMargins | null> {
  const applyRetailerOverride = params.applyRetailerOverride ?? true;

  const [globalRule] = await database
    .select()
    .from(commissionRule)
    .where(eq(commissionRule.operator, params.operator))
    .limit(1);

  if (applyRetailerOverride) {
    const [override] = await database
      .select()
      .from(retailerCommissionOverride)
      .where(
        and(
          eq(retailerCommissionOverride.userId, params.userId),
          eq(retailerCommissionOverride.operator, params.operator),
        ),
      )
      .limit(1);

    if (override) {
      return {
        providerMargin: override.providerMargin,
        adminMargin: override.adminMargin,
        distributorMargin: override.distributorMargin,
        retailerMargin: override.retailerMargin,
        source: "override",
        overrideId: override.id,
      };
    }
  }

  if (!globalRule) return null;

  return {
    providerMargin: globalRule.providerMargin,
    adminMargin: globalRule.adminMargin,
    distributorMargin: globalRule.distributorMargin,
    retailerMargin: globalRule.retailerMargin,
    source: "default",
  };
}

export function computeCommissionAmounts(params: {
  margins: CommissionMargins;
  amount: number;
  userRole: string;
  distributorId: string | null;
}) {
  const { margins, amount, userRole, distributorId } = params;

  const retailerCommission = (amount * margins.retailerMargin) / 100;
  const distributorSlice = (amount * margins.distributorMargin) / 100;
  const adminSlice = (amount * margins.adminMargin) / 100;

  const isDistributorSelfRecharge =
    userRole === "DISTRIBUTOR" && !distributorId;

  let adminCommission: number;
  let distributorCommission: number;

  if (isDistributorSelfRecharge) {
    adminCommission = adminSlice + distributorSlice;
    distributorCommission = 0;
  } else {
    const hasDistributor = !!distributorId;
    adminCommission = adminSlice + (hasDistributor ? 0 : distributorSlice);
    distributorCommission = hasDistributor ? distributorSlice : 0;
  }

  return {
    retailerCommission,
    adminCommission,
    distributorCommission,
  };
}

export async function resolveCommissionAmountsForUser(
  database: DbClient,
  params: {
    userId: string;
    operator: string;
    amount: number;
    userRole: string;
    distributorId: string | null;
  },
) {
  const margins = await getEffectiveCommissionMargins(database, {
    userId: params.userId,
    operator: params.operator,
    applyRetailerOverride: params.userRole === "RETAILER",
  });

  const effective: CommissionMargins = margins ?? {
    providerMargin: 0,
    adminMargin: 0,
    distributorMargin: 0,
    retailerMargin: 0,
  };

  return {
    margins: effective,
    ...computeCommissionAmounts({
      margins: effective,
      amount: params.amount,
      userRole: params.userRole,
      distributorId: params.distributorId,
    }),
  };
}

import { describe, expect, it } from "vitest";

import {
  computeCommissionAmounts,
  type CommissionMargins,
} from "../../packages/server/src/commission-margins";

const margins: CommissionMargins = {
  providerMargin: 4,
  adminMargin: 1,
  distributorMargin: 1,
  retailerMargin: 2,
};

describe("computeCommissionAmounts", () => {
  it("splits retailer and distributor commissions when retailer has a distributor", () => {
    const result = computeCommissionAmounts({
      margins,
      amount: 100,
      userRole: "RETAILER",
      distributorId: "dist-1",
    });

    expect(result).toEqual({
      retailerCommission: 2,
      adminCommission: 1,
      distributorCommission: 1,
    });
  });

  it("rolls distributor margin to admin when retailer has no distributor", () => {
    const result = computeCommissionAmounts({
      margins,
      amount: 100,
      userRole: "RETAILER",
      distributorId: null,
    });

    expect(result).toEqual({
      retailerCommission: 2,
      adminCommission: 2,
      distributorCommission: 0,
    });
  });

  it("rolls distributor margin to admin for distributor self-recharge", () => {
    const result = computeCommissionAmounts({
      margins,
      amount: 100,
      userRole: "DISTRIBUTOR",
      distributorId: null,
    });

    expect(result).toEqual({
      retailerCommission: 2,
      adminCommission: 2,
      distributorCommission: 0,
    });
  });
});

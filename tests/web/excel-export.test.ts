import { describe, expect, it } from "vitest";

import {
  buildWorksheetRows,
  type BaseTransactionData,
} from "@/lib/excel-export";

const RETAILER_EARNINGS_HEADERS = [
  "Date",
  "Time",
  "Phone",
  "Operator",
  "Recharge Amount",
  "Your Cut",
] as const;

function sampleRow(
  overrides: Partial<BaseTransactionData> = {},
): BaseTransactionData {
  return {
    id: "tx_test_1",
    createdAt: "2026-05-28T10:30:00.000Z",
    amount: 100,
    status: "SUCCESS",
    operator: "Airtel",
    targetPhone: "9876543210",
    retailerCommission: 1.25,
    commission: 1.25,
    user: { name: "You", email: "retailer@example.com" },
    ...overrides,
  };
}

describe("retailer earnings excel export", () => {
  it("includes phone from targetPhone in the Phone column", () => {
    const rows = buildWorksheetRows(
      [...RETAILER_EARNINGS_HEADERS],
      [sampleRow({ targetPhone: "9876543210" })],
    );

    expect(rows[0]).toEqual([...RETAILER_EARNINGS_HEADERS]);
    expect(rows[1][2]).toBe("9876543210");
  });

  it("leaves Phone empty when targetPhone is missing", () => {
    const rows = buildWorksheetRows(
      [...RETAILER_EARNINGS_HEADERS],
      [sampleRow({ targetPhone: undefined })],
    );

    expect(rows[1][2]).toBe("");
  });

  it("formats commission as Your Cut", () => {
    const rows = buildWorksheetRows(
      [...RETAILER_EARNINGS_HEADERS],
      [sampleRow({ retailerCommission: 2.5, commission: 2.5 })],
    );

    expect(rows[1][5]).toBe("₹2.5");
  });
});

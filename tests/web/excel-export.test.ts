import { describe, expect, it } from "vitest";

import {
  buildRetailerFundingWorksheetRows,
  buildWorksheetRows,
  RETAILER_FUNDING_EXPORT_HEADERS,
  type BaseTransactionData,
  type RetailerFundingExportRow,
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

  it("formats Opening Balance and Closing Balance", () => {
    const headers = ["Opening Balance", "Closing Balance"] as const;
    const rows = buildWorksheetRows(
      [...headers],
      [sampleRow({ openingBalance: 1200, closingBalance: 1100 })],
    );

    expect(rows[0]).toEqual([...headers]);
    expect(rows[1][0]).toBe("₹1,200");
    expect(rows[1][1]).toBe("₹1,100");
  });
});

describe("retailer funding report excel export", () => {
  const sampleFundingRow: RetailerFundingExportRow = {
    date: "12/11/2026",
    time: "10:30:00 am",
    retailerName: "Raj Communication (Rajesh)",
    retailerPhone: "9876543210",
    retailerEmail: "rajesh@example.com",
    distributorName: "Metro Distributors",
    fundedBy: "Admin Manual Credit",
    amount: 5000,
    openingBalance: 1500,
    closingBalance: 6500,
    remarks: "Manual wallet top-up by admin",
    status: "SUCCESS",
    referenceId: "tx_fund_12345",
  };

  it("builds correct headers for retailer funding export", () => {
    const rows = buildRetailerFundingWorksheetRows([sampleFundingRow]);
    expect(rows[0]).toEqual([...RETAILER_FUNDING_EXPORT_HEADERS]);
    expect(rows[0]).toEqual([
      "Date",
      "Time",
      "Retailer",
      "Phone",
      "Email",
      "Distributor",
      "Funded By",
      "Amount",
      "Opening Balance",
      "Closing Balance",
      "Remarks",
      "Status",
      "Reference ID",
    ]);
  });

  it("maps row cells with formatted amounts and values", () => {
    const rows = buildRetailerFundingWorksheetRows([sampleFundingRow]);
    expect(rows.length).toBe(2);
    expect(rows[1]).toEqual([
      "12/11/2026",
      "10:30:00 am",
      "Raj Communication (Rajesh)",
      "9876543210",
      "rajesh@example.com",
      "Metro Distributors",
      "Admin Manual Credit",
      "₹5,000",
      "₹1,500",
      "₹6,500",
      "Manual wallet top-up by admin",
      "SUCCESS",
      "tx_fund_12345",
    ]);
  });

  it("exports empty dataset with only headers when no rows match filters", () => {
    const rows = buildRetailerFundingWorksheetRows([]);
    expect(rows.length).toBe(1);
    expect(rows[0]).toEqual([...RETAILER_FUNDING_EXPORT_HEADERS]);
  });
});


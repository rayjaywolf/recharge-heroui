import { describe, expect, it } from "vitest";

import {
  detectActivePreset,
  filterRetailerFundingRows,
  formatIsoDateOnly,
  getDatePresetRange,
  type RetailerFundingReportRow,
} from "../../apps/web/lib/retailer-funding-report";

describe("retailer funding date presets", () => {
  // 2026-11-12 is a Thursday
  const testDate = new Date(2026, 10, 12, 14, 30, 0); // month is 0-indexed, so 10 is November

  it("calculates 'today' range correctly", () => {
    const range = getDatePresetRange("today", testDate);
    expect(range).toEqual({
      dateFrom: "2026-11-12",
      dateTo: "2026-11-12",
    });
  });

  it("calculates 'week' range (Monday through today)", () => {
    const range = getDatePresetRange("week", testDate);
    expect(range).toEqual({
      dateFrom: "2026-11-09", // Thursday minus 3 days = Monday Nov 9
      dateTo: "2026-11-12",
    });
  });

  it("calculates 'month' range (1st of month through today)", () => {
    const range = getDatePresetRange("month", testDate);
    expect(range).toEqual({
      dateFrom: "2026-11-01",
      dateTo: "2026-11-12",
    });
  });

  it("calculates 'year' range (Jan 1 through today)", () => {
    const range = getDatePresetRange("year", testDate);
    expect(range).toEqual({
      dateFrom: "2026-01-01",
      dateTo: "2026-11-12",
    });
  });

  it("calculates 'all' range as empty strings", () => {
    const range = getDatePresetRange("all", testDate);
    expect(range).toEqual({
      dateFrom: "",
      dateTo: "",
    });
  });

  it("detects active presets accurately", () => {
    expect(detectActivePreset("", "", testDate)).toBe("all");
    expect(detectActivePreset("2026-11-12", "2026-11-12", testDate)).toBe("today");
    expect(detectActivePreset("2026-11-09", "2026-11-12", testDate)).toBe("week");
    expect(detectActivePreset("2026-11-01", "2026-11-12", testDate)).toBe("month");
    expect(detectActivePreset("2026-01-01", "2026-11-12", testDate)).toBe("year");
    expect(detectActivePreset("2026-10-05", "2026-10-20", testDate)).toBe("custom");
  });
});

describe("filterRetailerFundingRows", () => {
  const sampleRows: RetailerFundingReportRow[] = [
    {
      id: "tx_1",
      createdAt: "2026-11-12T10:00:00.000Z",
      amount: 5000,
      operator: "MANUAL_CREDIT",
      status: "SUCCESS",
      apiMessage: "Admin wallet recharge",
      openingBalance: 1000,
      closingBalance: 6000,
      retailerId: "ret_1",
      retailerName: "Rajesh Kumar",
      retailerStoreName: "Rajesh Telecom",
      retailerEmail: "rajesh@telecom.com",
      retailerPhoneNumber: "9876543210",
      distributorId: "dist_1",
      distributorName: "Vikas Sharma",
      distributorStoreName: "Vikas Distributions",
    },
    {
      id: "tx_2",
      createdAt: "2026-11-10T14:00:00.000Z",
      amount: 2000,
      operator: "FUNDS_RECEIVED",
      status: "SUCCESS",
      apiMessage: "Fund transfer from distributor Vikas",
      openingBalance: 500,
      closingBalance: 2500,
      retailerId: "ret_2",
      retailerName: "Amit Verma",
      retailerStoreName: "Amit Mobile",
      retailerEmail: "amit@verma.com",
      retailerPhoneNumber: "9812345678",
      distributorId: "dist_1",
      distributorName: "Vikas Sharma",
      distributorStoreName: "Vikas Distributions",
    },
    {
      id: "tx_3",
      createdAt: "2026-10-15T09:00:00.000Z",
      amount: 10000,
      operator: "MANUAL_CREDIT",
      status: "SUCCESS",
      apiMessage: "Diwali festival balance credit",
      openingBalance: 200,
      closingBalance: 10200,
      retailerId: "ret_1",
      retailerName: "Rajesh Kumar",
      retailerStoreName: "Rajesh Telecom",
      retailerEmail: "rajesh@telecom.com",
      retailerPhoneNumber: "9876543210",
      distributorId: "dist_1",
      distributorName: "Vikas Sharma",
      distributorStoreName: "Vikas Distributions",
    },
  ];

  it("filters by retailerId", () => {
    const result = filterRetailerFundingRows(sampleRows, {
      retailerId: "ret_2",
    });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("tx_2");
    expect(result[0].retailerName).toBe("Amit Verma");
  });

  it("returns all when retailerId is ALL or empty", () => {
    const result = filterRetailerFundingRows(sampleRows, {
      retailerId: "ALL",
    });
    expect(result.length).toBe(3);
  });

  it("filters by source (ADMIN vs DISTRIBUTOR)", () => {
    const adminOnly = filterRetailerFundingRows(sampleRows, {
      source: "ADMIN",
    });
    expect(adminOnly.length).toBe(2);
    expect(adminOnly.every((r) => r.operator === "MANUAL_CREDIT")).toBe(true);

    const distOnly = filterRetailerFundingRows(sampleRows, {
      source: "DISTRIBUTOR",
    });
    expect(distOnly.length).toBe(1);
    expect(distOnly[0].operator).toBe("FUNDS_RECEIVED");
  });

  it("filters by date range (e.g. November only)", () => {
    const novOnly = filterRetailerFundingRows(sampleRows, {
      dateFrom: "2026-11-01",
      dateTo: "2026-11-30",
    });
    expect(novOnly.length).toBe(2);
    expect(novOnly.map((r) => r.id)).toEqual(["tx_1", "tx_2"]);
  });

  it("filters by search term (store name, phone, ref ID, remarks)", () => {
    const byStore = filterRetailerFundingRows(sampleRows, {
      search: "Amit Mobile",
    });
    expect(byStore.length).toBe(1);
    expect(byStore[0].id).toBe("tx_2");

    const byPhone = filterRetailerFundingRows(sampleRows, {
      search: "9876543210",
    });
    expect(byPhone.length).toBe(2);

    const byRemarks = filterRetailerFundingRows(sampleRows, {
      search: "Diwali",
    });
    expect(byRemarks.length).toBe(1);
    expect(byRemarks[0].id).toBe("tx_3");
  });

  it("sorts rows correctly", () => {
    const byAmountDesc = filterRetailerFundingRows(sampleRows, {
      sort: "amount_desc",
    });
    expect(byAmountDesc.map((r) => r.amount)).toEqual([10000, 5000, 2000]);

    const byAmountAsc = filterRetailerFundingRows(sampleRows, {
      sort: "amount_asc",
    });
    expect(byAmountAsc.map((r) => r.amount)).toEqual([2000, 5000, 10000]);

    const byRetailer = filterRetailerFundingRows(sampleRows, {
      sort: "retailer_asc",
    });
    expect(byRetailer[0].retailerName).toBe("Amit Verma");
  });
});


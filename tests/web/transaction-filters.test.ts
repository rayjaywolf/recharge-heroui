import { describe, expect, it } from "vitest";

import { resolveCarrierFilterOperators } from "../../apps/web/lib/transaction-filters";

describe("resolveCarrierFilterOperators", () => {
  it("returns empty for ALL", () => {
    expect(resolveCarrierFilterOperators("ALL")).toEqual([]);
  });

  it("maps JIO to Jio", () => {
    expect(resolveCarrierFilterOperators("JIO")).toEqual(["Jio"]);
  });

  it("maps AIRTEL to Airtel", () => {
    expect(resolveCarrierFilterOperators("AIRTEL")).toEqual(["Airtel"]);
  });

  it("maps BSNL to both BSNL operator rows", () => {
    expect(resolveCarrierFilterOperators("BSNL")).toEqual([
      "BSNL Recharge",
      "BSNL Topup",
    ]);
  });

  it("maps VI to Vi and Idea", () => {
    expect(resolveCarrierFilterOperators("VI")).toEqual(["Vi", "Idea"]);
  });

  it("passes through unknown values unchanged", () => {
    expect(resolveCarrierFilterOperators("BSNL Recharge")).toEqual([
      "BSNL Recharge",
    ]);
  });
});

import { describe, expect, it } from "vitest";

import { parseRechargeProviderResponse } from "@repo/server/recharge-gateway";

describe("A1TOPUP provider response parsing", () => {
  it("maps timeout/network fallback to PENDING without refund", () => {
    const parsed = parseRechargeProviderResponse(
      "A1TOPUP",
      {
        status: "pending",
        message:
          "A1TopUp request timed out. Left pending for status reconciliation.",
        transaction_id: "tx_abc123",
        orderid: "tx_abc123",
      },
      "tx_abc123",
    );

    expect(parsed.finalStatus).toBe("PENDING");
    expect(parsed.shouldRefund).toBe(false);
    expect(parsed.apiMessage).toContain("timed out");
    expect(parsed.apiReferenceId).toContain("tx_abc123");
  });

  it("treats unknown provider status as pending (no premature refund)", () => {
    const parsed = parseRechargeProviderResponse(
      "A1TOPUP",
      {
        status: "queued_at_provider",
        message: "Recharge queued for processing",
        transaction_id: "tx_unknown_1",
      },
      "tx_unknown_1",
    );

    expect(parsed.finalStatus).toBe("PENDING");
    expect(parsed.shouldRefund).toBe(false);
    expect(parsed.apiReferenceId).toContain("tx_unknown_1");
  });
});

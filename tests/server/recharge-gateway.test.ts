import { describe, expect, it } from "vitest";

import { parseRechargeProviderResponse } from "@repo/server/recharge-gateway";

describe("REALROBO provider response parsing", () => {
  it("maps status success to SUCCESS even when message mentions pending", () => {
    const parsed = parseRechargeProviderResponse(
      "REALROBO",
      {
        status: "success",
        message:
          "Your recharge is currently pending. We will update the status shortly. In case of failure, you will receive the refund within 2 working days.",
        txid: "560605172277176",
        req_id: "ena8cxu7vykx4s4m0g3zgo4c",
      },
      "ena8cxu7vykx4s4m0g3zgo4c",
    );

    expect(parsed.finalStatus).toBe("SUCCESS");
    expect(parsed.shouldRefund).toBe(false);
    expect(parsed.apiMessage).toContain("currently pending");
  });

  it("maps status pending to PENDING", () => {
    const parsed = parseRechargeProviderResponse(
      "REALROBO",
      {
        status: "pending",
        message: "Transaction is Pending. The status will be updated shortly",
        req_id: "tx_pending_1",
      },
      "tx_pending_1",
    );

    expect(parsed.finalStatus).toBe("PENDING");
    expect(parsed.shouldRefund).toBe(false);
  });
});

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

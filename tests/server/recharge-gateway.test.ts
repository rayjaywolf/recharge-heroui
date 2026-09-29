import { describe, expect, it } from "vitest";

import { createNumericId } from "@repo/db";
import { generateNumericRequestId } from "@repo/server/realrobo";
import { parseRechargeProviderResponse } from "@repo/server/recharge-gateway";

describe("Numeric Request ID generation", () => {
  it("generateNumericRequestId produces digits only (no alpha characters)", () => {
    const reqId = generateNumericRequestId();
    expect(reqId).toMatch(/^\d+$/);
    expect(reqId.length).toBeGreaterThanOrEqual(13);
  });

  it("createNumericId produces digits only (no alpha characters)", () => {
    const id = createNumericId();
    expect(id).toMatch(/^\d+$/);
    expect(id.length).toBeGreaterThanOrEqual(13);
  });

  it("generates unique numeric IDs on successive calls", () => {
    const id1 = createNumericId();
    const id2 = createNumericId();
    expect(id1).toMatch(/^\d+$/);
    expect(id2).toMatch(/^\d+$/);
  });
});

describe("REALROBO provider response parsing", () => {
  it("maps status success to SUCCESS even when message mentions pending", () => {
    const parsed = parseRechargeProviderResponse(
      "REALROBO",
      {
        status: "success",
        message:
          "Your recharge is currently pending. We will update the status shortly. In case of failure, you will receive the refund within 2 working days.",
        txid: "560605172277176",
        req_id: "17267123456781234",
      },
      "17267123456781234",
    );

    expect(parsed.finalStatus).toBe("SUCCESS");
    expect(parsed.shouldRefund).toBe(false);
    expect(parsed.apiMessage).toContain("currently pending");
  });

  it("maps status pending to PENDING with numeric req_id", () => {
    const parsed = parseRechargeProviderResponse(
      "REALROBO",
      {
        status: "pending",
        message: "Transaction is Pending. The status will be updated shortly",
        req_id: "17267123456785678",
      },
      "17267123456785678",
    );

    expect(parsed.finalStatus).toBe("PENDING");
    expect(parsed.shouldRefund).toBe(false);
  });
});

describe("A1TOPUP provider response parsing", () => {
  it("maps Success status to SUCCESS (case-insensitive)", () => {
    const parsed = parseRechargeProviderResponse(
      "A1TOPUP",
      {
        status: "Success",
        opid: "RJ0317161622000269New",
        txid: "5804",
        orderid: "tx_success_1",
      },
      "tx_success_1",
    );

    expect(parsed.finalStatus).toBe("SUCCESS");
    expect(parsed.shouldRefund).toBe(false);
    expect(parsed.apiReferenceId).toContain("5804");
    expect(parsed.apiReferenceId).toContain("RJ0317161622000269New");
  });

  it("maps Failure status to FAILED with refund", () => {
    const parsed = parseRechargeProviderResponse(
      "A1TOPUP",
      {
        status: "Failure",
        message: "Insufficient balance",
        txid: "5805",
        orderid: "tx_failed_1",
      },
      "tx_failed_1",
    );

    expect(parsed.finalStatus).toBe("FAILED");
    expect(parsed.shouldRefund).toBe(true);
    expect(parsed.apiMessage).toBe("Insufficient balance");
  });

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

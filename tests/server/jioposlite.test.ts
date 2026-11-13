import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getJioPosLiteApiToken,
  getJioPosLiteBalance,
  getJioPosLiteLapuId,
  JIOPOSLITE_DEFAULT_LAPU_ID,
  JIOPOSLITE_OPERATOR_ID,
  performJioPosLiteRecharge,
  checkJioPosLiteStatus,
} from "../../packages/server/src/jioposlite";
import {
  callRechargeProvider,
  parseRechargeProviderResponse,
} from "../../packages/server/src/recharge-gateway";
import { PROVIDER_LABELS } from "../../packages/shared/src/recharge-config";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Jio Pos Lite Provider Configuration", () => {
  it("has Jio Pos Lite label in shared recharge config", () => {
    expect(PROVIDER_LABELS.JIOPOSLITE).toBe("Jio Pos Lite");
  });

  it("defaults lapu to 641942 and supports env override", () => {
    vi.stubEnv("JIOPOSLITE_LAPU_ID", "");
    vi.stubEnv("REALROBO_JIO_POS_LITE_LAPU_ID", "");
    expect(getJioPosLiteLapuId()).toBe(JIOPOSLITE_DEFAULT_LAPU_ID);
    expect(getJioPosLiteLapuId()).toBe("641942");

    vi.stubEnv("JIOPOSLITE_LAPU_ID", "123456");
    expect(getJioPosLiteLapuId()).toBe("123456");
  });

  it("resolves api token from JIOPOSLITE_API_TOKEN or fallback REALROBO_API_TOKEN", () => {
    vi.stubEnv("JIOPOSLITE_API_TOKEN", "");
    vi.stubEnv("REALROBO_API_TOKEN", "realrobo-tok-123");
    expect(getJioPosLiteApiToken()).toBe("realrobo-tok-123");

    vi.stubEnv("JIOPOSLITE_API_TOKEN", "custom-jio-tok");
    expect(getJioPosLiteApiToken()).toBe("custom-jio-tok");
  });
});

describe("Jio Pos Lite API Execution", () => {
  it("calls RealRobo API with operator_id=13 and lapu_id=641942", async () => {
    vi.stubEnv("REALROBO_API_TOKEN", "tok-abc");
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "success",
          txid: "tx-jio-pos-1",
          message: "Recharge successful",
          req_id: "req-101",
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await performJioPosLiteRecharge(
      "9876543210",
      "Jio",
      239,
      "MP",
      "179456099999",
    );

    expect(res.status).toBe("success");
    expect(res.txid).toBe("tx-jio-pos-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const calledUrl = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://realrobo.in/api/recharge",
    );
    expect(calledUrl.searchParams.get("api_token")).toBe("tok-abc");
    expect(calledUrl.searchParams.get("number")).toBe("9876543210");
    expect(calledUrl.searchParams.get("amount")).toBe("239");
    expect(calledUrl.searchParams.get("operator_id")).toBe(
      String(JIOPOSLITE_OPERATOR_ID),
    );
    expect(calledUrl.searchParams.get("lapu_id")).toBe("641942");
    expect(calledUrl.searchParams.get("state_id")).toBe("14"); // MP
    expect(calledUrl.searchParams.get("req_id")).toBe("179456099999");
  });

  it("checks status via RealRobo status_check", async () => {
    vi.stubEnv("REALROBO_API_TOKEN", "tok-abc");
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "success",
          txid: "tx-1",
          message: "Success",
          req_id: "req-202",
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const statusRes = await checkJioPosLiteStatus("req-202");
    expect(statusRes.status).toBe("success");

    const calledUrl = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://realrobo.in/api/status_check",
    );
    expect(calledUrl.searchParams.get("req_id")).toBe("req-202");
  });

  it("fetches lapu balance for 641942", async () => {
    vi.stubEnv("REALROBO_API_TOKEN", "tok-abc");
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: true,
          msg: "Success.",
          data: {
            lapu_no: "9691347387",
            balance: 1483.77,
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const balRes = await getJioPosLiteBalance();
    expect(balRes.status).toBe(true);
    expect(balRes.data.balance).toBe(1483.77);

    const calledUrl = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://realrobo.in/api/lapu_balance",
    );
    expect(calledUrl.searchParams.get("lapu_id")).toBe("641942");
  });
});

describe("Recharge Gateway JIOPOSLITE integration", () => {
  it("dispatches recharge via callRechargeProvider", async () => {
    vi.stubEnv("REALROBO_API_TOKEN", "tok-abc");
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "success",
          txid: "gw-jio-1",
          message: "Recharge success",
          req_id: "tx-999",
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callRechargeProvider({
      providerId: "JIOPOSLITE",
      phone: "9123456789",
      operator: "Jio",
      amount: 199,
      circleCode: "RJ",
      transactionId: "179456088888",
    });

    const parsed = parseRechargeProviderResponse(
      "JIOPOSLITE",
      result,
      "179456088888",
    );
    expect(parsed.finalStatus).toBe("SUCCESS");
    expect(parsed.apiMessage).toBe("Recharge success");
    expect(parsed.shouldRefund).toBe(false);
  });

  it("parses failure response with refund flag", () => {
    const parsed = parseRechargeProviderResponse(
      "JIOPOSLITE",
      {
        status: "failure",
        message: "Balance insufficient on lapu",
        req_id: "tx-888",
      },
      "tx-888",
    );

    expect(parsed.finalStatus).toBe("FAILED");
    expect(parsed.shouldRefund).toBe(true);
    expect(parsed.apiMessage).toBe("Balance insufficient on lapu");
  });
});

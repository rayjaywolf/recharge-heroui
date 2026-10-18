import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRealRoboLapuId,
  getRealRoboWalletOperatorId,
  getRealRoboWalletSubOperatorId,
  performRealRoboRecharge,
} from "../../packages/server/src/realrobo";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("RealRobo wallet operator selection", () => {
  it("defaults to Amazon (17)", () => {
    vi.stubEnv("REALROBO_WALLET_OPERATOR_ID", "");
    expect(getRealRoboWalletOperatorId()).toBe(17);
  });

  it("selects Airtel Money (11) from env", () => {
    vi.stubEnv("REALROBO_WALLET_OPERATOR_ID", "11");
    expect(getRealRoboWalletOperatorId()).toBe(11);
  });

  it("uses the default Amazon lapu 632505 when env is unset", () => {
    vi.stubEnv("REALROBO_AMAZON_LAPU_ID", "");
    expect(getRealRoboLapuId(17)).toBe("632505");
  });

  it("does not send the Amazon lapu on Airtel Money", () => {
    vi.stubEnv("REALROBO_LAPU_ID", "");
    expect(getRealRoboLapuId(11)).toBeUndefined();
  });

  it("rejects unsupported wallet ids", () => {
    vi.stubEnv("REALROBO_WALLET_OPERATOR_ID", "12");
    expect(() => getRealRoboWalletOperatorId()).toThrow(/REALROBO_WALLET_OPERATOR_ID/);
  });
});

describe("RealRobo Amazon (17) sub-operator codes", () => {
  it.each([
    ["Airtel", "4055679830"],
    ["BSNL", "9865222"],
    ["Jio", "2215673867"],
    ["Vi", "2014429421"],
    ["Airtel Digital TV", "1689553544"],
    ["Dish TV", "2637424641"],
    ["Sun Direct", "781356231"],
    ["Tata Play", "2408150274"],
    ["Videocon D2H", "451144483"],
    ["Airtel Postpaid", "4032544018"],
    ["BSNL Postpaid", "2995610146"],
    ["Jio Postpaid", "2801359923"],
    ["Vi Postpaid", "1679605053"],
  ])("%s -> %s", (name, code) => {
    expect(getRealRoboWalletSubOperatorId(name, 17)).toBe(code);
  });

  it("ignores the Airtel Money env override", () => {
    vi.stubEnv("REALROBO_AIRTEL_MONEY_SUB_OPERATOR_ID", "999");
    expect(getRealRoboWalletSubOperatorId("Jio", 17)).toBe("2215673867");
    expect(getRealRoboWalletSubOperatorId("Jio", 11)).toBe("999");
  });
});

describe("RealRobo Airtel Money (11) codes unchanged", () => {
  it.each([
    ["Jio", "2732468061"],
    ["Tata Play", "2501790927"],
    ["Airtel Postpaid", "3205701260"],
    ["Airtel Postpaid Fetch", "716318493"],
  ])("%s -> %s", (name, code) => {
    vi.stubEnv("REALROBO_AIRTEL_MONEY_SUB_OPERATOR_ID", "");
    expect(getRealRoboWalletSubOperatorId(name, 11)).toBe(code);
  });
});

describe("performRealRoboRecharge via Amazon", () => {
  it("sends operator_id=17 with the Amazon sub_operator_id", async () => {
    vi.stubEnv("REALROBO_API_TOKEN", "test-token");
    vi.stubEnv("REALROBO_WALLET_OPERATOR_ID", "17");
    vi.stubEnv("REALROBO_LAPU_ID", "airtel-lapu");
    vi.stubEnv("REALROBO_AMAZON_LAPU_ID", "632505");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: "success", txid: "1", message: "ok" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await performRealRoboRecharge("9999999999", "Jio", 199, "RJ", "123456");

    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.searchParams.get("operator_id")).toBe("17");
    expect(url.searchParams.get("sub_operator_id")).toBe("2215673867");
    expect(url.searchParams.get("lapu_id")).toBe("632505");
  });
});

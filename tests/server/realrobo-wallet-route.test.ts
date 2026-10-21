import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRealRoboLapuId,
  getRealRoboWalletOperatorId,
  getRealRoboWalletSubOperatorId,
  performRealRoboRecharge,
  resetRealRoboLapuBalancesForTests,
  resolveRealRoboWalletOperatorId,
  setRealRoboLapuBalanceForTests,
} from "../../packages/server/src/realrobo";

afterEach(() => {
  resetRealRoboLapuBalancesForTests();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("RealRobo wallet operator selection", () => {
  it("defaults to Airtel Money (11)", () => {
    vi.stubEnv("REALROBO_WALLET_OPERATOR_ID", "");
    expect(getRealRoboWalletOperatorId()).toBe(11);
  });

  it("selects Amazon (17) from env", () => {
    vi.stubEnv("REALROBO_WALLET_OPERATOR_ID", "17");
    expect(getRealRoboWalletOperatorId()).toBe(17);
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
    setRealRoboLapuBalanceForTests(17, 5000);

    await performRealRoboRecharge("9999999999", "Jio", 199, "RJ", "123456");

    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.searchParams.get("operator_id")).toBe("17");
    expect(url.searchParams.get("sub_operator_id")).toBe("2215673867");
    expect(url.searchParams.get("lapu_id")).toBe("632505");
  });
});

describe("Airtel Money lapu low-balance fallback to Amazon", () => {
  const mockFetch = (lapuBalance: number) => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) => {
        urls.push(String(u));
        if (String(u).includes("/api/lapu_balance")) {
          return new Response(
            JSON.stringify({ status: true, msg: "Success.", data: { lapu_no: "+91x", balance: lapuBalance } }),
          );
        }
        return new Response(JSON.stringify({ status: "success", txid: "1", message: "ok" }));
      }),
    );
    return urls;
  };

  const setup = () => {
    vi.stubEnv("REALROBO_API_TOKEN", "test-token");
    vi.stubEnv("REALROBO_WALLET_OPERATOR_ID", "");
    vi.stubEnv("REALROBO_AMAZON_LAPU_ID", "632505");
    vi.stubEnv("REALROBO_LAPU_ID", "airtel-lapu");
    vi.stubEnv("REALROBO_MIN_LAPU_BALANCE", "");
    vi.stubEnv("REALROBO_AMAZON_MIN_LAPU_BALANCE", "");
    vi.stubEnv("REALROBO_AIRTEL_MONEY_SUB_OPERATOR_ID", "");
  };

  it("stays on Airtel Money when balance >= 200", async () => {
    setup();
    setRealRoboLapuBalanceForTests(11, 450);
    expect(await resolveRealRoboWalletOperatorId(50)).toBe(11);
  });

  it("falls back to Amazon when balance < 200", async () => {
    setup();
    setRealRoboLapuBalanceForTests(11, 112);
    expect(await resolveRealRoboWalletOperatorId(11)).toBe(17);
  });

  it("falls back when balance can't cover the amount", async () => {
    setup();
    setRealRoboLapuBalanceForTests(11, 300);
    expect(await resolveRealRoboWalletOperatorId(399)).toBe(17);
  });

  it("respects REALROBO_MIN_LAPU_BALANCE", async () => {
    setup();
    vi.stubEnv("REALROBO_MIN_LAPU_BALANCE", "500");
    setRealRoboLapuBalanceForTests(11, 450);
    expect(await resolveRealRoboWalletOperatorId(10)).toBe(17);
  });

  it("still honours the legacy REALROBO_AMAZON_MIN_LAPU_BALANCE", async () => {
    setup();
    vi.stubEnv("REALROBO_MIN_LAPU_BALANCE", undefined as unknown as string);
    vi.stubEnv("REALROBO_AMAZON_MIN_LAPU_BALANCE", "500");
    setRealRoboLapuBalanceForTests(11, 450);
    expect(await resolveRealRoboWalletOperatorId(10)).toBe(17);
  });

  it("checks the Airtel balance first when unknown, then sends via Amazon with Amazon codes", async () => {
    setup();
    const urls = mockFetch(112);
    await performRealRoboRecharge("9999999999", "Jio", 11, "HP", "123");
    expect(urls[0]).toContain("/api/lapu_balance");
    expect(urls[0]).toContain("lapu_id=airtel-lapu");
    const rech = new URL(urls[1]);
    expect(rech.searchParams.get("operator_id")).toBe("17");
    expect(rech.searchParams.get("sub_operator_id")).toBe("2215673867");
    expect(rech.searchParams.get("lapu_id")).toBe("632505");
  });

  it("sends via Airtel Money with Airtel codes when the balance is fine", async () => {
    setup();
    const urls = mockFetch(5000);
    await performRealRoboRecharge("9685758965", "Vi", 179, "MP", "125");
    const rech = new URL(urls.find((u) => u.includes("/api/recharge"))!);
    expect(rech.searchParams.get("operator_id")).toBe("11");
    expect(rech.searchParams.get("lapu_id")).toBe("airtel-lapu");
  });

  it("re-checks the Airtel balance after every recharge and switches back once topped up", async () => {
    setup();
    setRealRoboLapuBalanceForTests(11, 112);
    const urls = mockFetch(1000); // lapu topped up
    await performRealRoboRecharge("9999999999", "Jio", 11, "HP", "124");
    expect(new URL(urls[0]).searchParams.get("operator_id")).toBe("17");
    await vi.waitFor(() => expect(urls.some((u) => u.includes("/api/lapu_balance"))).toBe(true));
    await vi.waitFor(async () => expect(await resolveRealRoboWalletOperatorId(11)).toBe(11));
  });

  it("keeps Airtel Money if the balance check fails", async () => {
    setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    expect(await resolveRealRoboWalletOperatorId(11)).toBe(11);
  });

  it("keeps Airtel Money when no Airtel lapu_id is configured (balance can't be checked)", async () => {
    setup();
    vi.stubEnv("REALROBO_LAPU_ID", "");
    const urls = mockFetch(0);
    expect(await resolveRealRoboWalletOperatorId(11)).toBe(11);
    expect(urls).toHaveLength(0);
  });

  it("uses Airtel Money as fallback when Amazon is configured primary", async () => {
    setup();
    vi.stubEnv("REALROBO_WALLET_OPERATOR_ID", "17");
    setRealRoboLapuBalanceForTests(17, 50);
    expect(await resolveRealRoboWalletOperatorId(11)).toBe(11);
  });
});

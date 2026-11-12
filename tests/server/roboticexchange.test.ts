import { describe, expect, it } from "vitest";
import { parseRechargeProviderResponse } from "../../packages/server/src/recharge-gateway";
import {
  classifyRoboticExchangeResponse,
  getRoboticExchangeCircleCode,
  getRoboticExchangeOperatorCode,
} from "../../packages/server/src/roboticexchange";

describe("Robotic Exchange operator mapping", () => {
  it.each([
    ["Airtel", "AT"],
    ["Jio", "JO"],
    ["Reliance Jio", "JO"],
    ["VI", "VI"],
    ["Vodafone Idea", "VI"],
    ["BSNL", "BS"],
    ["Airtel DTH", "AD"],
    ["Dish TV", "DT"],
    ["Tata Play", "TS"],
    ["Videocon D2H", "VD"],
    ["Sun Direct", "SD"],
  ])("%s → %s", (name, code) => {
    expect(getRoboticExchangeOperatorCode(name)).toBe(code);
  });

  it("rejects unsupported operators", () => {
    expect(() => getRoboticExchangeOperatorCode("Airtel Money")).toThrow();
  });
});

describe("Robotic Exchange circle mapping", () => {
  it.each([
    ["DL", "10"],
    ["HP", "03"],
    ["UPE", "54"],
    ["UPW", "97"],
    ["CN", "40"],
    ["03", "03"],
  ])("%s → %s", (circle, code) => {
    expect(getRoboticExchangeCircleCode(circle)).toBe(code);
  });

  it("falls back to All (50) when missing or unknown", () => {
    expect(getRoboticExchangeCircleCode(undefined)).toBe("50");
    expect(getRoboticExchangeCircleCode("XX")).toBe("50");
  });
});

describe("Robotic Exchange response handling", () => {
  it("classifies STATUS 1/2/3", () => {
    expect(classifyRoboticExchangeResponse({ ERROR: "0", STATUS: 1 })).toBe("SUCCESS");
    expect(classifyRoboticExchangeResponse({ ERROR: "1", STATUS: 2 })).toBe("PENDING");
    expect(classifyRoboticExchangeResponse({ ERROR: "1", STATUS: 3 })).toBe("FAILED");
  });

  it("keeps duplicate / no-record / processed errors pending", () => {
    for (const code of ["16", "26", "27", "30"]) {
      expect(classifyRoboticExchangeResponse({ ERROR: code, STATUS: 3 })).toBe("PENDING");
    }
  });

  it("treats a missing STATUS as pending", () => {
    expect(classifyRoboticExchangeResponse({})).toBe("PENDING");
  });

  it("refunds on a real failure and includes the error code", () => {
    const parsed = parseRechargeProviderResponse(
      "ROBOTICEXCHANGE",
      {
        ERROR: "25",
        STATUS: 3,
        ORDERID: "0",
        MESSAGE: "Stock not available for this margin.",
      },
      "123",
    );
    expect(parsed.finalStatus).toBe("FAILED");
    expect(parsed.shouldRefund).toBe(true);
    expect(parsed.apiMessage).toBe("Stock not available for this margin. (error 25)");
    expect(parsed.apiReferenceId).toBe("[ORDER_ID: ] [TX_ID: 123]");
  });

  it("records operator txn and order IDs on success", () => {
    const parsed = parseRechargeProviderResponse(
      "ROBOTICEXCHANGE",
      {
        ERROR: "0",
        STATUS: 1,
        ORDERID: "111602444",
        OPTRANSID: "MH12241930000485",
        MESSAGE: "Customer Balance Recharge Successfully",
      },
      "123",
    );
    expect(parsed.finalStatus).toBe("SUCCESS");
    expect(parsed.shouldRefund).toBe(false);
    expect(parsed.apiReferenceId).toBe("MH12241930000485 [ORDER_ID: 111602444] [TX_ID: 123]");
  });
});

import { describe, expect, it } from "vitest";

import { mapA1OperatorCode } from "@repo/server/a1topup";

describe("mapA1OperatorCode", () => {
  it("maps mobile operators used in commission rules", () => {
    expect(mapA1OperatorCode("Airtel")).toBe("A");
    expect(mapA1OperatorCode("Jio")).toBe("RC");
    expect(mapA1OperatorCode("Vi")).toBe("V");
    expect(mapA1OperatorCode("Idea")).toBe("I");
  });

  it("maps BSNL prepaid recharge to BT (topup), not STV", () => {
    expect(mapA1OperatorCode("BSNL Recharge")).toBe("BT");
    expect(mapA1OperatorCode("BSNL Topup")).toBe("BT");
  });

  it("maps BSNL STV variants to BR", () => {
    expect(mapA1OperatorCode("BSNL STV")).toBe("BR");
    expect(mapA1OperatorCode("BSNL - STV")).toBe("BR");
  });
});

import { describe, expect, it } from "vitest";

import {
  mapPlanapiCircleCode,
  mapPlanapiOperatorKey,
  matchConfiguredCircle,
  matchConfiguredOperator,
} from "../../packages/shared/src/planapi-mapping";

describe("planapi mapping", () => {
  it("maps planapi opcode to internal operator keys", () => {
    expect(mapPlanapiOperatorKey("2", "AIRTEL")).toBe("AIRTEL");
    expect(mapPlanapiOperatorKey("11", "RELIANCE JIO")).toBe("JIO");
    expect(mapPlanapiOperatorKey("23", "VODAFONE")).toBe("VI");
    expect(mapPlanapiOperatorKey("6", "IDEA")).toBe("VI");
  });

  it("maps planapi circle code 70 to RJ", () => {
    expect(mapPlanapiCircleCode("70", "Rajasthan")).toBe("RJ");
    expect(mapPlanapiCircleCode(null, "Delhi")).toBe("DL");
    expect(mapPlanapiCircleCode("54", null)).toBe("UPE");
  });

  it("matches configured commission rule operators", () => {
    const configured = ["AIRTEL", "Jio Prepaid", "Vi", "BSNL Topup"];
    expect(matchConfiguredOperator("AIRTEL", configured)).toBe("AIRTEL");
    expect(matchConfiguredOperator("JIO", configured)).toBe("Jio Prepaid");
    expect(matchConfiguredOperator("VI", configured)).toBe("Vi");
    expect(matchConfiguredOperator("BSNL", configured)).toBe("BSNL Topup");
  });

  it("picks provider-supported circle with fallbacks", () => {
    const realRoboCircles = [
      "AP",
      "DL",
      "MH",
      "MP",
      "RJ",
      "UPE",
      "UPW",
    ];
    expect(matchConfiguredCircle("RJ", realRoboCircles)).toBe("RJ");
    expect(matchConfiguredCircle("CG", realRoboCircles)).toBe("MP");
    expect(matchConfiguredCircle("UP", realRoboCircles)).toBe("UPW");
  });
});

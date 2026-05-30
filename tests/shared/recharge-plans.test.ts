import { describe, expect, it } from "vitest";

import {
  countPlansInCatalog,
  normalizePlanapiPlansPayload,
} from "../../packages/shared/src/recharge-plans";
import {
  mapInternalOperatorToPlanapiOpCode,
  resolvePlanapiCircleCode,
} from "../../packages/shared/src/planapi-mapping";

describe("recharge plans", () => {
  it("normalizes planapi RDATA categories", () => {
    const catalog = normalizePlanapiPlansPayload({
      operator: "Jio",
      circle: "Delhi",
      rdata: {
        "Full Talktime": [
          { rs: 100, validity: "28 days", desc: "Unlimited voice" },
          { rs: "50", validity: "7 days", desc: "Data pack" },
        ],
        meta: "ignored",
      },
    });

    expect(catalog.categories).toHaveLength(1);
    expect(catalog.categories[0]?.name).toBe("Full Talktime");
    expect(catalog.categories[0]?.plans).toEqual([
      {
        amount: 50,
        validity: "7 days",
        description: "Data pack",
        type: undefined,
      },
      {
        amount: 100,
        validity: "28 days",
        description: "Unlimited voice",
        type: undefined,
      },
    ]);
    expect(countPlansInCatalog(catalog)).toBe(2);
  });

  it("maps internal operator and circle to planapi codes", () => {
    expect(mapInternalOperatorToPlanapiOpCode("Jio Prepaid")).toBe("11");
    expect(mapInternalOperatorToPlanapiOpCode("AIRTEL")).toBe("2");
    expect(
      resolvePlanapiCircleCode({
        internalCircleCode: "DL",
      }),
    ).toBe("10");
    expect(
      resolvePlanapiCircleCode({
        planapiCircleCode: "10",
        internalCircleCode: "RJ",
      }),
    ).toBe("10");
  });
});

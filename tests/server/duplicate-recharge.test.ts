import { describe, expect, it } from "vitest";
import {
  isDuplicateRechargeExempt,
  istDayBounds,
} from "../../packages/server/src/duplicate-recharge";

describe("same-day duplicate recharge rule", () => {
  it.each(["BSNL", "bsnl", "BSNL Prepaid", "BSNL Topup", "BSNL STV"])(
    "%s is exempt",
    (op) => expect(isDuplicateRechargeExempt(op)).toBe(true),
  );

  it.each(["Jio", "Airtel", "Vi", "Vodafone Idea", "Tata Play", "Airtel Postpaid"])(
    "%s is not exempt",
    (op) => expect(isDuplicateRechargeExempt(op)).toBe(false),
  );

  it("uses the India calendar day, not UTC", () => {
    // 2026-10-18 23:00 UTC = 2026-10-19 04:30 IST → IST day is 19 Oct
    const { start, end } = istDayBounds(new Date("2026-10-18T23:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-18T18:30:00.000Z"); // 19 Oct 00:00 IST
    expect(end.toISOString()).toBe("2026-10-19T18:30:00.000Z"); // 20 Oct 00:00 IST
  });

  it("an IST morning and the previous IST evening are different days", () => {
    const evening = istDayBounds(new Date("2026-10-18T17:00:00Z")); // 18 Oct 22:30 IST
    const morning = istDayBounds(new Date("2026-10-18T19:00:00Z")); // 19 Oct 00:30 IST
    expect(evening.end.getTime()).toBe(morning.start.getTime());
  });
});

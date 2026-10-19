/**
 * Same-day duplicate recharge rule.
 *
 * A retailer may not recharge the same number twice on the same India (IST)
 * calendar day while an earlier recharge is SUCCESS or PENDING.
 * BSNL is exempt: a ₹10 top-up on top of a plan is often required.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const DUPLICATE_RECHARGE_BLOCKING_STATUSES = ["SUCCESS", "PENDING"] as const;

export const DUPLICATE_RECHARGE_ERROR =
  "This number was already recharged today. Duplicate recharges are not allowed (except BSNL).";

/** BSNL (prepaid, top-up, STV…) may be recharged more than once a day. */
export function isDuplicateRechargeExempt(operator: string): boolean {
  return /\bbsnl\b/i.test(operator);
}

/** [start, end) of the IST calendar day containing `now`, as UTC Dates. */
export function istDayBounds(now: Date = new Date()): { start: Date; end: Date } {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const startUtcMs =
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS;
  return { start: new Date(startUtcMs), end: new Date(startUtcMs + 24 * 60 * 60 * 1000) };
}

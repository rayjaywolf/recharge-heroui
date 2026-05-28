import { describe, expect, it } from "vitest";

import {
  isAccountApproved,
  isAccountPending,
  isAccountRejected,
  isAccountSuspended,
} from "@/lib/account-status";

describe("account status helpers", () => {
  it("recognizes each exclusive status", () => {
    expect(isAccountPending("PENDING")).toBe(true);
    expect(isAccountApproved("APPROVED")).toBe(true);
    expect(isAccountRejected("REJECTED")).toBe(true);
    expect(isAccountSuspended("SUSPENDED")).toBe(true);
  });

  it("does not treat statuses as overlapping", () => {
    expect(isAccountApproved("PENDING")).toBe(false);
    expect(isAccountPending("APPROVED")).toBe(false);
    expect(isAccountSuspended("REJECTED")).toBe(false);
  });
});

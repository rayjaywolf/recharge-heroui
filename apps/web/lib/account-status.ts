import type { AccountStatus } from "@repo/db";

export function isAccountSuspended(status: AccountStatus): boolean {
  return status === "SUSPENDED";
}

export function isAccountRejected(status: AccountStatus): boolean {
  return status === "REJECTED";
}

export function isAccountApproved(status: AccountStatus): boolean {
  return status === "APPROVED";
}

export function isAccountPending(status: AccountStatus): boolean {
  return status === "PENDING";
}

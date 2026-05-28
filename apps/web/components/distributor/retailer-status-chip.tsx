import { Chip } from "@heroui/react";
import type { AccountStatus } from "@repo/db";

export function RetailerStatusChip({
  accountStatus,
}: {
  accountStatus: AccountStatus;
}) {
  if (accountStatus === "SUSPENDED") {
    return (
      <Chip size="sm" variant="soft">
        Suspended
      </Chip>
    );
  }

  if (accountStatus === "REJECTED") {
    return (
      <Chip color="danger" size="sm" variant="soft">
        Rejected
      </Chip>
    );
  }

  if (accountStatus === "PENDING") {
    return (
      <Chip color="warning" size="sm" variant="soft">
        Pending KYC
      </Chip>
    );
  }

  return (
    <Chip color="success" size="sm" variant="soft">
      Active
    </Chip>
  );
}

export function retailerCanReceiveFunds({
  accountStatus,
}: {
  accountStatus: AccountStatus;
}) {
  return accountStatus === "APPROVED";
}

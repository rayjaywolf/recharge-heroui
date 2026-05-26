import { Chip } from "@heroui/react";

export function RetailerStatusChip({
  isSuspended,
  isApproved,
  isRejected,
}: {
  isSuspended: boolean;
  isApproved: boolean;
  isRejected: boolean;
}) {
  if (isSuspended) {
    return (
      <Chip size="sm" variant="soft">
        Suspended
      </Chip>
    );
  }

  if (isRejected) {
    return (
      <Chip color="danger" size="sm" variant="soft">
        Rejected
      </Chip>
    );
  }

  if (!isApproved) {
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
  isSuspended,
  isApproved,
  isRejected,
}: {
  isSuspended: boolean;
  isApproved: boolean;
  isRejected: boolean;
}) {
  return !isSuspended && !isRejected && isApproved;
}

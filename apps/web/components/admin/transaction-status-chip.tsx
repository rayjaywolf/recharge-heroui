import { Chip } from "@heroui/react";

type TxStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

const STATUS_COLOR: Record<
  TxStatus,
  "success" | "danger" | "warning" | "default"
> = {
  SUCCESS: "success",
  FAILED: "danger",
  REFUNDED: "danger",
  PENDING: "warning",
};

export function TransactionStatusChip({ status }: { status: string }) {
  const color =
    STATUS_COLOR[status as TxStatus] ?? ("default" as const);

  return (
    <Chip color={color} size="sm" variant="soft">
      {status}
    </Chip>
  );
}

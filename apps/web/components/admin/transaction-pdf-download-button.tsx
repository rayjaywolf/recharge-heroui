"use client";

import { Download } from "lucide-react";
import { Button } from "@heroui/react";

import type { AdminTransactionRow } from "@/components/admin/transactions-table";
import { downloadTransactionPdf } from "@/lib/transaction-pdf-export";

export function TransactionPdfDownloadButton({
  transaction,
  size = "sm",
  showLabel = false,
}: {
  transaction: AdminTransactionRow;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  return (
    <Button
      aria-label={`Download PDF for transaction ${transaction.id}`}
      className="gap-1.5"
      size={size}
      variant="secondary"
      onPress={() => downloadTransactionPdf(transaction)}
    >
      <Download className="size-4 shrink-0" aria-hidden />
      {showLabel ? "Download PDF" : null}
    </Button>
  );
}

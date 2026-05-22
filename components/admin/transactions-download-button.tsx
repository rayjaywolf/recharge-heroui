"use client";

import { Download } from "lucide-react";
import { Button } from "@heroui/react";

import { exportTransactions, type BaseTransactionData } from "@/lib/excel-export";

import type { AdminTransactionRow } from "@/components/admin/transactions-table";

export function TransactionsDownloadButton({
  data,
  fileName,
}: {
  data: AdminTransactionRow[];
  fileName?: string;
}) {
  const handleDownload = () => {
    const exportData: BaseTransactionData[] = data.map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      amount: tx.amount,
      status: tx.status,
      operator: tx.operator,
      provider: tx.provider,
      targetPhone: tx.targetPhone,
      apiReferenceId: tx.apiReferenceId ?? undefined,
      apiMessage: tx.apiMessage ?? undefined,
      retailerCommission: tx.retailerCommission,
      distributorCommission: tx.distributorCommission,
      adminCommission: tx.adminCommission,
      user: {
        name: tx.user.name,
        email: tx.user.email,
      },
    }));

    exportTransactions(exportData, fileName);
  };

  return (
    <Button
      className="gap-2"
      size="sm"
      variant="secondary"
      onPress={handleDownload}
    >
      <Download className="size-4" aria-hidden />
      Download Excel
    </Button>
  );
}

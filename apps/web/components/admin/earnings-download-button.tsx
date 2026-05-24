"use client";

import { Download } from "lucide-react";
import { Button } from "@heroui/react";

import {
  exportAdminEarnings,
  type BaseTransactionData,
} from "@/lib/excel-export";

export type AdminEarningRow = {
  id: string;
  createdAt: string;
  amount: number;
  status: string;
  operator: string;
  adminCommission: number;
  user: {
    name: string;
    email: string;
  };
};

export function EarningsDownloadButton({
  data,
  fileName,
}: {
  data: AdminEarningRow[];
  fileName?: string;
}) {
  const handleDownload = () => {
    const exportData: BaseTransactionData[] = data.map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      amount: tx.amount,
      status: tx.status,
      operator: tx.operator,
      adminCommission: tx.adminCommission,
      user: tx.user,
    }));

    exportAdminEarnings(exportData, fileName);
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

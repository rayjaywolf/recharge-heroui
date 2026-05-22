"use client";

import { Download } from "lucide-react";
import { Button } from "@heroui/react";

import { exportFunding, type FundingData } from "@/lib/excel-export";

export type FundingLedgerRow = {
  id: string;
  createdAt: string;
  amount: number;
  operator: string;
  apiMessage: string | null;
  user: {
    name: string;
    email: string;
    phoneNumber: string | null;
    whatsappNumber: string | null;
  };
};

export function FundingDownloadButton({
  data,
  fileName,
}: {
  data: FundingLedgerRow[];
  fileName?: string;
}) {
  const handleDownload = () => {
    const exportData: FundingData[] = data.map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      amount: tx.amount,
      type: tx.operator,
      notes: tx.apiMessage ?? undefined,
      user: {
        name: tx.user.name,
        email: tx.user.email,
      },
    }));

    exportFunding(exportData, fileName);
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

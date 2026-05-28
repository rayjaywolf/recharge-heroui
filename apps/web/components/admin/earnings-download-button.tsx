"use client";

import { Download } from "lucide-react";
import { Button } from "@heroui/react";

import {
  exportAdminEarnings,
  exportDistributorEarnings,
  exportRetailerEarnings,
  type BaseTransactionData,
} from "@/lib/excel-export";

export type EarningRow = {
  id: string;
  createdAt: string;
  amount: number;
  status: string;
  operator: string;
  targetPhone?: string;
  commission: number;
  user: {
    name: string;
    email: string;
  };
};

/** @deprecated Use EarningRow */
export type AdminEarningRow = EarningRow & { adminCommission: number };

export function EarningsDownloadButton({
  data,
  fileName,
  variant = "admin",
}: {
  data: EarningRow[];
  fileName?: string;
  variant?: "admin" | "distributor" | "retailer";
}) {
  const handleDownload = () => {
    const exportData: BaseTransactionData[] = data.map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      amount: tx.amount,
      status: tx.status,
      operator: tx.operator,
      targetPhone: tx.targetPhone,
      adminCommission: variant === "admin" ? tx.commission : undefined,
      distributorCommission:
        variant === "distributor" ? tx.commission : undefined,
      retailerCommission: variant === "retailer" ? tx.commission : undefined,
      commission:
        variant === "distributor" || variant === "retailer"
          ? tx.commission
          : undefined,
      user: tx.user,
    }));

    if (variant === "distributor") {
      exportDistributorEarnings(exportData, fileName);
    } else if (variant === "retailer") {
      exportRetailerEarnings(exportData, fileName);
    } else {
      exportAdminEarnings(exportData, fileName);
    }
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

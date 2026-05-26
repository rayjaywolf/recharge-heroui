"use client";

import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";

import {
  downloadRechargeReceiptPdf,
  type RechargeReceiptInput,
} from "@/lib/transaction-pdf-export";

export function RechargeConfirmationActions({
  rechargeHref,
  ledgerHref,
  receipt,
}: {
  rechargeHref: string;
  ledgerHref: string;
  receipt?: RechargeReceiptInput | null;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-3 pt-2">
      <Button variant="primary" onPress={() => router.push(rechargeHref)}>
        Do another recharge
      </Button>
      <Button variant="secondary" onPress={() => router.push(ledgerHref)}>
        View ledger
      </Button>
      {receipt ? (
        <Button
          className="gap-1.5"
          variant="secondary"
          onPress={() => downloadRechargeReceiptPdf(receipt)}
        >
          <Download className="size-4 shrink-0" aria-hidden />
          Download receipt
        </Button>
      ) : null}
    </div>
  );
}

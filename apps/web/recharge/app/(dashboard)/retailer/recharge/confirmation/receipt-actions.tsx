"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

export function ReceiptActions() {
  return (
    <div className="flex gap-3 pt-2 flex-wrap">
      <Button asChild className="select-none">
        <Link href="/retailer/recharge">Do Another Recharge</Link>
      </Button>
      <Button asChild variant="outline" className="select-none">
        <Link href="/retailer/ledger">View Ledger</Link>
      </Button>
    </div>
  )
}

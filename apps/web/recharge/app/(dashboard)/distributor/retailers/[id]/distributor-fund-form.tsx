"use client"

import React, { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export function DistributorFundForm({ retailerId, disabled }: { retailerId: string, disabled: boolean }) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [remarks, setRemarks] = useState("")
  const [idempotencyKey, setIdempotencyKey] = useState("")
  const isSubmitting = useRef(false)
  const router = useRouter()

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID())
  }, [])

  const handleFund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return;
    const numAmt = parseInt(amount);
    if (isNaN(numAmt) || numAmt <= 0) return alert("Invalid amount");
    
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true)

    try {
      const res = await fetch("/api/distributor/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: retailerId, amount: numAmt, remarks, idempotencyKey }),
      })
      
      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Failed to transfer funds");
      }
      alert("Transfer successful!");
      setAmount("");
      setRemarks("");
      setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    } catch (e: any) {
      alert(e.message);
      setIdempotencyKey(crypto.randomUUID());
    } finally {
      isSubmitting.current = false;
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Funds</CardTitle>
        <CardDescription>Instantly transfer wallet balance to this retailer.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFund} className="space-y-6">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">Amount (₹)</label>
            <Input
              required
              type="number"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">Remarks (Optional)</label>
            <Input
              placeholder="Payment reference"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={disabled}
            />
          </div>
          <Button type="submit" className="w-full mt-2" disabled={disabled || loading}>
            {loading ? "Processing..." : "Transfer Funds"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

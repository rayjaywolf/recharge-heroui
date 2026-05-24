"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { ChevronDown, Loader2 } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

export function RechargeForm({
  availableOperators,
}: {
  availableOperators: string[]
}) {
  const [phone, setPhone] = useState("")
  const [operator, setOperator] = useState("")
  const [amount, setAmount] = useState("")
  const [circleCode, setCircleCode] = useState("")
  const [provider, setProvider] = useState("TEST")
  const [loading, setLoading] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState("")
  const isSubmitting = React.useRef(false)
  const router = useRouter()
  const isMobile = useIsMobile()
  const [providerOpen, setProviderOpen] = useState(false)
  const [operatorOpen, setOperatorOpen] = useState(false)

  // Polyfill for crypto.randomUUID() in mobile/Capacitor environments
  const generateUUID = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    // Fallback for environments without crypto.randomUUID
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0
        const v = c == "x" ? r : (r & 0x3) | 0x8
        return v.toString(16)
      }
    )
  }

  React.useEffect(() => {
    setIdempotencyKey(generateUUID())
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numericAmount = Number(amount)
    if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
      alert("Gateway explicitly requires mathematically whole integer amounts.")
      return
    }

    if (isSubmitting.current) return // Instantly lock to catch rapid clicks
    isSubmitting.current = true
    setLoading(true)

    try {
      const res = await fetch("/api/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          operator,
          amount: Number(amount),
          circleCode: circleCode || undefined,
          idempotencyKey,
          provider,
        }),
      })

      const data = await res.json()

      // Regenerate to secure back-navigation idempotency
      setIdempotencyKey(generateUUID())

      const params = new URLSearchParams({
        status: res.ok ? "success" : "failed",
        message: res.ok
          ? data.message || "Recharge completed successfully"
          : data.error || "Failed to process recharge",
        phone,
        operator,
        amount,
        referenceId: data?.transaction?.apiReferenceId || "",
        apiMessage: data?.transaction?.apiMessage || "",
      })

      router.push(`/retailer/recharge/confirmation?${params.toString()}`)
      router.refresh()
    } catch {
      // Regeneration to permit retry on strict failure
      setIdempotencyKey(generateUUID())
      const params = new URLSearchParams({
        status: "failed",
        message: "An unexpected error occurred. Please try again.",
        phone,
        operator,
        amount,
        apiMessage: "",
      })
      router.push(`/retailer/recharge/confirmation?${params.toString()}`)
    } finally {
      isSubmitting.current = false
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full gap-4">
      <div className="grid gap-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="number"
          inputMode="decimal"
          placeholder="9876543210"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="provider">Provider</Label>
        <input type="hidden" name="provider" value={provider} required />
        {isMobile ? (
          <Drawer open={providerOpen} onOpenChange={setProviderOpen}>
            <DrawerTrigger asChild>
              <Button
                id="provider"
                type="button"
                variant="outline"
                className="w-full justify-between font-normal select-none"
              >
                {provider === "TEST"
                  ? "Test (simulated)"
                  : provider === "REALROBO"
                    ? "RealRobo"
                    : provider === "MROBOTICS"
                      ? "MRobotics"
                      : "A1TopUp"}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Select Provider</DrawerTitle>
                <DrawerDescription>Choose the recharge provider gateway.</DrawerDescription>
              </DrawerHeader>
              <div className="p-4 grid gap-2">
                <Button variant="outline" className="select-none" onClick={() => { setProvider("TEST"); setProviderOpen(false) }}>Test (simulated)</Button>
                <Button variant="outline" className="select-none" onClick={() => { setProvider("REALROBO"); setProviderOpen(false) }}>RealRobo</Button>
                <Button variant="outline" className="select-none" onClick={() => { setProvider("MROBOTICS"); setProviderOpen(false) }}>MRobotics</Button>
                <Button variant="outline" className="select-none" onClick={() => { setProvider("A1TOPUP"); setProviderOpen(false) }}>A1TopUp</Button>
              </div>
              <DrawerFooter className="pt-2">
                <DrawerClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          <DropdownMenu open={providerOpen} onOpenChange={setProviderOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                id="provider"
                type="button"
                variant="outline"
                className="w-full justify-between font-normal select-none"
              >
                {provider === "TEST"
                  ? "Test (simulated)"
                  : provider === "REALROBO"
                    ? "RealRobo"
                    : provider === "MROBOTICS"
                      ? "MRobotics"
                      : "A1TopUp"}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
              <DropdownMenuItem onSelect={() => setProvider("TEST")}>
                Test (simulated)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setProvider("REALROBO")}>
                RealRobo
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setProvider("MROBOTICS")}>
                MRobotics
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setProvider("A1TOPUP")}>
                A1TopUp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="operator">Operator</Label>
        <input type="hidden" name="operator" value={operator} required />
        {isMobile ? (
          <Drawer open={operatorOpen} onOpenChange={setOperatorOpen}>
            <DrawerTrigger asChild>
              <Button
                id="operator"
                type="button"
                variant="outline"
                className="w-full justify-between font-normal select-none"
              >
                {operator ? operator : "Select an operator"}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Select Operator</DrawerTitle>
                <DrawerDescription>Choose the operator for the recharge.</DrawerDescription>
              </DrawerHeader>
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-2 overflow-y-auto max-h-[50vh]">
                {availableOperators.map((item) => (
                  <Button
                    key={item}
                    variant="outline"
                    className="justify-start select-none"
                    onClick={() => { setOperator(item); setOperatorOpen(false); }}
                  >
                    {item}
                  </Button>
                ))}
              </div>
              <DrawerFooter className="pt-2">
                <DrawerClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          <DropdownMenu open={operatorOpen} onOpenChange={setOperatorOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                id="operator"
                type="button"
                variant="outline"
                className="w-full justify-between font-normal select-none"
              >
                {operator ? operator : "Select an operator"}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] max-h-[300px] overflow-y-auto">
              {availableOperators.map((item) => (
                <DropdownMenuItem key={item} onSelect={() => setOperator(item)}>
                  {item}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="amount">Amount (₹)</Label>
        <Input
          id="amount"
          type="number"
          inputMode="decimal"
          min="1"
          placeholder="100"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="circleCode">Circle Code (Optional)</Label>
        <Input
          id="circleCode"
          type="text"
          placeholder="e.g., DL, MH, GJ"
          value={circleCode}
          onChange={(e) => setCircleCode(e.target.value.toUpperCase())}
        />
        <p className="text-xs text-muted-foreground">
          Enter circle code if required (e.g., DL for Delhi, MH for Maharashtra)
        </p>
      </div>

      <Button className="mt-2 w-full select-none" type="submit" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Initiate Recharge
      </Button>
    </form>
  )
}

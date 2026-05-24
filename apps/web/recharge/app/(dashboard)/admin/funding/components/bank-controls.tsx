"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Landmark,
  ArrowDownToDot,
  ArrowUpFromDot,
} from "lucide-react"
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone"

type UserInfo = {
  id: string
  name: string
  email: string
  phoneNumber: string | null
  whatsappNumber: string | null
  balance: number
  role: string
}

export function BankControls({ users }: { users: UserInfo[] }) {
  const [activeTab, setActiveTab] = useState<"credit" | "debit">("credit")
  const [userId, setUserId] = useState("")
  const [amount, setAmount] = useState("")
  const [remarks, setRemarks] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    text: string
    type: "error" | "success"
  } | null>(null)
  const router = useRouter()

  const selectedUser = users.find((r) => r.id === userId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: Number(amount),
          actionType: activeTab,
          remarks: remarks.trim() === "" ? undefined : remarks.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({
          text: data.error || "Bank request failed.",
          type: "error",
        })
      } else {
        setMessage({
          text: data.message || "Transaction committed successfully!",
          type: "success",
        })
        setAmount("")
        setRemarks("")
        router.refresh()
      }
    } catch (err) {
      setMessage({ text: "An unexpected error occurred.", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="mb-4 flex w-full rounded-md bg-muted p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("credit")
              setMessage(null)
            }}
            className={`flex flex-1 items-center justify-center rounded-md py-1.5 text-sm font-medium transition-all ${activeTab === "credit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ArrowDownToDot className="mr-2 h-4 w-4 text-emerald-500" />
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("debit")
              setMessage(null)
            }}
            className={`flex flex-1 items-center justify-center rounded-md py-1.5 text-sm font-medium transition-all ${activeTab === "debit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ArrowUpFromDot className="mr-2 h-4 w-4 text-red-500" />
            Remove
          </button>
        </div>

        <CardTitle>
          {activeTab === "credit" ? "Add Funds" : "Remove Funds"}
        </CardTitle>
        <CardDescription>
          {activeTab === "credit"
            ? "Add money to a user's wallet."
            : "Remove money from a user's wallet."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="bank-form" onSubmit={handleSubmit} className="grid gap-6">
          {message && (
            <Alert
              variant={message.type === "error" ? "destructive" : "default"}
            >
              {message.type === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertTitle>
                {message.type === "error" ? "Error" : "Success"}
              </AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="user">Select User</Label>
            <Select
              value={userId}
              onValueChange={(val) => {
                setUserId(val)
                setMessage(null)
              }}
              required
            >
              <SelectTrigger id="user">
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    No users available
                  </SelectItem>
                ) : (
                  users.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.role}) · {getDisplayPhone(r) ?? getDisplayEmail(r.email) ?? "—"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedUser && (
              <div className="mt-1 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                Current Balance:{" "}
                <span className="font-bold text-foreground">
                  ₹ {selectedUser.balance.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              placeholder="5000"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={
                activeTab === "debit"
                  ? "border-red-200 focus-visible:ring-red-200"
                  : "border-emerald-200 focus-visible:ring-emerald-200"
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="remarks">Notes (Optional)</Label>
            <Input
              id="remarks"
              type="text"
              placeholder="e.g. Paid via UPI on specific date..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          form="bank-form"
          className={`w-full ${activeTab === "debit" ? "bg-red-600 text-white hover:bg-red-700" : ""}`}
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Landmark className="mr-2 h-4 w-4" />
          )}
          {activeTab === "credit" ? "Add Funds" : "Remove Funds"}
        </Button>
      </CardFooter>
    </Card>
  )
}

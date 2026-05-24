"use client"

import { useState, type ReactNode } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone"
import { formatRechargeProvider } from "@/lib/recharge-provider"

export type AdminTransactionRow = {
  id: string
  userId: string
  targetPhone: string
  operator: string
  amount: number
  circleCode: string | null
  provider: string
  status: string
  apiReferenceId: string | null
  apiMessage: string | null
  idempotencyKey: string | null
  retailerCommission: number
  distributorCommission: number
  adminCommission: number
  createdAt: string
  updatedAt: string
  user: {
    name: string
    email: string
    phoneNumber: string | null
    whatsappNumber: string | null
  }
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={`text-sm break-all ${mono ? "font-mono text-xs" : "font-medium"}`}
      >
        {value ?? "—"}
      </p>
    </div>
  )
}

function statusBadgeClass(status: string) {
  if (status === "SUCCESS") return "bg-emerald-500/15 text-emerald-700"
  if (status === "FAILED" || status === "REFUNDED") return "bg-red-500/15 text-red-700"
  return "bg-amber-500/15 text-amber-700"
}

export function TransactionsTable({
  transactions,
}: {
  transactions: AdminTransactionRow[]
}) {
  const [selected, setSelected] = useState<AdminTransactionRow | null>(null)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    })

  return (
    <>
      <div className="max-h-[min(70vh,720px)] overflow-auto rounded-md border bg-card">
        <Table className="">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Retailer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>API</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ref ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-muted-foreground"
                >
                  No transactions match your filters.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow
                  key={tx.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(tx)}
                >
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {new Date(tx.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    <span className="text-xs">
                      {new Date(tx.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[120px] truncate text-sm font-semibold">
                      {tx.user.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[120px] truncate text-xs text-muted-foreground">
                      {getDisplayEmail(tx.user.email) ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold">{tx.operator}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs tracking-tight text-muted-foreground">
                      {tx.targetPhone}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-bold">
                    ₹{tx.amount.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {formatRechargeProvider(tx.provider)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div
                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(tx.status)}`}
                    >
                      {tx.status}
                    </div>
                  </TableCell>
                  <TableCell
                    className="max-w-[100px] truncate font-mono text-xs text-muted-foreground"
                    title={tx.apiReferenceId || tx.id}
                  >
                    {tx.apiReferenceId || tx.id}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>Transaction details</DialogTitle>
                <DialogDescription>
                  Full record for recharge to {selected.targetPhone}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(selected.status)}`}
                  >
                    {selected.status}
                  </span>
                  <span className="text-lg font-bold">
                    ₹{selected.amount.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="Date & time" value={formatDate(selected.createdAt)} />
                  <DetailItem
                    label="API gateway"
                    value={formatRechargeProvider(selected.provider)}
                  />
                  <DetailItem label="Carrier" value={selected.operator} />
                  <DetailItem label="Recharge phone" value={selected.targetPhone} mono />
                  <DetailItem label="Circle code" value={selected.circleCode} />
                  <DetailItem
                    label="Reference ID"
                    value={selected.apiReferenceId}
                    mono
                  />
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                  <p className="text-sm font-semibold">Retailer</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailItem label="Name" value={selected.user.name} />
                    <DetailItem
                      label="Phone"
                      value={getDisplayPhone(selected.user)}
                    />
                    <DetailItem
                      label="Email"
                      value={getDisplayEmail(selected.user.email)}
                    />
                    <DetailItem label="User ID" value={selected.userId} mono />
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                  <p className="text-sm font-semibold">Commissions (₹)</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <DetailItem
                      label="Retailer"
                      value={selected.retailerCommission.toLocaleString("en-IN")}
                    />
                    <DetailItem
                      label="Distributor"
                      value={selected.distributorCommission.toLocaleString("en-IN")}
                    />
                    <DetailItem
                      label="Admin"
                      value={selected.adminCommission.toLocaleString("en-IN")}
                    />
                  </div>
                </div>

                <div className="grid gap-4">
                  <DetailItem
                    label="API message"
                    value={selected.apiMessage || "—"}
                  />
                  <DetailItem
                    label="Idempotency key"
                    value={selected.idempotencyKey}
                    mono
                  />
                  <DetailItem
                    label="Transaction ID"
                    value={selected.id}
                    mono
                  />
                  <DetailItem
                    label="Last updated"
                    value={formatDate(selected.updatedAt)}
                  />
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

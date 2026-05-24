import { auth, prisma } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { LedgerDownloadButton } from "./components/download-button"

export default async function DistributorLedgerPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user || user.role !== "DISTRIBUTOR") {
    redirect("/")
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const getStatusStyles = (status: string): string => {
    const normalized = status.toUpperCase()

    if (normalized === "SUCCESS")
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    if (normalized === "FAILED")
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
    if (normalized === "PENDING")
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    if (normalized === "REFUNDED")
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"

    return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300"
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
            <p className="mt-2 text-muted-foreground">
              Your overarching wallet and transaction history.
            </p>
          </div>
          <LedgerDownloadButton data={transactions} />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Operation Segment</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Message Reference</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No ledger history records found.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{tx.createdAt.toLocaleString()}</TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {tx.operator}
                  </TableCell>
                  <TableCell className="font-bold">
                    ₹{tx.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {tx.apiMessage || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusStyles(tx.status)}
                    >
                      {tx.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

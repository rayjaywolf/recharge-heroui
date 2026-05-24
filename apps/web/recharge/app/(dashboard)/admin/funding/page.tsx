import { auth, prisma } from "@/lib/auth"
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { BankControls } from "./components/bank-controls"
import { FundingDownloadButton } from "./components/download-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function BankControlPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== "ADMIN") {
    redirect("/retailer")
  }

  // Preload users for the Bank Controls Select menu
  const usersList = await prisma.user.findMany({
    where: { role: { in: ["RETAILER", "DISTRIBUTOR"] } },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      whatsappNumber: true,
      balance: true,
      role: true,
    },
    orderBy: { name: "asc" },
  })

  // Fetch only manual banking actions
  const bankLedger = await prisma.transaction.findMany({
    where: {
      operator: { in: ["MANUAL_CREDIT", "MANUAL_DEBIT"] },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phoneNumber: true,
          whatsappNumber: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="animate-in min-w-0 max-w-full space-y-6 duration-500 fade-in slide-in-from-bottom-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Funding</h1>
        <p className="mt-1 text-muted-foreground">
          Manage user balances and funding operations.
        </p>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        {/* Left Side: Actions */}
        <div className="min-w-0">
          <BankControls users={usersList} />
        </div>

        {/* Right Side: Ledger */}
        <div className="flex min-w-0 flex-col space-y-4">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Funding History</h2>
            <FundingDownloadButton data={bankLedger} />
          </div>
          <div className="min-w-0 max-h-[min(70vh,720px)] overflow-auto rounded-md border bg-card">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankLedger.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No funding actions recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  bankLedger.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{tx.createdAt.toLocaleDateString()}</span>
                          <span className="text-xs">
                            {tx.createdAt.toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate font-medium">
                        {tx.user.name}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-sm text-muted-foreground">
                        {getDisplayPhone(tx.user) ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                        {getDisplayEmail(tx.user.email) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div
                          className={`inline-block rounded-md p-1 px-2 font-bold ${tx.operator === "MANUAL_CREDIT" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                        >
                          {tx.operator === "MANUAL_CREDIT" ? "+" : "-"} ₹
                          {tx.amount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell
                        className="max-w-[180px] truncate text-xs text-muted-foreground"
                        title={tx.apiMessage || "No remarks applied."}
                      >
                        {tx.apiMessage || "No remarks"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}

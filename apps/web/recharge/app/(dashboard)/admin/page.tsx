import { auth, prisma } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CreditCard,
  ArrowRightLeft,
  Wallet,
  AlertCircle,
  Activity,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function AdminDashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== "ADMIN") {
    redirect("/retailer")
  }

  // Core Vital Signs Fetching
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // 1. Total System Balance (Your Liability)
  const totalLiabilityResult = await prisma.user.aggregate({
    _sum: { balance: true },
    where: { role: { in: ["RETAILER", "DISTRIBUTOR"] } },
  })
  const totalLiability = totalLiabilityResult._sum.balance || 0
  
  const distLiabilityResult = await prisma.user.aggregate({
    _sum: { balance: true },
    where: { role: "DISTRIBUTOR" },
  })
  const distLiability = distLiabilityResult._sum.balance || 0
  const retLiability = totalLiability - distLiability

  // 2. Today's Transaction Volume (Only completed/successful outbound recharges, ignore wallet drops)
  const todaysVolumeResult = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      status: "SUCCESS",
      createdAt: { gte: todayStart },
      operator: { not: "MANUAL_CREDIT" },
    },
  })
  const todaysVolume = todaysVolumeResult._sum.amount || 0

  // 3. Pending Transactions Alert (Stuck API calls)
  const pendingTransactions = await prisma.transaction.count({
    where: { status: "PENDING" },
  })

  // 4. Success Rate (Calculated from today's resolved non-manual transactions)
  const todaysResolvedTx = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: todayStart },
      operator: { not: "MANUAL_CREDIT" },
      status: { in: ["SUCCESS", "FAILED", "REFUNDED"] },
    },
    select: { status: true },
  })

  const successCount = todaysResolvedTx.filter(
    (t) => t.status === "SUCCESS"
  ).length
  const totalResolved = todaysResolvedTx.length
  const successRate =
    totalResolved > 0 ? Math.round((successCount / totalResolved) * 100) : 100

  // Mount the recent transactional flow strictly blocking Manual elements
  const recentLedger = await prisma.transaction.findMany({
    where: { operator: { notIn: ["MANUAL_CREDIT", "MANUAL_DEBIT"] } },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  // For the manual Funding drop-down
  const retailersList = await prisma.user.findMany({
    where: { role: "RETAILER" },
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Monitor system activity and manage operations.
        </p>
      </div>

      {/* Vital Signs Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              ₹{totalLiability.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Distributors: ₹{distLiability.toLocaleString()} · Retailers: ₹{retLiability.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Volume
            </CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              ₹{todaysVolume.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Successful transactions today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Transactions
            </CardTitle>
            {pendingTransactions > 5 ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Activity className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tracking-tight ${pendingTransactions > 5 ? "text-destructive" : ""}`}
            >
              {pendingTransactions}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Transactions in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {successRate}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Success over {totalResolved} resolved calls
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription className="mt-1">
                Latest platform transactions.
              </CardDescription>
            </div>
            <Link
              href="/admin/transactions"
              className="flex items-center text-sm font-medium text-primary hover:underline"
            >
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User / Agent</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLedger.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No recent API transactions found today.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentLedger.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                          <div className="flex flex-col">
                            <span>{tx.createdAt.toLocaleDateString()}</span>
                            <span className="text-xs">
                              {tx.createdAt.toLocaleTimeString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {tx.user.name}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {tx.operator}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {tx.targetPhone}
                        </TableCell>
                        <TableCell className="font-bold">
                          ₹{tx.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div
                            className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                              tx.status === "SUCCESS"
                                ? "bg-emerald-500/15 text-emerald-700"
                                : tx.status === "FAILED" ||
                                    tx.status === "REFUNDED"
                                  ? "bg-red-500/15 text-red-700"
                                  : "bg-amber-500/15 text-amber-700"
                            }`}
                          >
                            {tx.status}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

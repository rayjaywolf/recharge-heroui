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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function RetailerDashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role === "ADMIN") {
    redirect("/admin")
  }

  if (!user) {
    redirect("/login")
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    todaysUsage,
    todaysRechargeCount,
    todaysResolved,
    todaysPendingCount,
    recentTransactions,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: user.id,
        status: "SUCCESS",
        createdAt: { gte: todayStart },
        operator: { notIn: ["MANUAL_CREDIT", "MANUAL_DEBIT"] },
      },
    }),
    prisma.transaction.count({
      where: {
        userId: user.id,
        status: "SUCCESS",
        createdAt: { gte: todayStart },
        operator: { notIn: ["MANUAL_CREDIT", "MANUAL_DEBIT"] },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: todayStart },
        operator: { notIn: ["MANUAL_CREDIT", "MANUAL_DEBIT"] },
        status: { in: ["SUCCESS", "FAILED", "REFUNDED"] },
      },
      select: { status: true },
    }),
    prisma.transaction.count({
      where: {
        userId: user.id,
        createdAt: { gte: todayStart },
        status: "PENDING",
        operator: { notIn: ["MANUAL_CREDIT", "MANUAL_DEBIT"] },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        operator: { notIn: ["MANUAL_CREDIT", "MANUAL_DEBIT"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])

  const spentToday = todaysUsage._sum.amount ?? 0
  const showLowBalanceWarning = user.balance < 500
  const resolvedCount = todaysResolved.length
  const successCount = todaysResolved.filter(
    (tx) => tx.status === "SUCCESS"
  ).length
  const successRate =
    resolvedCount > 0 ? Math.round((successCount / resolvedCount) * 100) : 100

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="mt-2 text-muted-foreground">
          Track your wallet and daily recharge activity at a glance.
        </p>
      </div>

      {showLowBalanceWarning ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Low balance warning</AlertTitle>
          <AlertDescription>
            Your available balance is below ₹500. Contact admin for a top-up.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Available Balance
            </CardTitle>
            <CardDescription>
              Your live wallet balance for recharges.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-bold tracking-tight">
              ₹{user.balance.toLocaleString()}
            </p>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(100, Math.max(5, Math.round((user.balance / 5000) * 100)))}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Balance health indicator (₹5,000 reference scale).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Today&apos;s Usage
            </CardTitle>
            <CardDescription>
              Spend and completed recharge count today.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold">₹{spentToday.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              spent across {todaysRechargeCount}{" "}
              {todaysRechargeCount === 1 ? "recharge" : "recharges"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Success Rate
            </CardTitle>
            <CardDescription>
              Based on today&apos;s resolved requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold">{successRate}%</p>
            <p className="text-sm text-muted-foreground">
              {successCount} successful out of {resolvedCount} resolved
              recharges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Pending Recharges
            </CardTitle>
            <CardDescription>Requests waiting for final status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todaysPendingCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Today&apos;s Outflow
            </CardTitle>
            <CardDescription>Money moved from wallet today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{spentToday.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your 5 latest recharge attempts.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Time</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-20 text-center text-muted-foreground"
                  >
                    No recent recharge activity found.
                  </TableCell>
                </TableRow>
              ) : (
                recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="pl-6 text-muted-foreground">
                      {tx.createdAt.toLocaleString()}
                    </TableCell>
                    <TableCell>{tx.operator}</TableCell>
                    <TableCell className="font-mono">
                      {tx.targetPhone}
                    </TableCell>
                    <TableCell>₹{tx.amount.toLocaleString()}</TableCell>
                    <TableCell className="pr-6">{tx.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

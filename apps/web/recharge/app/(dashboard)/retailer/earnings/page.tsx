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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Landmark } from "lucide-react"
import { EarningsDownloadButton } from "./components/download-button"

export default async function RetailerEarningsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      retailerCommission: { gt: 0 },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const aggregate = await prisma.transaction.aggregate({
    where: { userId: session.user.id },
    _sum: { retailerCommission: true },
  })
  const totalEarnings = aggregate._sum.retailerCommission || 0

  const rules = await prisma.commissionRule.findMany({
    orderBy: { operator: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Earnings</h1>
        <p className="mt-1 text-muted-foreground">
          Track the commissions you've earned from your successful recharges.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Retailer Earnings
            </CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totalEarnings.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Accumulated from all your recharges
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Earnings Ledger</CardTitle>
                <CardDescription>
                  Your last 50 transactions that generated commission.
                </CardDescription>
              </div>
              <EarningsDownloadButton data={transactions} />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead className="text-right">Recharge Amt</TableHead>
                  <TableHead className="text-right">Your Cut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No earnings recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.createdAt.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono">
                        {tx.targetPhone}
                      </TableCell>
                      <TableCell>{tx.operator}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        ₹{tx.amount}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        +₹{tx.retailerCommission.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commission Structure</CardTitle>
            <CardDescription>
              Your margin rates for each operator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead className="text-right">Margin (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No rules configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">
                        {rule.operator}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {rule.retailerMargin.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

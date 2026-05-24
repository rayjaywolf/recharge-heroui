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

export default async function DistributorEarningsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== "DISTRIBUTOR") redirect("/retailer")

  const transactions = await prisma.transaction.findMany({
    where: {
      user: { distributorId: session.user.id },
      distributorCommission: { gt: 0 },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  })

  const aggregate = await prisma.transaction.aggregate({
    where: {
      user: { distributorId: session.user.id },
    },
    _sum: { distributorCommission: true },
  })
  const totalEarnings = aggregate._sum.distributorCommission || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Earnings</h1>
        <p className="mt-1 text-muted-foreground">
          Track the commissions you've earned from your retailer network.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Distributor Earnings
            </CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totalEarnings.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Accumulated from retailer transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Network Earnings</CardTitle>
              <CardDescription>
                The last 50 transactions made by your retailers that generated
                commission for you.
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
                <TableHead>Retailer</TableHead>
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
                    <TableCell className="font-medium">
                      {tx.user.name}
                    </TableCell>
                    <TableCell>{tx.operator}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      ₹{tx.amount}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      +₹{tx.distributorCommission.toFixed(2)}
                    </TableCell>
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

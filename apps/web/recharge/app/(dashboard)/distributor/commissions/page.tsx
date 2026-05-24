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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default async function DistributorCommissionsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== "DISTRIBUTOR") {
    redirect("/retailer")
  }

  const rules = await prisma.commissionRule.findMany({
    orderBy: { operator: "asc" }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Commissions</h1>
        <p className="mt-1 text-muted-foreground">
          View the commission rates you earn on transactions and the rates passed down to your retailers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission Structures</CardTitle>
          <CardDescription>
            System-wide margins defined by the platform administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operator</TableHead>
                <TableHead className="text-right">Your Margin (%)</TableHead>
                <TableHead className="text-right">Retailer Margin (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                    No commission rules currently configured by the admin.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.operator}</TableCell>
                    <TableCell className="text-right font-medium">
                      {rule.distributorMargin.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
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
  )
}

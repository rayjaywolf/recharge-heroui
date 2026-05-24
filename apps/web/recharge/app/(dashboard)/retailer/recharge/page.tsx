import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RechargeForm } from "../components/recharge-form"
import { prisma } from "@/lib/auth"

export default async function RetailerRechargePage() {
  const rules = await prisma.commissionRule.findMany({
    select: { operator: true },
    orderBy: { operator: "asc" },
  })
  const availableOperators = rules.map((r) => r.operator)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recharge</h1>
        <p className="mt-2 text-muted-foreground">
          Initiate a new recharge for your customer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Recharge</CardTitle>
          <CardDescription>
            Enter phone number, operator, and amount to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RechargeForm availableOperators={availableOperators} />
        </CardContent>
      </Card>
    </div>
  )
}

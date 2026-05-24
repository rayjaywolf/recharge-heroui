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

export default async function RetailerFundsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    redirect("/login")
  }

  if (user.role === "ADMIN") {
    redirect("/admin")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Funds</h1>
        <p className="mt-2 text-muted-foreground">
          Manage wallet top-ups and funding requests.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funding</CardTitle>
          <CardDescription>
            Contact admin to add balance to your wallet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your current available balance is ₹{user.balance.toLocaleString()}.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

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
import { NotificationsTabs } from "./tabs"

type RetailerNotification = {
  id: string
  title: string
  description: string
  createdAt: string
}

export default async function RetailerNotificationsPage() {
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

  const [credits, rechargeUpdates] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        operator: "MANUAL_CREDIT",
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        operator: { notIn: ["MANUAL_CREDIT", "MANUAL_DEBIT"] },
        status: { in: ["SUCCESS", "FAILED", "REFUNDED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ])

  const balanceNotifications: RetailerNotification[] = credits.map((credit) => ({
    id: `balance-added-${credit.id}`,
    title: "Balance added",
    description: `INR ${credit.amount.toLocaleString()} was added to your wallet.`,
    createdAt: credit.createdAt.toISOString(),
  }))

  const rechargeNotifications: RetailerNotification[] = rechargeUpdates.map(
    (recharge) => ({
      id: `recharge-update-${recharge.id}`,
      title:
        recharge.status === "SUCCESS"
          ? "Recharge successful"
          : recharge.status === "REFUNDED"
            ? "Recharge refunded"
            : "Recharge failed",
      description: `${recharge.operator} recharge for ${recharge.targetPhone} of INR ${recharge.amount.toLocaleString()}.`,
      createdAt: recharge.createdAt.toISOString(),
    })
  )

  const notifications: RetailerNotification[] = [
    ...balanceNotifications,
    ...rechargeNotifications,
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="mt-2 text-muted-foreground">
          Track balance credits and recharge updates with read status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retailer Notifications</CardTitle>
          <CardDescription>
            Includes both unread and read balance-added and recharge records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationsTabs userId={user.id} notifications={notifications} />
        </CardContent>
      </Card>
    </div>
  )
}

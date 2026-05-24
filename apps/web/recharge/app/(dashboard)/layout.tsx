import { auth, prisma } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DashboardHeader } from "@/components/dashboard-header"
import { getPendingApprovalsCount } from "@/lib/pending-approvals"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  if (user.isRejected) {
    redirect("/rejected")
  }

  if (!user.isApproved && user.role !== "ADMIN") {
    redirect("/pending-approval")
  }

  const isAdmin = user.role === "ADMIN"
  const isDistributor = user.role === "DISTRIBUTOR"
  const isRetailer = user.role === "RETAILER"

  const pendingApprovalsCount = isAdmin ? await getPendingApprovalsCount() : 0

  let apiBalance = 0
  if (isAdmin) {
    try {
      const balanceUrl = new URL(
        "https://business.a1topup.com/recharge/balance"
      )
      balanceUrl.searchParams.append(
        "username",
        process.env.A1TOPUP_USERNAME || ""
      )
      balanceUrl.searchParams.append("pwd", process.env.A1TOPUP_PASSWORD || "")
      balanceUrl.searchParams.append("format", "json")

      const res = await fetch(balanceUrl.toString(), { cache: "no-store" })
      const textResponse = await res.text()

      let data
      try {
        data = JSON.parse(textResponse)
      } catch (parseError) {}

      if (typeof data === "number") {
        apiBalance = data
      } else if (data && typeof data.balance !== "undefined") {
        apiBalance = parseFloat(data.balance)
      } else if (
        data &&
        typeof data.msg !== "undefined" &&
        !isNaN(parseFloat(data.msg))
      ) {
        apiBalance = parseFloat(data.msg)
      } else if (!isNaN(parseFloat(textResponse))) {
        apiBalance = parseFloat(textResponse)
      }
    } catch (e) {
      console.error("Failed to fetch API balance:", e)
    }
  }

  const notifications: {
    id: string
    title: string
    description: string
    createdAt: string
  }[] = []

  if (isRetailer || isDistributor) {
    const [recentCredits, recentRechargeUpdates] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          operator: { in: ["MANUAL_CREDIT", "FUNDS_RECEIVED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          operator: {
            notIn: [
              "MANUAL_CREDIT",
              "MANUAL_DEBIT",
              "FUNDS_RECEIVED",
              "FUNDS_SENT",
            ],
          },
          status: { in: ["SUCCESS", "FAILED", "REFUNDED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ])

    for (const credit of recentCredits) {
      notifications.push({
        id: `balance-added-${credit.id}`,
        title: "Balance added",
        description: `INR ${credit.amount.toLocaleString()} was added to your wallet.`,
        createdAt: credit.createdAt.toISOString(),
      })
    }

    for (const recharge of recentRechargeUpdates) {
      const title =
        recharge.status === "SUCCESS"
          ? "Recharge successful"
          : recharge.status === "REFUNDED"
            ? "Recharge refunded"
            : "Recharge failed"

      notifications.push({
        id: `recharge-update-${recharge.id}`,
        title,
        description: `${recharge.operator} recharge for ${recharge.targetPhone} of INR ${recharge.amount.toLocaleString()}.`,
        createdAt: recharge.createdAt.toISOString(),
      })
    }

    notifications.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="hidden md:block">
          <AppSidebar
            userRole={user.role}
            pendingApprovalsCount={pendingApprovalsCount}
          />
        </div>
        <SidebarInset className="pb-16 md:pb-0">
          <DashboardHeader
            userName={user.name}
            userRole={user.role}
            balance={user.balance}
            apiBalance={apiBalance}
            isRetailer={isRetailer}
            userId={user.id}
            notifications={notifications}
          />

          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
            <div className="mx-auto min-w-0 max-w-full">{children}</div>
          </main>
        </SidebarInset>
        <MobileBottomNav userRole={user.role} />
      </SidebarProvider>
    </TooltipProvider>
  )
}

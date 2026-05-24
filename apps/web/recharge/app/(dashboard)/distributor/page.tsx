import { auth, prisma } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Wallet, Users, ArrowUpRight, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DistributorPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user || user.role !== "DISTRIBUTOR") {
    redirect("/")
  }

  // 1. Retailer Breakdown
  const retailers = await prisma.user.findMany({
    where: { distributorId: user.id },
    select: { id: true, isSuspended: true, isApproved: true, isRejected: true }
  })
  const assignedRetailersCount = retailers.length;
  const activeRetailersCount = retailers.filter(r => r.isApproved && !r.isSuspended && !r.isRejected).length;
  const pendingRetailersCount = retailers.filter(r => !r.isApproved && !r.isRejected).length;
  const retailerIds = retailers.map(r => r.id);

  // 2. Funds Sent to Network
  const fundsSentAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { userId: user.id, operator: "FUNDS_SENT", status: "SUCCESS" }
  });
  const totalFundsSent = fundsSentAgg._sum.amount || 0;

  // 3. Network Performance (Retailer Recharges)
  const networkRechargeAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    _count: true,
    where: { 
      userId: { in: retailerIds.length > 0 ? retailerIds : ["none"] }, 
      status: "SUCCESS", 
      operator: { notIn: ["MANUAL_CREDIT", "MANUAL_DEBIT", "FUNDS_RECEIVED", "FUNDS_SENT"] } 
    }
  });
  const totalNetworkVolume = networkRechargeAgg._sum.amount || 0;
  const totalNetworkRecharges = networkRechargeAgg._count || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Distributor Overview</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back! Here are the overarching metrics for your retail network.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <p className="text-2xl font-bold">₹ {user.balance.toLocaleString()}</p>
             <p className="text-xs text-muted-foreground mt-1">Available for routing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Retailers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <p className="text-2xl font-bold">{assignedRetailersCount}</p>
             <p className="text-xs text-muted-foreground mt-1">
                {activeRetailersCount} Active · {pendingRetailersCount} Pending KYC
             </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Recharge Vol</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <p className="text-2xl font-bold">₹ {totalNetworkVolume.toLocaleString()}</p>
             <p className="text-xs text-muted-foreground mt-1">{totalNetworkRecharges} successful recharges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funds Disbursed</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <p className="text-2xl font-bold">₹ {totalFundsSent.toLocaleString()}</p>
             <p className="text-xs text-muted-foreground mt-1">Total transferred downward</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

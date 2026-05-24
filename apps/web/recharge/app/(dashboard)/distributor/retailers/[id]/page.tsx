import { auth, prisma } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DistributorFundForm } from "./distributor-fund-form"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function DistributorRetailerDetails({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/login")

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user || user.role !== "DISTRIBUTOR") {
    redirect("/")
  }

  const retailer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      balance: true,
      isSuspended: true,
      isApproved: true,
      isRejected: true,
      createdAt: true,
      distributorId: true,
      _count: {
        select: { transactions: true },
      },
    },
  })

  if (!retailer || retailer.distributorId !== user.id) {
     redirect("/distributor/retailers")
  }

  return (
    <div className="space-y-6">
      <Link href="/distributor/retailers">
        <Button variant="ghost" className="-ml-4 mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Retailers
        </Button>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{retailer.name}</h1>
          <p className="mt-1 text-muted-foreground">{retailer.email}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-semibold border 
           ${retailer.isSuspended ? "bg-zinc-100 text-zinc-800 border-zinc-200" 
           : retailer.isRejected ? "bg-red-100 text-red-800 border-red-200" 
           : !retailer.isApproved ? "bg-amber-100 text-amber-800 border-amber-200" 
           : "bg-emerald-100 text-emerald-800 border-emerald-200"}`}
        >
           {retailer.isSuspended ? "Suspended" : retailer.isRejected ? "Rejected" : !retailer.isApproved ? "Pending KYC" : "Active"}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow space-y-1.5 p-6">
           <h3 className="tracking-tight text-sm font-medium">Wallet Balance</h3>
           <p className="text-2xl font-bold text-emerald-600">₹ {retailer.balance.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow space-y-1.5 p-6">
           <h3 className="tracking-tight text-sm font-medium">Total Transactions</h3>
           <p className="text-2xl font-bold">{retailer._count.transactions}</p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow space-y-1.5 p-6">
           <h3 className="tracking-tight text-sm font-medium">Joined On</h3>
           <p className="text-xl font-bold">{retailer.createdAt.toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
         <DistributorFundForm 
            retailerId={retailer.id} 
            disabled={retailer.isSuspended || retailer.isRejected || !retailer.isApproved} 
         />
         
         <div className="rounded-xl border bg-card text-card-foreground shadow space-y-4 p-6">
            <h3 className="text-lg font-semibold border-b pb-2">Account Notes</h3>
            <p className="text-sm text-muted-foreground">
               This retailer is under your direct management footprint. Wallet debits/credits occur instantaneously via the secure API endpoints enforcing balance validity across the network.
            </p>
         </div>
      </div>
    </div>
  )
}

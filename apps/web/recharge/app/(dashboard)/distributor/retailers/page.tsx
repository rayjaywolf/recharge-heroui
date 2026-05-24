import { auth, prisma } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DistributorRetailerList } from "../distributor-retailer-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function DistributorRetailersPage() {
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

  const assignedRetailers = await prisma.user.findMany({
    where: { distributorId: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      balance: true,
      isSuspended: true,
      isApproved: true,
      isRejected: true,
      createdAt: true,
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retailers</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your network of retailers.
          </p>
        </div>
        <Link href="/distributor/retailers/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Retailer
          </Button>
        </Link>
      </div>

      <div className="mt-8">
        <DistributorRetailerList initialData={assignedRetailers} />
      </div>
    </div>
  )
}

import { auth, prisma } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { UserTable } from "./components/retailer-table"

export default async function UsersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== "ADMIN") {
    redirect("/retailer")
  }

  // Fetch all non-admin users with total transaction counts
  const users = await prisma.user.findMany({
    where: { role: { in: ["RETAILER", "DISTRIBUTOR"] } },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      whatsappNumber: true,
      role: true,
      balance: true,
      isSuspended: true,
      createdAt: true,
      distributor: {
        select: { name: true }
      },
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Fetch distributors for the assignment dropdown
  const distributors = await prisma.user.findMany({
    where: { role: "DISTRIBUTOR" },
    select: { id: true, name: true }
  });

  const distributorsData = users.filter((u) => u.role === "DISTRIBUTOR") as any;
  const retailersData = users.filter((u) => u.role === "RETAILER") as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-muted-foreground">
          Manage user accounts and hierarchy configurations.
        </p>
      </div>

      <div className="mt-8 space-y-12">
        <UserTable 
           title="Distributors" 
           initialData={distributorsData} 
           distributors={distributors} 
           hideDistributorCol
        />
        <UserTable 
           title="Retailers" 
           initialData={retailersData} 
           distributors={distributors} 
        />
      </div>
    </div>
  )
}

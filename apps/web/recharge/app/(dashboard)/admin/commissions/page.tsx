import { auth, prisma } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { CommissionClient } from "./commission-client"

export default async function CommissionsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== "ADMIN") {
    redirect("/retailer")
  }

  const rules = await prisma.commissionRule.findMany({
    orderBy: { operator: "asc" }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commission Rules</h1>
        <p className="mt-1 text-muted-foreground">
          Manage system-wide commission rates for all operators. The rules set here apply to all users globally.
        </p>
      </div>
      <CommissionClient initialRules={rules} />
    </div>
  )
}

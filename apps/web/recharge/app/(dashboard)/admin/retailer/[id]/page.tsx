import { auth, prisma } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ArrowLeft, User as UserIcon, Wallet, ShieldAlert } from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone"

export default async function RetailerLedgerPage(props: {
  params: Promise<{ id: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== "ADMIN") {
    redirect("/retailer")
  }

  const { id } = await props.params

  // Pull individual transaction block
  const targetRetailer = await prisma.user.findUnique({
    where: { id: id },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  const contactPhone = targetRetailer
    ? getDisplayPhone(targetRetailer)
    : null
  const contactEmail = targetRetailer
    ? getDisplayEmail(targetRetailer.email)
    : null

  if (!targetRetailer) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Retailer Not Found</h2>
        <Link
          href="/admin/users"
          className="text-sm text-primary hover:underline"
        >
          Return to directory
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Retailer Details</h1>
        <p className="mt-1 text-muted-foreground">
          View transactions and account details for {targetRetailer.name}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contact</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-xl font-bold tracking-tight">
              {contactPhone ?? contactEmail ?? "—"}
            </div>
            {contactPhone && contactEmail ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {contactEmail}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Member since {targetRetailer.createdAt.toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tracking-tight text-emerald-600">
              ₹ {targetRetailer.balance.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Current balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Account Status
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mt-1">
              <div
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${targetRetailer.isSuspended ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}
              >
                {targetRetailer.isSuspended ? "SUSPENDED" : "ACTIVE"}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Manage status in users page.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targetRetailer.transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No transactions found for this retailer.
                </TableCell>
              </TableRow>
            ) : (
              targetRetailer.transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    {tx.createdAt.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {tx.operator === "MANUAL_CREDIT" ? (
                      <span className="font-semibold text-emerald-600">
                        Wallet Top-up
                      </span>
                    ) : (
                      <div>
                        <div className="font-semibold">{tx.operator}</div>
                        <div className="text-xs text-muted-foreground">
                          {tx.targetPhone}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-bold">
                    ₹ {tx.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div
                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                        tx.status === "SUCCESS"
                          ? "bg-emerald-500/15 text-emerald-700"
                          : tx.status === "FAILED" || tx.status === "REFUNDED"
                            ? "bg-red-500/15 text-red-700"
                            : "bg-amber-500/15 text-amber-700"
                      }`}
                    >
                      {tx.status}
                    </div>
                  </TableCell>
                  <TableCell
                    className="max-w-xs truncate font-mono text-xs text-muted-foreground"
                    title={tx.apiReferenceId || tx.id}
                  >
                    {tx.apiReferenceId || tx.id}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

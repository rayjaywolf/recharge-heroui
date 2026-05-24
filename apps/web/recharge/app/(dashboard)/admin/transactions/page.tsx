import { auth, prisma } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { FilterBar } from "./components/filter-bar"
import { TransactionsDownloadButton } from "./components/download-button"
import {
  TransactionsTable,
  type AdminTransactionRow,
} from "./components/transactions-table"

export default async function MasterLedgerPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== "ADMIN") redirect("/retailer")

  const resolvedParams = await props.searchParams

  const status = resolvedParams.status as string
  const operator = resolvedParams.operator as string
  const search = resolvedParams.search as string
  const dateFrom = resolvedParams.dateFrom as string
  const dateTo = resolvedParams.dateTo as string

  const whereClause: Record<string, unknown> = {
    operator: { notIn: ["MANUAL_CREDIT", "MANUAL_DEBIT"] },
  }

  if (status && status !== "ALL") {
    whereClause.status = status
  }

  if (operator && operator !== "ALL") {
    whereClause.operator = operator
  }

  if (search && search.trim() !== "") {
    whereClause.OR = [
      { targetPhone: { contains: search, mode: "insensitive" } },
      { apiReferenceId: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ]
  }

  if (dateFrom || dateTo) {
    const createdAt: { gte?: Date; lte?: Date } = {}
    if (dateFrom) {
      createdAt.gte = new Date(dateFrom)
    }
    if (dateTo) {
      const endsAt = new Date(dateTo)
      endsAt.setDate(endsAt.getDate() + 1)
      createdAt.lte = endsAt
    }
    whereClause.createdAt = createdAt
  }

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phoneNumber: true,
          whatsappNumber: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  })

  const rows: AdminTransactionRow[] = transactions.map((tx) => ({
    id: tx.id,
    userId: tx.userId,
    targetPhone: tx.targetPhone,
    operator: tx.operator,
    amount: tx.amount,
    circleCode: tx.circleCode,
    provider: tx.provider,
    status: tx.status,
    apiReferenceId: tx.apiReferenceId,
    apiMessage: tx.apiMessage,
    idempotencyKey: tx.idempotencyKey,
    retailerCommission: tx.retailerCommission,
    distributorCommission: tx.distributorCommission,
    adminCommission: tx.adminCommission,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    user: tx.user,
  }))

  return (
    <div className="animate-in min-w-0 max-w-full space-y-6 duration-500 fade-in slide-in-from-bottom-3">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="mt-1 text-muted-foreground">
              View and filter all platform transactions. Click a row for full
              details.
            </p>
          </div>
          <TransactionsDownloadButton data={transactions} />
        </div>
      </div>

      <div className="flex min-w-0 flex-col space-y-4">
        <FilterBar
          initialStatus={status || "ALL"}
          initialOperator={operator || "ALL"}
          initialSearch={search || ""}
          initialDateFrom={dateFrom || ""}
          initialDateTo={dateTo || ""}
        />

        <TransactionsTable transactions={rows} />
      </div>
    </div>
  )
}

import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  ne,
  notInArray,
  sum,
} from "drizzle-orm";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  Wallet,
} from "lucide-react";
import { Link, Table } from "@heroui/react";
import { db, transaction, user } from "@repo/db";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { Money } from "@/components/money";
import { StatCard } from "@/components/admin/stat-card";
import { TransactionStatusChip } from "@/components/admin/transaction-status-chip";
import { formatInr } from "@/lib/format-money";

export default async function AdminOverviewPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [[totalLiabilityRow], [distLiabilityRow]] = await Promise.all([
    db
      .select({ total: sum(user.balance) })
      .from(user)
      .where(inArray(user.role, ["RETAILER", "DISTRIBUTOR"])),
    db
      .select({ total: sum(user.balance) })
      .from(user)
      .where(eq(user.role, "DISTRIBUTOR")),
  ]);

  const totalLiability = Number(totalLiabilityRow?.total ?? 0);
  const distLiability = Number(distLiabilityRow?.total ?? 0);
  const retLiability = totalLiability - distLiability;

  const [todaysVolumeRow] = await db
    .select({ total: sum(transaction.amount) })
    .from(transaction)
    .where(
      and(
        eq(transaction.status, "SUCCESS"),
        gte(transaction.createdAt, todayStart),
        ne(transaction.operator, "MANUAL_CREDIT"),
      ),
    );

  const todaysVolume = Number(todaysVolumeRow?.total ?? 0);

  const [pendingRow] = await db
    .select({ count: count() })
    .from(transaction)
    .where(eq(transaction.status, "PENDING"));

  const pendingTransactions = pendingRow?.count ?? 0;

  const todaysResolvedTx = await db
    .select({ status: transaction.status })
    .from(transaction)
    .where(
      and(
        gte(transaction.createdAt, todayStart),
        ne(transaction.operator, "MANUAL_CREDIT"),
        inArray(transaction.status, ["SUCCESS", "FAILED", "REFUNDED"]),
      ),
    );

  const successCount = todaysResolvedTx.filter((t) => t.status === "SUCCESS").length;
  const totalResolved = todaysResolvedTx.length;
  const successRate =
    totalResolved > 0 ? Math.round((successCount / totalResolved) * 100) : 100;

  const recentLedger = await db
    .select({
      id: transaction.id,
      createdAt: transaction.createdAt,
      operator: transaction.operator,
      targetPhone: transaction.targetPhone,
      amount: transaction.amount,
      status: transaction.status,
      userName: user.name,
    })
    .from(transaction)
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(notInArray(transaction.operator, ["MANUAL_CREDIT", "MANUAL_DEBIT"]))
    .orderBy(desc(transaction.createdAt))
    .limit(5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="mt-1 text-sm text-muted">
          Monitor system activity and manage operations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description={`Distributors: ${formatInr(distLiability)} · Retailers: ${formatInr(retLiability)}`}
          icon={Wallet}
          title="Total balance"
          value={formatInr(totalLiability)}
        />
        <StatCard
          description="Successful transactions today"
          icon={ArrowRightLeft}
          title="Today's volume"
          value={formatInr(todaysVolume)}
        />
        <StatCard
          description="Transactions in progress"
          highlight={pendingTransactions > 5 ? "danger" : "default"}
          icon={pendingTransactions > 5 ? AlertCircle : Activity}
          title="Pending transactions"
          value={String(pendingTransactions)}
        />
        <StatCard
          description={`Success over ${totalResolved} resolved calls`}
          icon={Activity}
          title="Success rate"
          value={`${successRate}%`}
        />
      </div>

      <AdminTableCard
        description="Latest platform transactions."
        headerAction={
          <Link
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium"
            href="/admin/transactions"
          >
            View all
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
        title="Recent transactions"
      >
        {recentLedger.length === 0 ? (
          <AdminTableEmpty message="No recent API transactions found." />
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Recent transactions"
                className="min-w-[640px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Time</Table.Column>
                  <Table.Column>User</Table.Column>
                  <Table.Column>Carrier</Table.Column>
                  <Table.Column>Phone</Table.Column>
                  <Table.Column>Amount</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {recentLedger.map((tx) => (
                    <Table.Row key={tx.id}>
                      <Table.Cell>
                        <div className="flex flex-col text-sm">
                          <span className="text-foreground">
                            {tx.createdAt.toLocaleDateString("en-IN")}
                          </span>
                          <span className="text-xs text-muted">
                            {tx.createdAt.toLocaleTimeString("en-IN")}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="font-medium">{tx.userName}</Table.Cell>
                      <Table.Cell>{tx.operator}</Table.Cell>
                      <Table.Cell className="font-mono text-sm text-muted">
                        {tx.targetPhone}
                      </Table.Cell>
                      <Table.Cell className="font-semibold">
                        <Money amount={tx.amount} />
                      </Table.Cell>
                      <Table.Cell>
                        <TransactionStatusChip status={tx.status} />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </AdminTableCard>
    </div>
  );
}

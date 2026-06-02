import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  ne,
  notInArray,
  sum,
} from "drizzle-orm";
import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
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
import { computePercentChange, getDayBounds } from "@/lib/stat-trend";
import { operatorLabel } from "@/lib/transaction-label";
import { formatTableDateTime } from "@/lib/utils";

async function successRateBetween(start: Date, end?: Date) {
  const conditions = [
    gte(transaction.createdAt, start),
    ne(transaction.operator, "MANUAL_CREDIT"),
    inArray(transaction.status, ["SUCCESS", "FAILED", "REFUNDED"]),
  ];
  if (end) conditions.push(lt(transaction.createdAt, end));

  const rows = await db
    .select({ status: transaction.status })
    .from(transaction)
    .where(and(...conditions));

  const successCount = rows.filter((t) => t.status === "SUCCESS").length;
  const total = rows.length;
  return total > 0 ? Math.round((successCount / total) * 100) : 100;
}

export default async function AdminOverviewPage() {
  const now = new Date();
  const { todayStart, yesterdayStart } = getDayBounds(now);

  const [totalLiabilityRow] = await db
    .select({ total: sum(user.balance) })
    .from(user)
    .where(inArray(user.role, ["RETAILER", "DISTRIBUTOR"]));

  const totalLiability = Number(totalLiabilityRow?.total ?? 0);

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

  const [
    [yesterdaysVolumeRow],
    [todaysInflowRow],
    [yesterdaysInflowRow],
    [todaysNewPendingRow],
    [yesterdaysNewPendingRow],
  ] = await Promise.all([
    db
      .select({ total: sum(transaction.amount) })
      .from(transaction)
      .where(
        and(
          eq(transaction.status, "SUCCESS"),
          gte(transaction.createdAt, yesterdayStart),
          lt(transaction.createdAt, todayStart),
          ne(transaction.operator, "MANUAL_CREDIT"),
        ),
      ),
    db
      .select({ total: sum(transaction.amount) })
      .from(transaction)
      .where(
        and(
          eq(transaction.status, "SUCCESS"),
          gte(transaction.createdAt, todayStart),
          inArray(transaction.operator, ["MANUAL_CREDIT", "FUNDS_RECEIVED"]),
        ),
      ),
    db
      .select({ total: sum(transaction.amount) })
      .from(transaction)
      .where(
        and(
          eq(transaction.status, "SUCCESS"),
          gte(transaction.createdAt, yesterdayStart),
          lt(transaction.createdAt, todayStart),
          inArray(transaction.operator, ["MANUAL_CREDIT", "FUNDS_RECEIVED"]),
        ),
      ),
    db
      .select({ count: count() })
      .from(transaction)
      .where(
        and(
          eq(transaction.status, "PENDING"),
          gte(transaction.createdAt, todayStart),
        ),
      ),
    db
      .select({ count: count() })
      .from(transaction)
      .where(
        and(
          eq(transaction.status, "PENDING"),
          gte(transaction.createdAt, yesterdayStart),
          lt(transaction.createdAt, todayStart),
        ),
      ),
  ]);

  const yesterdaysVolume = Number(yesterdaysVolumeRow?.total ?? 0);
  const todaysInflow = Number(todaysInflowRow?.total ?? 0);
  const yesterdaysInflow = Number(yesterdaysInflowRow?.total ?? 0);
  const todaysNewPending = todaysNewPendingRow?.count ?? 0;
  const yesterdaysNewPending = yesterdaysNewPendingRow?.count ?? 0;

  const [yesterdaySuccessRate] = await Promise.all([
    successRateBetween(yesterdayStart, todayStart),
  ]);

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

  const balanceTrend = computePercentChange(todaysInflow, yesterdaysInflow);
  const volumeTrend = computePercentChange(todaysVolume, yesterdaysVolume);
  const pendingTrend = computePercentChange(
    todaysNewPending,
    yesterdaysNewPending,
  );
  const successRateTrend = computePercentChange(
    successRate,
    yesterdaySuccessRate,
  );

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
    .limit(20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="mt-1 text-sm text-muted">
          Today's analytics and overview of the platform
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          title="Balance"
          trendPercent={balanceTrend}
          value={formatInr(totalLiability)}
        />
        <StatCard
          icon={ArrowRightLeft}
          title="Volume"
          trendPercent={volumeTrend}
          value={formatInr(todaysVolume)}
        />
        <StatCard
          highlight={pendingTransactions > 5 ? "danger" : "default"}
          icon={pendingTransactions > 5 ? AlertCircle : Clock}
          title="Pending transactions"
          trendPercent={pendingTrend}
          value={String(pendingTransactions)}
        />
        <StatCard
          icon={CheckCircle2}
          title="Success rate"
          trendPercent={successRateTrend}
          value={`${successRate}%`}
        />
      </div>

      <AdminTableCard
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
                    <Table.Row key={tx.id} className="whitespace-nowrap">
                      <Table.Cell className="whitespace-nowrap text-sm text-muted">
                        {formatTableDateTime(tx.createdAt)}
                      </Table.Cell>
                      <Table.Cell className="font-medium">{tx.userName}</Table.Cell>
                      <Table.Cell>{operatorLabel(tx.operator)}</Table.Cell>
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

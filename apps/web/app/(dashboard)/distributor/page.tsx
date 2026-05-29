import {
  and,
  count,
  desc,
  eq,
  gte,
  lt,
  notInArray,
  sum,
} from "drizzle-orm";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Users,
  Wallet,
} from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Link, Table } from "@heroui/react";
import { db, transaction, user } from "@repo/db";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { StatCard } from "@/components/admin/stat-card";
import { TransactionStatusChip } from "@/components/admin/transaction-status-chip";
import { Money } from "@/components/money";
import { auth } from "@/lib/auth";
import { formatInr } from "@/lib/format-money";
import { computePercentChange, getDayBounds } from "@/lib/stat-trend";
import {
  buildDistributorRechargeActivityFilter,
  buildDistributorRechargeVolumeFilter,
} from "@/lib/distributor-recharge-volume";
import { LEDGER_EXCLUDED_OPERATORS } from "@/lib/transaction-filters";
import { formatTableDateTime } from "@/lib/utils";

async function networkSuccessRateBetween(
  activityFilter: ReturnType<typeof buildDistributorRechargeActivityFilter>,
  start: Date,
  end?: Date,
) {
  const conditions = [activityFilter, gte(transaction.createdAt, start)];
  if (end) conditions.push(lt(transaction.createdAt, end));

  const rows = await db
    .select({ status: transaction.status })
    .from(transaction)
    .where(and(...conditions));

  const successCount = rows.filter((t) => t.status === "SUCCESS").length;
  const total = rows.length;
  return total > 0 ? Math.round((successCount / total) * 100) : 100;
}

export default async function DistributorOverviewPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const [distributor] = await db
    .select({
      id: user.id,
      balance: user.balance,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!distributor || distributor.role !== "DISTRIBUTOR") {
    redirect("/login");
  }

  const now = new Date();
  const { todayStart, yesterdayStart } = getDayBounds(now);

  const retailers = await db
    .select({
      id: user.id,
      accountStatus: user.accountStatus,
    })
    .from(user)
    .where(eq(user.distributorId, distributor.id));

  const assignedRetailersCount = retailers.length;
  const activeRetailersCount = retailers.filter(
    (r) => r.accountStatus === "APPROVED"
  ).length;
  const pendingRetailersCount = retailers.filter(
    (r) => r.accountStatus === "PENDING"
  ).length;
  const retailerIds = retailers.map((r) => r.id);

  const rechargeVolumeFilter = buildDistributorRechargeVolumeFilter(
    distributor.id,
    retailerIds,
  );
  const rechargeActivityFilter = buildDistributorRechargeActivityFilter(
    distributor.id,
    retailerIds,
  );

  const [networkVolumeRow, networkCountRow, todaysNetworkVolumeRow] =
    await Promise.all([
      db
        .select({ total: sum(transaction.amount) })
        .from(transaction)
        .where(rechargeVolumeFilter),
      db
        .select({ count: count() })
        .from(transaction)
        .where(rechargeVolumeFilter),
      db
        .select({ total: sum(transaction.amount) })
        .from(transaction)
        .where(
          and(rechargeVolumeFilter, gte(transaction.createdAt, todayStart)),
        ),
    ]);

  const totalNetworkVolume = Number(networkVolumeRow[0]?.total ?? 0);
  const totalNetworkRecharges = networkCountRow[0]?.count ?? 0;
  const todaysNetworkVolume = Number(todaysNetworkVolumeRow[0]?.total ?? 0);

  const [
    [todaysInflowRow],
    [yesterdaysInflowRow],
    [todaysNewRetailersRow],
    [yesterdaysNewRetailersRow],
    yesterdaySuccessRate,
  ] = await Promise.all([
    db
      .select({ total: sum(transaction.amount) })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, distributor.id),
          eq(transaction.operator, "FUNDS_RECEIVED"),
          eq(transaction.status, "SUCCESS"),
          gte(transaction.createdAt, todayStart),
        ),
      ),
    db
      .select({ total: sum(transaction.amount) })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, distributor.id),
          eq(transaction.operator, "FUNDS_RECEIVED"),
          eq(transaction.status, "SUCCESS"),
          gte(transaction.createdAt, yesterdayStart),
          lt(transaction.createdAt, todayStart),
        ),
      ),
    db
      .select({ count: count() })
      .from(user)
      .where(
        and(
          eq(user.distributorId, distributor.id),
          gte(user.createdAt, todayStart),
        ),
      ),
    db
      .select({ count: count() })
      .from(user)
      .where(
        and(
          eq(user.distributorId, distributor.id),
          gte(user.createdAt, yesterdayStart),
          lt(user.createdAt, todayStart),
        ),
      ),
    networkSuccessRateBetween(
      rechargeActivityFilter,
      yesterdayStart,
      todayStart,
    ),
  ]);

  const todaysResolvedTx = await db
    .select({ status: transaction.status })
    .from(transaction)
    .where(
      and(rechargeActivityFilter, gte(transaction.createdAt, todayStart)),
    );

  const successCount = todaysResolvedTx.filter(
    (t) => t.status === "SUCCESS",
  ).length;
  const totalResolved = todaysResolvedTx.length;
  const successRate =
    totalResolved > 0 ? Math.round((successCount / totalResolved) * 100) : 100;

  const todaysInflow = Number(todaysInflowRow?.total ?? 0);
  const yesterdaysInflow = Number(yesterdaysInflowRow?.total ?? 0);
  const todaysNewRetailers = todaysNewRetailersRow?.count ?? 0;
  const yesterdaysNewRetailers = yesterdaysNewRetailersRow?.count ?? 0;
  const networkVolumeThroughYesterday =
    totalNetworkVolume - todaysNetworkVolume;

  const walletTrend = computePercentChange(todaysInflow, yesterdaysInflow);
  const retailersTrend = computePercentChange(
    todaysNewRetailers,
    yesterdaysNewRetailers,
  );
  const networkVolumeTrend = computePercentChange(
    totalNetworkVolume,
    networkVolumeThroughYesterday,
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
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, distributor.id),
        notInArray(transaction.operator, [...LEDGER_EXCLUDED_OPERATORS]),
      ),
    )
    .orderBy(desc(transaction.createdAt))
    .limit(20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="mt-1 text-sm text-muted">
          Your wallet, retailer network, and recent activity
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Available for routing"
          icon={Wallet}
          title="Wallet balance"
          trendPercent={walletTrend}
          value={formatInr(distributor.balance)}
        />
        <StatCard
          description={`${activeRetailersCount} active · ${pendingRetailersCount} pending approval`}
          highlight={pendingRetailersCount > 0 ? "danger" : "default"}
          icon={Users}
          title="Retailers"
          trendPercent={retailersTrend}
          value={String(assignedRetailersCount)}
        />
        <StatCard
          description={`${formatInr(todaysNetworkVolume)} today · ${totalNetworkRecharges.toLocaleString("en-IN")} successful`}
          icon={Activity}
          title="Recharge volume"
          trendPercent={networkVolumeTrend}
          value={formatInr(totalNetworkVolume)}
        />
        <StatCard
          description={`${successCount} of ${totalResolved} recharges today`}
          icon={CheckCircle2}
          title="Success rate"
          trendPercent={successRateTrend}
          value={`${successRate}%`}
        />
      </div>

      <AdminTableCard
        description="Your latest recharges and fund movements."
        headerAction={
          <Link
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium"
            href="/distributor/ledger"
          >
            View all
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
        title="Recent transactions"
      >
        {recentLedger.length === 0 ? (
          <AdminTableEmpty message="No recent transactions yet." />
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Recent transactions"
                className="min-w-[560px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Time</Table.Column>
                  <Table.Column>Type</Table.Column>
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
                      <Table.Cell className="font-medium">{tx.operator}</Table.Cell>
                      <Table.Cell className="font-mono text-sm text-muted">
                        {tx.targetPhone || "—"}
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

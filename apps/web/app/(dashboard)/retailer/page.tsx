import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  lt,
  notInArray,
  sum,
} from "drizzle-orm";
import { Activity, ArrowRight, CheckCircle2, TrendingUp, Wallet } from "lucide-react";
import { Link, Table } from "@heroui/react";
import { db, transaction } from "@repo/db";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { StatCard } from "@/components/admin/stat-card";
import { TransactionStatusChip } from "@/components/admin/transaction-status-chip";
import { Money } from "@/components/money";
import { formatInr } from "@/lib/format-money";
import { requireRetailer } from "@/lib/retailer-auth";
import {
  buildRetailerRechargeActivityFilter,
  buildRetailerRechargeVolumeFilter,
} from "@/lib/retailer-recharge-volume";
import { computePercentChange, getDayBounds } from "@/lib/stat-trend";
import { operatorLabel } from "@/lib/transaction-label";
import { LEDGER_EXCLUDED_OPERATORS } from "@/lib/transaction-filters";
import { formatTableDateTime } from "@/lib/utils";

export default async function RetailerOverviewPage() {
  const retailer = await requireRetailer();
  const now = new Date();
  const { todayStart, yesterdayStart } = getDayBounds(now);

  const rechargeVolumeFilter = buildRetailerRechargeVolumeFilter(retailer.id);
  const rechargeActivityFilter = buildRetailerRechargeActivityFilter(retailer.id);

  const [volumeRows, countRows, todaysVolumeRows] = await Promise.all([
    db.select({ total: sum(transaction.amount) }).from(transaction).where(rechargeVolumeFilter),
    db.select({ count: count() }).from(transaction).where(rechargeVolumeFilter),
    db
      .select({ total: sum(transaction.amount) })
      .from(transaction)
      .where(and(rechargeVolumeFilter, gte(transaction.createdAt, todayStart))),
  ]);

  const totalVolume = Number(volumeRows[0]?.total ?? 0);
  const totalRecharges = countRows[0]?.count ?? 0;
  const todaysVolume = Number(todaysVolumeRows[0]?.total ?? 0);

  const [
    [todaysInflowRow],
    [yesterdaysInflowRow],
    [totalEarningsRow],
    [todaysEarningsRow],
  ] =
    await Promise.all([
      db
        .select({ total: sum(transaction.amount) })
        .from(transaction)
        .where(
          and(
            eq(transaction.userId, retailer.id),
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
            eq(transaction.userId, retailer.id),
            eq(transaction.operator, "FUNDS_RECEIVED"),
            eq(transaction.status, "SUCCESS"),
            gte(transaction.createdAt, yesterdayStart),
            lt(transaction.createdAt, todayStart),
          ),
        ),
      db
        .select({ total: sum(transaction.retailerCommission) })
        .from(transaction)
        .where(and(eq(transaction.userId, retailer.id), gt(transaction.retailerCommission, 0))),
      db
        .select({ total: sum(transaction.retailerCommission) })
        .from(transaction)
        .where(
          and(
            eq(transaction.userId, retailer.id),
            gt(transaction.retailerCommission, 0),
            gte(transaction.createdAt, todayStart),
          ),
        ),
    ]);

  const todayResolved = await db
    .select({ status: transaction.status })
    .from(transaction)
    .where(and(rechargeActivityFilter, gte(transaction.createdAt, todayStart)));
  const yesterdayResolved = await db
    .select({ status: transaction.status })
    .from(transaction)
    .where(
      and(
        rechargeActivityFilter,
        gte(transaction.createdAt, yesterdayStart),
        lt(transaction.createdAt, todayStart),
      ),
    );

  const successCount = todayResolved.filter((t) => t.status === "SUCCESS").length;
  const totalResolved = todayResolved.length;
  const successRate =
    totalResolved > 0 ? Math.round((successCount / totalResolved) * 100) : 100;
  const yesterdaySuccessCount = yesterdayResolved.filter(
    (t) => t.status === "SUCCESS",
  ).length;
  const yesterdaySuccessRate =
    yesterdayResolved.length > 0
      ? Math.round((yesterdaySuccessCount / yesterdayResolved.length) * 100)
      : 100;

  const todaysInflow = Number(todaysInflowRow?.total ?? 0);
  const yesterdaysInflow = Number(yesterdaysInflowRow?.total ?? 0);
  const totalEarnings = Number(totalEarningsRow?.total ?? 0);
  const todaysEarnings = Number(todaysEarningsRow?.total ?? 0);
  const volumeThroughYesterday = totalVolume - todaysVolume;
  const earningsThroughYesterday = totalEarnings - todaysEarnings;

  const walletTrend = computePercentChange(todaysInflow, yesterdaysInflow);
  const volumeTrend = computePercentChange(totalVolume, volumeThroughYesterday);
  const successRateTrend = computePercentChange(successRate, yesterdaySuccessRate);
  const earningsTrend = computePercentChange(
    totalEarnings,
    earningsThroughYesterday,
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
        eq(transaction.userId, retailer.id),
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
          Your wallet, recharge activity, and latest transactions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Available for recharges"
          icon={Wallet}
          title="Wallet balance"
          trendPercent={walletTrend}
          value={formatInr(retailer.balance)}
        />
        <StatCard
          description={`${formatInr(todaysVolume)} today · ${String(totalRecharges)} successful`}
          icon={Activity}
          title="Recharge volume"
          trendPercent={volumeTrend}
          value={formatInr(totalVolume)}
        />
        <StatCard
          description={`${successCount} of ${totalResolved} recharges today`}
          icon={CheckCircle2}
          title="Success rate"
          trendPercent={successRateTrend}
          value={`${successRate}%`}
        />
        <StatCard
          description={`${formatInr(todaysEarnings, { fractionDigits: 2 })} today`}
          icon={TrendingUp}
          title="Total earnings"
          trendPercent={earningsTrend}
          value={formatInr(totalEarnings, { fractionDigits: 2 })}
        />
      </div>

      <AdminTableCard
        description="Your latest recharge activity."
        headerAction={
          <Link
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium"
            href="/retailer/ledger"
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
              <Table.Content aria-label="Recent transactions" className="min-w-[560px]">
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
                      <Table.Cell className="font-medium">
                        {operatorLabel(tx.operator)}
                      </Table.Cell>
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

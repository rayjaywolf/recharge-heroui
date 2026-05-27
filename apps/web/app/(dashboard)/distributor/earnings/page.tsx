import { Table } from "@heroui/react";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { EarningsFilterBar } from "@/components/admin/earnings-filter-bar";
import { EarningsDownloadButton } from "@/components/admin/earnings-download-button";
import { Money } from "@/components/money";
import { StatCard } from "@/components/admin/stat-card";
import { TransactionStatusChip } from "@/components/admin/transaction-status-chip";
import { fetchDistributorEarnings } from "@/lib/distributor-earnings-query";
import { formatInr } from "@/lib/format-money";
import { formatTableDateTime } from "@/lib/utils";

function pickSearchParams(
  resolved: { [key: string]: string | string[] | undefined },
) {
  return {
    status: resolved.status as string | undefined,
    operator: resolved.operator as string | undefined,
    search: resolved.search as string | undefined,
    dateFrom: resolved.dateFrom as string | undefined,
    dateTo: resolved.dateTo as string | undefined,
    sort: resolved.sort as string | undefined,
  };
}

export default async function DistributorEarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const query = pickSearchParams(resolvedParams);
  const { rows, status, sort, stats } = await fetchDistributorEarnings(query);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Earnings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Commissions from your own recharges and from retailers in your network.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total earnings"
          trendPercent={stats.earningsTrend}
          value={formatInr(stats.totalEarnings, { fractionDigits: 2 })}
        />
        <StatCard
          title="Today's earnings"
          trendPercent={stats.earningsTrend}
          value={formatInr(stats.todaysEarnings, { fractionDigits: 2 })}
        />
        <StatCard
          title="Recharge volume"
          trendPercent={stats.volumeTrend}
          value={formatInr(stats.totalVolume, { fractionDigits: 0 })}
        />
        <StatCard
          title="Today's volume"
          trendPercent={stats.volumeTrend}
          value={formatInr(stats.todaysVolume, { fractionDigits: 0 })}
        />
      </div>

      <EarningsFilterBar
        basePath="/distributor/earnings"
        initialDateFrom={query.dateFrom || ""}
        initialDateTo={query.dateTo || ""}
        initialOperator={query.operator || "ALL"}
        initialSearch={query.search || ""}
        initialSort={sort}
        initialStatus={status}
        variant="distributor"
      />

      <AdminTableCard
        description={
          rows.length > 0
            ? `Showing up to ${rows.length} matching earning transactions.`
            : "Adjust filters to find earning transactions."
        }
        headerAction={
          <EarningsDownloadButton
            data={rows}
            fileName="distributor-earnings"
            variant="distributor"
          />
        }
        title="Network earnings"
      >
        {rows.length === 0 ? (
          <AdminTableEmpty message="No earnings recorded yet." />
        ) : (
          <Table>
            <Table.ScrollContainer className="max-h-[min(70vh,720px)]">
              <Table.Content
                aria-label="Distributor earnings"
                className="min-w-[800px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Date & time</Table.Column>
                  <Table.Column>Source</Table.Column>
                  <Table.Column>Operator</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column className="text-right">Recharge amount</Table.Column>
                  <Table.Column className="text-right">Your margin</Table.Column>
                  <Table.Column className="text-right">Your cut</Table.Column>
                </Table.Header>
                <Table.Body>
                  {rows.map((tx) => (
                    <Table.Row key={tx.id} className="whitespace-nowrap">
                      <Table.Cell className="whitespace-nowrap text-sm text-muted">
                        {formatTableDateTime(tx.createdAt)}
                      </Table.Cell>
                      <Table.Cell className="font-medium">{tx.user.name}</Table.Cell>
                      <Table.Cell>{tx.operator}</Table.Cell>
                      <Table.Cell>
                        <TransactionStatusChip status={tx.status} />
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <Money amount={tx.amount} fractionDigits={0} />
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {tx.amount > 0 && tx.commission > 0
                          ? `${((tx.commission / tx.amount) * 100).toFixed(2)}%`
                          : "—"}
                      </Table.Cell>
                      <Table.Cell className="text-right font-semibold">
                        <Money
                          amount={tx.commission}
                          className="text-success"
                          sign="+"
                        />
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

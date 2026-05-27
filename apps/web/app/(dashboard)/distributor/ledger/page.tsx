import { fetchDistributorLedger } from "@/lib/distributor-ledger-query";

import { TransactionsFilterBar } from "@/components/admin/transactions-filter-bar";
import { TransactionsDownloadButton } from "@/components/admin/transactions-download-button";
import { DistributorLedgerTable } from "@/components/distributor/distributor-ledger-table";
import { LedgerRefreshPendingButton } from "@/components/distributor/ledger-refresh-pending-button";

function pickSearchParams(
  resolved: { [key: string]: string | string[] | undefined },
) {
  return {
    status: resolved.status as string | undefined,
    operator: resolved.operator as string | undefined,
    search: resolved.search as string | undefined,
    dateFrom: resolved.dateFrom as string | undefined,
    dateTo: resolved.dateTo as string | undefined,
    type: resolved.type as string | undefined,
    sort: resolved.sort as string | undefined,
  };
}

export default async function DistributorLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const query = pickSearchParams(resolvedParams);
  const { rows, type, status, sort } = await fetchDistributorLedger(query);

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Ledger
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your wallet and transaction history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LedgerRefreshPendingButton />
        <TransactionsDownloadButton
          data={rows}
          fileName="distributor-ledger"
          variant="distributor"
        />
        </div>
      </div>

      <TransactionsFilterBar
        basePath="/distributor/ledger"
        defaultType="ALL"
        emphasizeSearch
        initialDateFrom={query.dateFrom || ""}
        initialDateTo={query.dateTo || ""}
        initialOperator={query.operator || "ALL"}
        initialSearch={query.search || ""}
        initialSort={sort}
        initialStatus={status}
        initialType={type}
      />

      <DistributorLedgerTable transactions={rows} />
    </div>
  );
}

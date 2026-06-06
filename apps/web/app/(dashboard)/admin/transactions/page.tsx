import { fetchAdminTransactions } from "@/lib/admin-transactions-query";
import { searchParamsToQueryString } from "@/lib/table-pagination";

import { LedgerRefreshPendingButton } from "@/components/distributor/ledger-refresh-pending-button";
import { TablePagination } from "@/components/admin/table-pagination";
import { TransactionsFilterBar } from "@/components/admin/transactions-filter-bar";
import { TransactionsDownloadButton } from "@/components/admin/transactions-download-button";
import { TransactionsTable } from "@/components/admin/transactions-table";

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
    page: resolved.page as string | undefined,
  };
}

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const query = pickSearchParams(resolvedParams);
  const [{ rows, type, status, sort, totalCount, page, pageSize }, exportData] =
    await Promise.all([
      fetchAdminTransactions(query, { paginate: true }),
      fetchAdminTransactions(query, { exportAll: true }),
    ]);

  const queryParams = searchParamsToQueryString({
    status: status !== "ALL" ? status : undefined,
    operator:
      query.operator && query.operator !== "ALL" ? query.operator : undefined,
    search: query.search?.trim() || undefined,
    dateFrom: query.dateFrom || undefined,
    dateTo: query.dateTo || undefined,
    type: type !== "RECHARGE" ? type : undefined,
    sort: sort !== "date_desc" ? sort : undefined,
  });
  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Ledger
          </h1>
          <p className="mt-1 text-sm text-muted">
            View recharge and ledger activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LedgerRefreshPendingButton endpoint="/api/admin/sync-pending" />
          <TransactionsDownloadButton data={exportData.rows} />
        </div>
      </div>

      <TransactionsFilterBar
        initialDateFrom={query.dateFrom || ""}
        initialDateTo={query.dateTo || ""}
        initialOperator={query.operator || "ALL"}
        initialSearch={query.search || ""}
        initialSort={sort}
        initialStatus={status}
        initialType={type}
      />

      <div>
        <TransactionsTable transactions={rows} />
        <TablePagination
          basePath="/admin/transactions"
          page={page}
          queryParams={queryParams}
          totalCount={totalCount}
        />
      </div>
    </div>
  );
}

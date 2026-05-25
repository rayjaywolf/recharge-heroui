import { fetchAdminTransactions } from "@/lib/admin-transactions-query";

import { TransactionsFilterBar } from "@/components/admin/transactions-filter-bar";
import { TransactionsDownloadButton } from "@/components/admin/transactions-download-button";
import { TransactionsTable } from "@/components/admin/transactions-table";

function pickSearchParams(
  resolved: { [key: string]: string | string[] | undefined }
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

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const query = pickSearchParams(resolvedParams);
  const { rows, type, status, sort } = await fetchAdminTransactions(query);

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
        <TransactionsDownloadButton data={rows} />
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

      <TransactionsTable transactions={rows} />
    </div>
  );
}

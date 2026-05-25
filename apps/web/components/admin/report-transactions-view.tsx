import {
  fetchAdminTransactions,
  type AdminTransactionsSearchParams,
  type FetchAdminTransactionsOptions,
} from "@/lib/admin-transactions-query";

import { BackToReportsLink } from "@/components/admin/back-to-reports-link";
import { TransactionsFilterBar } from "@/components/admin/transactions-filter-bar";
import { TransactionsDownloadButton } from "@/components/admin/transactions-download-button";
import { TransactionsTable } from "@/components/admin/transactions-table";

export async function ReportTransactionsView({
  title,
  description,
  basePath,
  searchParams,
  fetchOptions,
  filterOptions,
  downloadFileName,
}: {
  title: string;
  description: string;
  basePath: string;
  searchParams: AdminTransactionsSearchParams;
  fetchOptions?: FetchAdminTransactionsOptions;
  filterOptions?: {
    lockedType?: "RECHARGE" | "FUNDS" | "ALL";
    lockedStatus?: string;
    showCategoryDropdown?: boolean;
    defaultType?: "RECHARGE" | "FUNDS" | "ALL";
    emphasizeSearch?: boolean;
  };
  downloadFileName: string;
}) {
  const { rows, type, status, sort } = await fetchAdminTransactions(
    searchParams,
    fetchOptions
  );

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BackToReportsLink />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <TransactionsDownloadButton data={rows} fileName={downloadFileName} />
      </div>

      <TransactionsFilterBar
        basePath={basePath}
        defaultType={filterOptions?.defaultType ?? "RECHARGE"}
        emphasizeSearch={filterOptions?.emphasizeSearch}
        initialDateFrom={searchParams.dateFrom || ""}
        initialDateTo={searchParams.dateTo || ""}
        initialOperator={searchParams.operator || "ALL"}
        initialSearch={searchParams.search || ""}
        initialSort={sort}
        initialStatus={status}
        initialType={type}
        lockedStatus={filterOptions?.lockedStatus}
        lockedType={filterOptions?.lockedType}
        showCategoryDropdown={filterOptions?.showCategoryDropdown ?? !filterOptions?.lockedType}
      />

      <TransactionsTable transactions={rows} />
    </div>
  );
}

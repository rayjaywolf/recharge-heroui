import type { AdminTransactionsSearchParams } from "@/lib/admin-transactions-query";

export function parseReportSearchParams(
  resolved: { [key: string]: string | string[] | undefined }
): AdminTransactionsSearchParams {
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

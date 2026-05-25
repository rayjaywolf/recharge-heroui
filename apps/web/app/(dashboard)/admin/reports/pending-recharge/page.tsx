import { ReportTransactionsView } from "@/components/admin/report-transactions-view";
import { parseReportSearchParams } from "@/lib/report-search-params";

const BASE = "/admin/reports/pending-recharge";

export default async function PendingRechargeReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = parseReportSearchParams(await searchParams);

  return (
    <ReportTransactionsView
      basePath={BASE}
      description="Mobile recharges that are still pending with the operator or gateway."
      downloadFileName="pending-recharge-report"
      fetchOptions={{ lockedType: "RECHARGE", lockedStatus: "PENDING" }}
      filterOptions={{
        lockedType: "RECHARGE",
        lockedStatus: "PENDING",
        showCategoryDropdown: false,
      }}
      searchParams={query}
      title="Pending recharge"
    />
  );
}

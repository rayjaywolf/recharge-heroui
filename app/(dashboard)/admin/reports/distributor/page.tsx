import { BackToReportsLink } from "@/components/admin/back-to-reports-link";
import { UserReportTable } from "@/components/admin/user-report-table";
import { fetchUserReportRows } from "@/lib/user-report";

export default async function DistributorReportPage() {
  const rows = await fetchUserReportRows("DISTRIBUTOR");

  return (
    <div className="space-y-6">
      <div>
        <BackToReportsLink />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Distributor report
        </h1>
        <p className="mt-1 text-sm text-muted">
          Balances, retailer counts, and recharge volume for each distributor.
        </p>
      </div>

      <UserReportTable
        downloadFileName="distributor-report"
        rows={rows}
        showRetailerCount
        title="Distributors"
      />
    </div>
  );
}

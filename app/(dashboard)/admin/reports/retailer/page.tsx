import { BackToReportsLink } from "@/components/admin/back-to-reports-link";
import { UserReportTable } from "@/components/admin/user-report-table";
import { fetchUserReportRows } from "@/lib/user-report";

export default async function RetailerReportPage() {
  const rows = await fetchUserReportRows("RETAILER");

  return (
    <div className="space-y-6">
      <div>
        <BackToReportsLink />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Retailer report
        </h1>
        <p className="mt-1 text-sm text-muted">
          Balances, parent distributor, and recharge volume for each retailer.
        </p>
      </div>

      <UserReportTable
        downloadFileName="retailer-report"
        rows={rows}
        showDistributor
        title="Retailers"
      />
    </div>
  );
}

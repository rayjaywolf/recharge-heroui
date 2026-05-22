import { BackToReportsLink } from "@/components/admin/back-to-reports-link";
import { UserReportTable } from "@/components/admin/user-report-table";
import { fetchUserReportRows } from "@/lib/user-report";

export default async function AccountReportPage() {
  const rows = await fetchUserReportRows(["ADMIN", "DISTRIBUTOR", "RETAILER"]);

  return (
    <div className="space-y-6">
      <div>
        <BackToReportsLink />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Account report
        </h1>
        <p className="mt-1 text-sm text-muted">
          Wallet balances, earnings, and recharge activity for every account.
        </p>
      </div>

      <UserReportTable
        downloadFileName="account-report"
        rows={rows}
        showDistributor
        showRetailerCount
        title="All accounts"
      />
    </div>
  );
}

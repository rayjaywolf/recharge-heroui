import { RetailerFundingReportView } from "@/components/admin/retailer-funding-report-view";
import { fetchRetailerFundingReportData } from "@/lib/retailer-funding-report-query";

export const metadata = {
  title: "Credits Funded to Retailers | Admin Reports",
};

export default async function RetailerFundingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;
  const initialParams = {
    dateFrom:
      typeof resolved.dateFrom === "string" ? resolved.dateFrom : undefined,
    dateTo: typeof resolved.dateTo === "string" ? resolved.dateTo : undefined,
    retailerId:
      typeof resolved.retailerId === "string" ? resolved.retailerId : undefined,
    source: typeof resolved.source === "string" ? resolved.source : undefined,
    search: typeof resolved.search === "string" ? resolved.search : undefined,
    sort: typeof resolved.sort === "string" ? resolved.sort : undefined,
    preset: typeof resolved.preset === "string" ? resolved.preset : undefined,
  };

  const { rows, retailers } = await fetchRetailerFundingReportData();

  return (
    <RetailerFundingReportView
      initialParams={initialParams}
      retailers={retailers}
      rows={rows}
    />
  );
}


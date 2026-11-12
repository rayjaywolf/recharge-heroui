import { redirect } from "next/navigation";

export default async function CreditsFundedReportRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string") {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  redirect(qs ? `/admin/reports/retailer-funding?${qs}` : "/admin/reports/retailer-funding");
}


import { Plus } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { DistributorRetailersTable } from "@/components/distributor/distributor-retailers-table";
import { fetchDistributorRetailers } from "@/lib/distributor-retailers";

export default async function DistributorRetailersPage() {
  const retailers = await fetchDistributorRetailers();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Retailers
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage your network of retailers.
          </p>
        </div>
        <ButtonLink
          className="inline-flex items-center gap-2"
          href="/distributor/retailers/add"
          variant="primary"
        >
          <Plus className="size-4" aria-hidden />
          Add retailer
        </ButtonLink>
      </div>

      <DistributorRetailersTable initialData={retailers} />
    </div>
  );
}

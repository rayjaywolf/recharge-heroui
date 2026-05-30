import { and, desc, eq } from "drizzle-orm";
import { fundRequest, user } from "@repo/db";

import { DistributorFundRequestsTable } from "@/components/distributor/distributor-fund-requests-table";
import { requireDistributor } from "@/lib/distributor-retailers";
import { db } from "@repo/db";

export default async function DistributorFundsPage() {
  const distributor = await requireDistributor();

  const pendingRequests = await db
    .select({
      id: fundRequest.id,
      amount: fundRequest.amount,
      remarks: fundRequest.remarks,
      createdAt: fundRequest.createdAt,
      retailerName: user.name,
    })
    .from(fundRequest)
    .innerJoin(user, eq(fundRequest.retailerId, user.id))
    .where(
      and(
        eq(fundRequest.distributorId, distributor.id),
        eq(fundRequest.status, "PENDING"),
      ),
    )
    .orderBy(desc(fundRequest.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Funds
        </h1>
        <p className="mt-1 text-sm text-muted">
          Approve or reject retailer fund requests from your wallet.
        </p>
      </div>

      <DistributorFundRequestsTable
        requests={pendingRequests.map((row) => ({
          id: row.id,
          retailerName: row.retailerName,
          amount: row.amount,
          remarks: row.remarks,
          createdAt: row.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

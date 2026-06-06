import { and, count, eq, isNull } from "drizzle-orm";
import { db, fundRequest } from "@repo/db";

export async function getPendingFundRequestsCount(
  distributorId: string,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(fundRequest)
    .where(
      and(
        eq(fundRequest.distributorId, distributorId),
        eq(fundRequest.status, "PENDING"),
      ),
    );
  return row?.total ?? 0;
}

/** Retailers without a distributor — routed to admin for approval. */
export async function getPendingDirectFundRequestsCount(): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(fundRequest)
    .where(
      and(
        isNull(fundRequest.distributorId),
        eq(fundRequest.status, "PENDING"),
      ),
    );
  return row?.total ?? 0;
}

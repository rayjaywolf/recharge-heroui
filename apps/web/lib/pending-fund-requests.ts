import { and, count, eq } from "drizzle-orm";
import { fundRequest } from "@repo/db";
import { db } from "@repo/db";

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

import { and, count, eq, ne } from "drizzle-orm";
import { db, user } from "@repo/db";

export const pendingApprovalsWhere = and(
  eq(user.isApproved, false),
  eq(user.isRejected, false),
  ne(user.role, "ADMIN"),
);

export async function getPendingApprovalsCount() {
  const [row] = await db
    .select({ count: count() })
    .from(user)
    .where(pendingApprovalsWhere);
  return row?.count ?? 0;
}

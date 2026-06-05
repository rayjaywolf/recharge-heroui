import { and, asc, eq, isNotNull, sql, sum } from "drizzle-orm";
import { db as defaultDb, transaction, user } from "@repo/db";

// Accept both the root DB client and Drizzle transactions.
// We keep this structural to avoid leaking concrete driver types.
type DbClient = Pick<
  typeof defaultDb,
  "select" | "update" | "delete" | "insert" | "transaction"
>;

/** Oldest admin account receives platform admin commission credits. */
export async function findPrimaryAdminId(db: DbClient): Promise<string | null> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "ADMIN"))
    .orderBy(asc(user.createdAt))
    .limit(1);

  return row?.id ?? null;
}

export async function creditAdminCommission(
  db: DbClient,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  const adminId = await findPrimaryAdminId(db);
  if (!adminId) return;

  await db
    .update(user)
    .set({ earnings: sql`${user.earnings} + ${amount}` })
    .where(eq(user.id, adminId));
}

export async function debitAdminCommission(
  db: DbClient,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  const adminId = await findPrimaryAdminId(db);
  if (!adminId) return;

  await db
    .update(user)
    .set({ earnings: sql`${user.earnings} - ${amount}` })
    .where(eq(user.id, adminId));
}

/**
 * Authoritative lifetime earnings from SUCCESS transactions.
 * - Retailers: sum(retailerCommission) on their recharges
 * - Distributors: network distributorCommission + own retailerCommission
 * - Primary admin: platform adminCommission + own retailerCommission (if any)
 */
export async function computeUserEarningsMap(
  db: DbClient = defaultDb,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  const add = (userId: string, amount: number) => {
    if (amount <= 0) return;
    map.set(userId, (map.get(userId) ?? 0) + amount);
  };

  const retailerRows = await db
    .select({
      userId: transaction.userId,
      total: sum(transaction.retailerCommission),
    })
    .from(transaction)
    .where(eq(transaction.status, "SUCCESS"))
    .groupBy(transaction.userId);

  for (const row of retailerRows) {
    add(row.userId, Number(row.total ?? 0));
  }

  const distributorRows = await db
    .select({
      distributorId: user.distributorId,
      total: sum(transaction.distributorCommission),
    })
    .from(transaction)
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(
      and(eq(transaction.status, "SUCCESS"), isNotNull(user.distributorId)),
    )
    .groupBy(user.distributorId);

  for (const row of distributorRows) {
    if (row.distributorId) {
      add(row.distributorId, Number(row.total ?? 0));
    }
  }

  const [adminTotalRow] = await db
    .select({ total: sum(transaction.adminCommission) })
    .from(transaction)
    .where(eq(transaction.status, "SUCCESS"));

  const primaryAdminId = await findPrimaryAdminId(db);
  if (primaryAdminId) {
    add(primaryAdminId, Number(adminTotalRow?.total ?? 0));
  }

  return map;
}

export async function getUserEarnings(
  db: DbClient,
  userId: string,
): Promise<number> {
  const map = await computeUserEarningsMap(db);
  return map.get(userId) ?? 0;
}

/** Rewrites user.earnings from transaction history (fixes drift after manual DB ops). */
export async function reconcileUserEarnings(
  db: DbClient = defaultDb,
): Promise<{ updated: number }> {
  const computed = await computeUserEarningsMap(db);
  const allUsers = await db.select({ id: user.id }).from(user);

  let updated = 0;
  for (const row of allUsers) {
    const next = computed.get(row.id) ?? 0;
    await db.update(user).set({ earnings: next }).where(eq(user.id, row.id));
    updated += 1;
  }

  return { updated };
}

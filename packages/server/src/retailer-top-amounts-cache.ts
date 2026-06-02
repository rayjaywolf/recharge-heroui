import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { createId, db, retailerTopAmountsCache, transaction } from "@repo/db";

const RECHARGE_EXCLUDED_OPERATORS = [
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "FUNDS_SENT",
  "FUNDS_RECEIVED",
] as const;

const DEFAULT_TTL_DAYS = 7;

function topAmountsTtlMs(): number {
  const raw = process.env.RETAILER_TOP_AMOUNTS_TTL_DAYS?.trim();
  const days = raw ? Number(raw) : DEFAULT_TTL_DAYS;
  if (!Number.isFinite(days) || days <= 0) {
    return DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000;
  }
  return days * 24 * 60 * 60 * 1000;
}

async function computeTopAmounts(
  userId: string,
  operator: string,
): Promise<number[]> {
  const rows = await db
    .select({
      amount: transaction.amount,
      rechargeCount: sql<number>`count(*)::int`,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.operator, operator),
        eq(transaction.status, "SUCCESS"),
        notInArray(transaction.operator, [...RECHARGE_EXCLUDED_OPERATORS]),
      ),
    )
    .groupBy(transaction.amount)
    .orderBy(desc(sql`count(*)`), desc(transaction.amount))
    .limit(3);

  return rows.map((row) => row.amount);
}

export async function getRetailerTopAmounts(params: {
  userId: string;
  operator: string;
}): Promise<{ amounts: number[]; cached: boolean }> {
  const operator = params.operator.trim();
  if (!operator) {
    return { amounts: [], cached: false };
  }

  const now = new Date();
  const existing = await db
    .select()
    .from(retailerTopAmountsCache)
    .where(
      and(
        eq(retailerTopAmountsCache.userId, params.userId),
        eq(retailerTopAmountsCache.operator, operator),
      ),
    )
    .limit(1);

  const row = existing[0];
  if (row && row.expiresAt > now) {
    const parsed = JSON.parse(row.amounts) as unknown;
    const amounts = Array.isArray(parsed)
      ? parsed
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      : [];
    return { amounts, cached: true };
  }

  const amounts = await computeTopAmounts(params.userId, operator);
  const fetchedAt = now;
  const expiresAt = new Date(fetchedAt.getTime() + topAmountsTtlMs());
  const payload = JSON.stringify(amounts);

  if (row) {
    await db
      .update(retailerTopAmountsCache)
      .set({ amounts: payload, fetchedAt, expiresAt })
      .where(eq(retailerTopAmountsCache.id, row.id));
  } else {
    await db.insert(retailerTopAmountsCache).values({
      id: createId(),
      userId: params.userId,
      operator,
      amounts: payload,
      fetchedAt,
      expiresAt,
    });
  }

  return { amounts, cached: false };
}

export async function invalidateRetailerTopAmountsCache(
  userId: string,
  operator: string,
): Promise<void> {
  const trimmed = operator.trim();
  if (!trimmed) return;

  await db
    .delete(retailerTopAmountsCache)
    .where(
      and(
        eq(retailerTopAmountsCache.userId, userId),
        eq(retailerTopAmountsCache.operator, trimmed),
      ),
    );
}

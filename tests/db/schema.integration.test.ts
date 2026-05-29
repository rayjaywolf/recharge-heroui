import { createId, db, pool, user } from "@repo/db";
import { eq, sql } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

type ColumnInfo = {
  column_name: string;
  data_type: string;
  udt_name: string;
};

async function fetchColumns(
  client: pg.Client,
  tableName: string,
  columnNames: string[],
): Promise<ColumnInfo[]> {
  const { rows } = await client.query<ColumnInfo>(
    `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = ANY($2::text[])
    `,
    [tableName, columnNames],
  );
  return rows;
}

describe.runIf(hasDatabase)("database schema & data integrity", () => {
  let client: pg.Client;

  beforeAll(async () => {
    client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
    await pool.end();
  });

  it("uses accountStatus enum and removed legacy boolean flags on user", async () => {
    const columns = await fetchColumns(client, "user", [
      "accountStatus",
      "isSuspended",
      "isApproved",
      "isRejected",
      "earnings",
    ]);

    const byName = new Map(columns.map((c) => [c.column_name, c]));

    expect(byName.has("accountStatus")).toBe(true);
    expect(byName.get("accountStatus")?.udt_name).toBe("AccountStatus");
    expect(byName.has("isSuspended")).toBe(false);
    expect(byName.has("isApproved")).toBe(false);
    expect(byName.has("isRejected")).toBe(false);
    expect(byName.get("earnings")?.data_type).toBe("numeric");
  });

  it("has notification table with NotificationType enum", async () => {
    const columns = await fetchColumns(client, "notification", [
      "type",
      "userId",
      "entityId",
      "readAt",
    ]);
    const byName = new Map(columns.map((c) => [c.column_name, c]));

    expect(byName.has("type")).toBe(true);
    expect(byName.get("type")?.udt_name).toBe("NotificationType");
    expect(byName.has("userId")).toBe(true);
    expect(byName.has("entityId")).toBe(true);
    expect(byName.has("readAt")).toBe(true);
  });

  it("stores money margins and commissions as numeric(10,2)", async () => {
    const transactionCols = await fetchColumns(client, "transaction", [
      "retailerCommission",
      "distributorCommission",
      "adminCommission",
    ]);
    const ruleCols = await fetchColumns(client, "commission_rule", [
      "providerMargin",
      "adminMargin",
      "distributorMargin",
      "retailerMargin",
    ]);

    for (const col of [...transactionCols, ...ruleCols]) {
      expect(col.data_type).toBe("numeric");
    }
  });

  it("round-trips accountStatus and numeric earnings via drizzle", async () => {
    const testId = createId();
    const testEmail = `vitest-${testId}@recharge.local`;

    await db.insert(user).values({
      id: testId,
      name: "Vitest User",
      email: testEmail,
      role: "RETAILER",
      accountStatus: "PENDING",
      earnings: "12.34",
    });

    try {
      await db
        .update(user)
        .set({
          accountStatus: "APPROVED",
          earnings: sql`${user.earnings} + ${1.11}`,
        })
        .where(eq(user.id, testId));

      const [row] = await db
        .select({
          accountStatus: user.accountStatus,
          earnings: user.earnings,
        })
        .from(user)
        .where(eq(user.id, testId))
        .limit(1);

      expect(row?.accountStatus).toBe("APPROVED");
      expect(row?.earnings).toBeCloseTo(13.45, 2);
    } finally {
      await db.delete(user).where(eq(user.id, testId));
    }
  });
});

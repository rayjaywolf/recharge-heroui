import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  commissionRule,
  createId,
  db,
  transaction,
  user,
} from "@repo/db";
import { settlePendingTransaction } from "../../packages/server/src/pending-recharge-sync";

const hasDatabase = Boolean(process.env.DATABASE_URL);

type Parsed = {
  finalStatus: "SUCCESS" | "FAILED" | "PENDING";
  apiMessage: string;
  apiReferenceId: string | null;
  shouldRefund: boolean;
};

async function createRetailerFixture() {
  const retailerId = createId();
  const operator = `TEST_OP_${createId().slice(0, 8)}`;
  const txId = createId();
  const email = `money-${retailerId}@recharge.local`;

  await db.insert(user).values({
    id: retailerId,
    name: "Money Test Retailer",
    email,
    role: "RETAILER",
    accountStatus: "APPROVED",
    balance: 1000,
    earnings: "0",
  });

  await db.insert(commissionRule).values({
    id: createId(),
    operator,
    providerMargin: 4,
    adminMargin: 1,
    distributorMargin: 1,
    retailerMargin: 2,
  });

  await db.insert(transaction).values({
    id: txId,
    userId: retailerId,
    targetPhone: "9999999999",
    operator,
    amount: 100,
    provider: "REALROBO",
    status: "PENDING",
  });

  const [tx] = await db
    .select()
    .from(transaction)
    .where(eq(transaction.id, txId))
    .limit(1);

  if (!tx) {
    throw new Error("Failed to create transaction fixture");
  }

  const cleanup = async () => {
    await db.delete(transaction).where(eq(transaction.id, txId));
    await db.delete(commissionRule).where(eq(commissionRule.operator, operator));
    await db.delete(user).where(eq(user.id, retailerId));
  };

  return { tx, retailerId, txId, cleanup };
}

describe.runIf(hasDatabase)("money flow safety", () => {
  it("settlePendingTransaction refunds only once on repeated FAILED settle", async () => {
    const fixture = await createRetailerFixture();
    const failed: Parsed = {
      finalStatus: "FAILED",
      apiMessage: "Provider failure",
      apiReferenceId: "fail-ref",
      shouldRefund: true,
    };

    try {
      const first = await settlePendingTransaction(fixture.tx, failed);
      const second = await settlePendingTransaction(fixture.tx, failed);

      const [retailer] = await db
        .select({ balance: user.balance })
        .from(user)
        .where(eq(user.id, fixture.retailerId))
        .limit(1);

      expect(first).toBe("updated");
      expect(second).toBe("unchanged");
      expect(retailer?.balance).toBe(1100);
    } finally {
      await fixture.cleanup();
    }
  });

  it("settlePendingTransaction credits earnings only once on repeated SUCCESS settle", async () => {
    const fixture = await createRetailerFixture();
    const success: Parsed = {
      finalStatus: "SUCCESS",
      apiMessage: "Provider success",
      apiReferenceId: "ok-ref",
      shouldRefund: false,
    };

    try {
      const first = await settlePendingTransaction(fixture.tx, success);
      const second = await settlePendingTransaction(fixture.tx, success);

      const [retailer] = await db
        .select({ earnings: user.earnings, balance: user.balance })
        .from(user)
        .where(eq(user.id, fixture.retailerId))
        .limit(1);

      expect(first).toBe("updated");
      expect(second).toBe("unchanged");
      expect(retailer?.earnings).toBeCloseTo(2, 2);
      expect(retailer?.balance).toBe(1000);
    } finally {
      await fixture.cleanup();
    }
  });

  it("CAS update pattern prevents double settlement when status already changed", async () => {
    const fixture = await createRetailerFixture();

    try {
      const [first] = await db
        .update(transaction)
        .set({ status: "SUCCESS", apiMessage: "settled first" })
        .where(
          and(
            eq(transaction.id, fixture.txId),
            eq(transaction.status, "PENDING"),
          ),
        )
        .returning({ id: transaction.id });

      const [second] = await db
        .update(transaction)
        .set({ status: "FAILED", apiMessage: "stale writer" })
        .where(
          and(
            eq(transaction.id, fixture.txId),
            eq(transaction.status, "PENDING"),
          ),
        )
        .returning({ id: transaction.id });

      const [latest] = await db
        .select({ status: transaction.status, apiMessage: transaction.apiMessage })
        .from(transaction)
        .where(eq(transaction.id, fixture.txId))
        .limit(1);

      expect(first?.id).toBe(fixture.txId);
      expect(second).toBeUndefined();
      expect(latest?.status).toBe("SUCCESS");
      expect(latest?.apiMessage).toBe("settled first");
    } finally {
      await fixture.cleanup();
    }
  });
});

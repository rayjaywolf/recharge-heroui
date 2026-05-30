import { and, eq, isNull } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createId, db, notification, pool, user } from "@repo/db";
import {
  getUnreadNotificationCount,
  listNotificationsForUser,
  markNotificationsReadForEntity,
  notifyDistributorDisputePending,
  notifyDistributorDisputeResolved,
  notifyDistributorFundRequestPending,
  notifyDistributorRechargeSettled,
  notifyDistributorRetailerApproved,
  notifyDistributorRetailerRejected,
  notifyDistributorRetailerRestored,
  notifyDistributorRetailerSuspended,
  notifyDistributorWalletCredited,
  notifyDistributorWalletDebited,
  notifyRetailerAccountApproved,
  notifyRetailerDisputeResolved,
  notifyRetailerFundRequestApproved,
  notifyRetailerRechargeSettled,
  notifyRetailerWalletCredited,
} from "../../packages/server/src/notifications";

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function createDistributorFixture() {
  const id = createId();
  await db.insert(user).values({
    id,
    name: `Vitest Distributor ${id.slice(0, 6)}`,
    email: `vitest-distributor-${id}@recharge.local`,
    role: "DISTRIBUTOR",
    accountStatus: "APPROVED",
  });
  return id;
}

async function createRetailerFixture() {
  const id = createId();
  await db.insert(user).values({
    id,
    name: `Vitest Retailer ${id.slice(0, 6)}`,
    email: `vitest-retailer-${id}@recharge.local`,
    role: "RETAILER",
    accountStatus: "APPROVED",
  });
  return id;
}

describe.runIf(hasDatabase)("distributor notifications", () => {
  it("notifies distributor of retailer approval and dedupes unread copies", async () => {
    const distributorId = await createDistributorFixture();
    const retailerId = createId();

    try {
      await notifyDistributorRetailerApproved({
        distributorId,
        retailerId,
        retailerName: "Approved Retailer",
      });
      await notifyDistributorRetailerApproved({
        distributorId,
        retailerId,
        retailerName: "Approved Retailer",
      });

      expect(await getUnreadNotificationCount(distributorId)).toBe(1);

      const [row] = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, distributorId),
            eq(notification.entityId, retailerId),
          ),
        )
        .limit(1);

      expect(row?.type).toBe("RETAILER_APPROVED");
      expect(row?.href).toBe(`/distributor/retailers/${retailerId}`);
      expect(row?.body).toContain("Approved Retailer");

      const list = await listNotificationsForUser(distributorId, 10);
      expect(list.some((item) => item.entityId === retailerId)).toBe(true);
    } finally {
      await db.delete(user).where(eq(user.id, distributorId));
    }
  });

  it("notifies distributor of retailer rejection with correct payload", async () => {
    const distributorId = await createDistributorFixture();
    const retailerId = createId();

    try {
      await notifyDistributorRetailerRejected({
        distributorId,
        retailerId,
        retailerName: "Rejected Retailer",
      });

      expect(await getUnreadNotificationCount(distributorId)).toBe(1);

      const [row] = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, distributorId),
            eq(notification.entityId, retailerId),
            isNull(notification.readAt),
          ),
        )
        .limit(1);

      expect(row?.type).toBe("RETAILER_REJECTED");
      expect(row?.href).toBe("/distributor/retailers");
      expect(row?.body).toContain("Rejected Retailer");
    } finally {
      await db.delete(user).where(eq(user.id, distributorId));
    }
  });

  it("notifies distributor of fund requests and clears on entity mark read", async () => {
    const distributorId = await createDistributorFixture();
    const fundRequestId = createId();

    try {
      await notifyDistributorFundRequestPending({
        distributorId,
        fundRequestId,
        retailerName: "Shop One",
        amount: 500,
      });

      expect(await getUnreadNotificationCount(distributorId)).toBe(1);

      const [row] = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, distributorId),
            eq(notification.entityId, fundRequestId),
          ),
        )
        .limit(1);

      expect(row?.type).toBe("FUND_REQUEST_PENDING");
      expect(row?.href).toBe("/distributor/funds");

      await markNotificationsReadForEntity({
        type: "FUND_REQUEST_PENDING",
        entityId: fundRequestId,
      });

      expect(await getUnreadNotificationCount(distributorId)).toBe(0);
    } finally {
      await db.delete(user).where(eq(user.id, distributorId));
    }
  });

  it("notifies distributor of disputes and clears pending on resolve", async () => {
    const distributorId = await createDistributorFixture();
    const disputeId = createId();

    try {
      await notifyDistributorDisputePending({
        distributorId,
        disputeId,
        subject: "Wrong amount debited",
        retailerName: "Shop Two",
      });

      expect(await getUnreadNotificationCount(distributorId)).toBe(1);

      const [pending] = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, distributorId),
            eq(notification.entityId, disputeId),
            eq(notification.type, "DISTRIBUTOR_DISPUTE_PENDING"),
          ),
        )
        .limit(1);

      expect(pending?.href).toBe(`/distributor/support/${disputeId}`);

      await markNotificationsReadForEntity({
        type: "DISTRIBUTOR_DISPUTE_PENDING",
        entityId: disputeId,
      });
      expect(await getUnreadNotificationCount(distributorId)).toBe(0);

      await notifyDistributorDisputeResolved({
        distributorId,
        disputeId,
        subject: "Wrong amount debited",
      });

      expect(await getUnreadNotificationCount(distributorId)).toBe(1);

      const [resolved] = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, distributorId),
            eq(notification.entityId, disputeId),
            eq(notification.type, "DISTRIBUTOR_DISPUTE_RESOLVED"),
          ),
        )
        .limit(1);

      expect(resolved?.title).toBe("Dispute resolved");
    } finally {
      await db.delete(user).where(eq(user.id, distributorId));
    }
  });

  it("notifies distributor of admin wallet credit", async () => {
    const distributorId = await createDistributorFixture();
    const transactionId = createId();

    try {
      await notifyDistributorWalletCredited({
        distributorId,
        amount: 1000,
        transactionId,
      });

      expect(await getUnreadNotificationCount(distributorId)).toBe(1);

      const [row] = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, distributorId),
            eq(notification.entityId, transactionId),
          ),
        )
        .limit(1);

      expect(row?.type).toBe("WALLET_CREDITED");
      expect(row?.href).toBe("/distributor/ledger");
      expect(row?.body).toContain("1000");
    } finally {
      await db.delete(user).where(eq(user.id, distributorId));
    }
  });

  it("notifies distributor of admin wallet debit", async () => {
    const distributorId = await createDistributorFixture();
    const transactionId = createId();

    try {
      await notifyDistributorWalletDebited({
        distributorId,
        amount: 250,
        transactionId,
      });

      const [row] = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, distributorId),
            eq(notification.entityId, transactionId),
          ),
        )
        .limit(1);

      expect(row?.type).toBe("WALLET_DEBITED");
      expect(row?.body).toContain("250");
    } finally {
      await db.delete(user).where(eq(user.id, distributorId));
    }
  });

  it("notifies distributor of retailer suspend and restore", async () => {
    const distributorId = await createDistributorFixture();
    const retailerId = createId();

    try {
      await notifyDistributorRetailerSuspended({
        distributorId,
        retailerId,
        retailerName: "Suspended Shop",
      });
      await notifyDistributorRetailerRestored({
        distributorId,
        retailerId: createId(),
        retailerName: "Restored Shop",
      });

      expect(await getUnreadNotificationCount(distributorId)).toBe(2);

      const rows = await db
        .select({ type: notification.type })
        .from(notification)
        .where(eq(notification.userId, distributorId));

      expect(rows.map((r) => r.type).sort()).toEqual(
        ["RETAILER_RESTORED", "RETAILER_SUSPENDED"].sort(),
      );
    } finally {
      await db.delete(user).where(eq(user.id, distributorId));
    }
  });

  it("notifies distributor of settled pending recharges", async () => {
    const distributorId = await createDistributorFixture();
    const retailer1Id = await createRetailerFixture();
    const retailer2Id = await createRetailerFixture();
    const transactionId = createId();

    try {
      await notifyDistributorRechargeSettled({
        transactionId,
        operator: "JIO",
        amount: 199,
        targetPhone: "9876543210",
        actorName: "Network Retailer",
        actorRole: "RETAILER",
        userId: retailer1Id,
        distributorId,
        outcome: "SUCCESS",
      });
      await notifyDistributorRechargeSettled({
        transactionId: createId(),
        operator: "AIRTEL",
        amount: 99,
        targetPhone: "9876543211",
        actorName: "Network Retailer",
        actorRole: "RETAILER",
        userId: retailer2Id,
        distributorId,
        outcome: "FAILED",
      });
      await notifyDistributorRechargeSettled({
        transactionId: createId(),
        operator: "VI",
        amount: 149,
        targetPhone: "9876543212",
        actorName: "Distributor",
        actorRole: "DISTRIBUTOR",
        userId: distributorId,
        distributorId: null,
        outcome: "REFUNDED",
      });

      expect(await getUnreadNotificationCount(distributorId)).toBe(3);

      const types = await db
        .select({ type: notification.type })
        .from(notification)
        .where(eq(notification.userId, distributorId));

      expect(types.map((row) => row.type).sort()).toEqual(
        ["RECHARGE_FAILED", "RECHARGE_REFUNDED", "RECHARGE_SUCCEEDED"].sort(),
      );
    } finally {
      await db.delete(user).where(eq(user.id, retailer1Id));
      await db.delete(user).where(eq(user.id, retailer2Id));
      await db.delete(user).where(eq(user.id, distributorId));
    }
  });
});

describe.runIf(hasDatabase)("retailer notifications", () => {
  it("notifies retailer of account approval and dedupes unread copies", async () => {
    const retailerId = await createRetailerFixture();

    try {
      await notifyRetailerAccountApproved({ retailerId });
      await notifyRetailerAccountApproved({ retailerId });

      expect(await getUnreadNotificationCount(retailerId)).toBe(1);

      const [row] = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, retailerId),
            eq(notification.entityId, retailerId),
          ),
        )
        .limit(1);

      expect(row?.type).toBe("ACCOUNT_APPROVED");
      expect(row?.href).toBe("/retailer");
    } finally {
      await db.delete(user).where(eq(user.id, retailerId));
    }
  });

  it("notifies retailer of fund request approval with correct href", async () => {
    const retailerId = await createRetailerFixture();
    const fundRequestId = createId();

    try {
      await notifyRetailerFundRequestApproved({
        retailerId,
        fundRequestId,
        amount: 1200,
        distributorName: "Test Distributor",
      });

      const [row] = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, retailerId),
            eq(notification.entityId, fundRequestId),
          ),
        )
        .limit(1);

      expect(row?.type).toBe("FUND_REQUEST_APPROVED");
      expect(row?.href).toBe("/retailer/funds");
      expect(row?.body).toContain("1200");
    } finally {
      await db.delete(user).where(eq(user.id, retailerId));
    }
  });

  it("notifies retailer of wallet credit and settled recharges", async () => {
    const retailerId = await createRetailerFixture();
    const transactionId = createId();

    try {
      await notifyRetailerWalletCredited({
        retailerId,
        amount: 800,
        transactionId,
        sourceLabel: "Test Distributor",
      });
      await notifyRetailerRechargeSettled({
        retailerId,
        transactionId: createId(),
        operator: "JIO",
        amount: 199,
        targetPhone: "9876543210",
        outcome: "SUCCESS",
      });

      expect(await getUnreadNotificationCount(retailerId)).toBe(2);

      const types = await db
        .select({ type: notification.type })
        .from(notification)
        .where(eq(notification.userId, retailerId));

      expect(types.map((row) => row.type).sort()).toEqual(
        ["RECHARGE_SUCCEEDED", "WALLET_CREDITED"].sort(),
      );
    } finally {
      await db.delete(user).where(eq(user.id, retailerId));
    }
  });

  it("notifies retailer when admin resolves their dispute", async () => {
    const retailerId = await createRetailerFixture();
    const disputeId = createId();

    try {
      await notifyRetailerDisputeResolved({
        retailerId,
        disputeId,
        subject: "Wrong amount charged",
      });

      const [row] = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, retailerId),
            eq(notification.entityId, disputeId),
          ),
        )
        .limit(1);

      expect(row?.type).toBe("RETAILER_DISPUTE_RESOLVED");
      expect(row?.href).toBe(`/retailer/support/${disputeId}`);
    } finally {
      await db.delete(user).where(eq(user.id, retailerId));
    }
  });
});

afterAll(async () => {
  if (hasDatabase) {
    await pool.end();
  }
});

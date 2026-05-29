import { and, eq, inArray, isNull } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createId, db, notification, pool, user } from "@repo/db";
import {
  getUnreadNotificationCount,
  listNotificationsForUser,
  markNotificationsReadForEntity,
  notifyAdminsDisputePending,
  notifyAdminsRetailerPendingApproval,
} from "../../packages/server/src/notifications";

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function createAdminFixture() {
  const id = createId();
  await db.insert(user).values({
    id,
    name: `Vitest Admin ${id.slice(0, 6)}`,
    email: `vitest-admin-${id}@recharge.local`,
    role: "ADMIN",
    accountStatus: "APPROVED",
  });
  return id;
}

describe.runIf(hasDatabase)("notifications", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("notifies every admin of a pending retailer and dedupes unread copies", async () => {
    const adminA = await createAdminFixture();
    const adminB = await createAdminFixture();
    const retailerId = createId();

    try {
      await notifyAdminsRetailerPendingApproval({
        retailerId,
        retailerName: "Test Retailer",
      });
      await notifyAdminsRetailerPendingApproval({
        retailerId,
        retailerName: "Test Retailer",
      });

      expect(await getUnreadNotificationCount(adminA)).toBe(1);
      expect(await getUnreadNotificationCount(adminB)).toBe(1);

      const fixtureAdminIds = [adminA, adminB];
      const rows = await db
        .select({
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          href: notification.href,
          readAt: notification.readAt,
        })
        .from(notification)
        .where(
          and(
            eq(notification.type, "RETAILER_PENDING_APPROVAL"),
            eq(notification.entityId, retailerId),
            inArray(notification.userId, fixtureAdminIds),
          ),
        );

      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.type).toBe("RETAILER_PENDING_APPROVAL");
        expect(row.title).toBe("New retailer application");
        expect(row.body).toBe("Test Retailer is waiting for approval.");
        expect(row.href).toBe("/admin/approvals");
        expect(row.readAt).toBeNull();
      }

      const listA = await listNotificationsForUser(adminA, 10);
      expect(listA.some((n) => n.entityId === retailerId)).toBe(true);
    } finally {
      await db.delete(user).where(eq(user.id, adminA));
      await db.delete(user).where(eq(user.id, adminB));
    }
  });

  it("marks entity notifications read for all admins", async () => {
    const adminId = await createAdminFixture();
    const retailerId = createId();

    try {
      await notifyAdminsRetailerPendingApproval({
        retailerId,
        retailerName: "Read Test Retailer",
      });
      expect(await getUnreadNotificationCount(adminId)).toBe(1);

      await markNotificationsReadForEntity({
        type: "RETAILER_PENDING_APPROVAL",
        entityId: retailerId,
      });

      expect(await getUnreadNotificationCount(adminId)).toBe(0);

      const [row] = await db
        .select({ readAt: notification.readAt })
        .from(notification)
        .where(
          and(
            eq(notification.userId, adminId),
            eq(notification.entityId, retailerId),
          ),
        )
        .limit(1);

      expect(row?.readAt).toBeInstanceOf(Date);

      await notifyAdminsRetailerPendingApproval({
        retailerId,
        retailerName: "Read Test Retailer",
      });
      expect(await getUnreadNotificationCount(adminId)).toBe(1);
    } finally {
      await db.delete(user).where(eq(user.id, adminId));
    }
  });

  it("notifies admins of pending disputes with correct payload", async () => {
    const adminId = await createAdminFixture();
    const disputeId = createId();

    try {
      await notifyAdminsDisputePending({
        disputeId,
        subject: "Wrong amount debited",
        submitterName: "Distributor One",
      });

      expect(await getUnreadNotificationCount(adminId)).toBe(1);

      const [row] = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, adminId),
            eq(notification.entityId, disputeId),
            isNull(notification.readAt),
          ),
        )
        .limit(1);

      expect(row?.type).toBe("DISPUTE_PENDING");
      expect(row?.title).toBe("New support dispute");
      expect(row?.body).toBe("Distributor One: Wrong amount debited");
      expect(row?.href).toBe(`/admin/support/${disputeId}`);

      await markNotificationsReadForEntity({
        type: "DISPUTE_PENDING",
        entityId: disputeId,
      });
      expect(await getUnreadNotificationCount(adminId)).toBe(0);
    } finally {
      await db.delete(user).where(eq(user.id, adminId));
    }
  });

});

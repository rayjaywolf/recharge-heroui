import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { createId, db, notification, user, type NotificationType } from "@repo/db";

type NotifyAllAdminsInput = {
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  entityId: string;
};

/** Canonical routes for notification actions (covers legacy stored hrefs). */
export function resolveNotificationHref(
  type: NotificationType,
  href: string,
): string {
  if (type === "RETAILER_PENDING_APPROVAL") {
    return "/admin/approvals";
  }
  return href;
}

async function listAdminIds(): Promise<string[]> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "ADMIN"));
  return rows.map((row) => row.id);
}

export async function notifyAllAdmins(input: NotifyAllAdminsInput): Promise<void> {
  const adminIds = await listAdminIds();
  if (adminIds.length === 0) return;

  for (const adminId of adminIds) {
    const [existing] = await db
      .select({ id: notification.id })
      .from(notification)
      .where(
        and(
          eq(notification.userId, adminId),
          eq(notification.type, input.type),
          eq(notification.entityId, input.entityId),
          isNull(notification.readAt),
        ),
      )
      .limit(1);

    if (existing) continue;

    await db.insert(notification).values({
      id: createId(),
      userId: adminId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      entityId: input.entityId,
    });
  }
}

export async function notifyAdminsRetailerPendingApproval(params: {
  retailerId: string;
  retailerName: string;
}): Promise<void> {
  await notifyAllAdmins({
    type: "RETAILER_PENDING_APPROVAL",
    title: "New retailer application",
    body: `${params.retailerName} is waiting for approval.`,
    href: "/admin/approvals",
    entityId: params.retailerId,
  });
}

export async function notifyAdminsDisputePending(params: {
  disputeId: string;
  subject: string;
  submitterName: string;
}): Promise<void> {
  await notifyAllAdmins({
    type: "DISPUTE_PENDING",
    title: "New support dispute",
    body: `${params.submitterName}: ${params.subject}`,
    href: `/admin/support/${params.disputeId}`,
    entityId: params.disputeId,
  });
}

export async function markNotificationsReadForEntity(params: {
  type: NotificationType;
  entityId: string;
}): Promise<void> {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notification.type, params.type),
        eq(notification.entityId, params.entityId),
        isNull(notification.readAt),
      ),
    );
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
  return row?.total ?? 0;
}

export async function markNotificationsReadByIds(
  userId: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;

  const updated = await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notification.userId, userId),
        inArray(notification.id, ids),
        isNull(notification.readAt),
      ),
    )
    .returning({ id: notification.id });

  return updated.length;
}

export async function deleteNotificationsByIds(
  userId: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;

  const deleted = await db
    .delete(notification)
    .where(
      and(eq(notification.userId, userId), inArray(notification.id, ids)),
    )
    .returning({ id: notification.id });

  return deleted.length;
}

export async function listNotificationsForUser(
  userId: string,
  limit = 30,
): Promise<
  Array<{
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    href: string;
    entityId: string;
    readAt: Date | null;
    createdAt: Date;
  }>
> {
  const rows = await db
    .select({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      href: notification.href,
      entityId: notification.entityId,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    })
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    href: resolveNotificationHref(row.type, row.href),
  }));
}

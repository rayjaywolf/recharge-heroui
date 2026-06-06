import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { resolveNotificationHref } from "@repo/shared/notification-href";
import { createId, db, notification, user, type NotificationType } from "@repo/db";

type NotifyInput = {
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  entityId: string;
};

export { resolveNotificationHref } from "@repo/shared/notification-href";

async function listAdminIds(): Promise<string[]> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "ADMIN"));
  return rows.map((row) => row.id);
}

async function insertNotificationIfNew(
  userId: string,
  input: NotifyInput,
): Promise<void> {
  const [existing] = await db
    .select({ id: notification.id })
    .from(notification)
    .where(
      and(
        eq(notification.userId, userId),
        eq(notification.type, input.type),
        eq(notification.entityId, input.entityId),
        isNull(notification.readAt),
      ),
    )
    .limit(1);

  if (existing) return;

  await db.insert(notification).values({
    id: createId(),
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
    entityId: input.entityId,
  });
}

export async function notifyDistributor(
  userId: string,
  input: NotifyInput,
): Promise<void> {
  await insertNotificationIfNew(userId, input);
}

export async function notifyRetailer(
  userId: string,
  input: NotifyInput,
): Promise<void> {
  await insertNotificationIfNew(userId, input);
}

export async function notifyAllAdmins(input: NotifyInput): Promise<void> {
  const adminIds = await listAdminIds();
  if (adminIds.length === 0) return;

  for (const adminId of adminIds) {
    await insertNotificationIfNew(adminId, input);
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

export async function notifyDistributorRetailerApproved(params: {
  distributorId: string;
  retailerId: string;
  retailerName: string;
}): Promise<void> {
  await notifyDistributor(params.distributorId, {
    type: "RETAILER_APPROVED",
    title: "Retailer approved",
    body: `${params.retailerName} was approved and can now be funded.`,
    href: `/distributor/retailers/${params.retailerId}`,
    entityId: params.retailerId,
  });
}

export async function notifyDistributorRetailerRejected(params: {
  distributorId: string;
  retailerId: string;
  retailerName: string;
}): Promise<void> {
  await notifyDistributor(params.distributorId, {
    type: "RETAILER_REJECTED",
    title: "Retailer rejected",
    body: `${params.retailerName}'s application was rejected.`,
    href: "/distributor/retailers",
    entityId: params.retailerId,
  });
}

export async function notifyDistributorRetailerSuspended(params: {
  distributorId: string;
  retailerId: string;
  retailerName: string;
}): Promise<void> {
  await notifyDistributor(params.distributorId, {
    type: "RETAILER_SUSPENDED",
    title: "Retailer suspended",
    body: `${params.retailerName} was suspended by an administrator.`,
    href: `/distributor/retailers/${params.retailerId}`,
    entityId: params.retailerId,
  });
}

export async function notifyDistributorRetailerRestored(params: {
  distributorId: string;
  retailerId: string;
  retailerName: string;
}): Promise<void> {
  await notifyDistributor(params.distributorId, {
    type: "RETAILER_RESTORED",
    title: "Retailer reactivated",
    body: `${params.retailerName} was reactivated and can operate again.`,
    href: `/distributor/retailers/${params.retailerId}`,
    entityId: params.retailerId,
  });
}

export async function notifyDistributorDisputePending(params: {
  distributorId: string;
  disputeId: string;
  subject: string;
  retailerName: string;
}): Promise<void> {
  await notifyDistributor(params.distributorId, {
    type: "DISTRIBUTOR_DISPUTE_PENDING",
    title: "New retailer dispute",
    body: `${params.retailerName}: ${params.subject}`,
    href: `/distributor/support/${params.disputeId}`,
    entityId: params.disputeId,
  });
}

export async function notifyDistributorDisputeResolved(params: {
  distributorId: string;
  disputeId: string;
  subject: string;
}): Promise<void> {
  await notifyDistributor(params.distributorId, {
    type: "DISTRIBUTOR_DISPUTE_RESOLVED",
    title: "Dispute resolved",
    body: `Admin resolved: ${params.subject}`,
    href: `/distributor/support/${params.disputeId}`,
    entityId: params.disputeId,
  });
}

export async function notifyDistributorFundRequestPending(params: {
  distributorId: string;
  fundRequestId: string;
  retailerName: string;
  amount: number;
}): Promise<void> {
  await notifyDistributor(params.distributorId, {
    type: "FUND_REQUEST_PENDING",
    title: "New fund request",
    body: `${params.retailerName} requested ₹${params.amount}.`,
    href: "/distributor/funds",
    entityId: params.fundRequestId,
  });
}

export async function notifyAdminsFundRequestPending(params: {
  fundRequestId: string;
  retailerName: string;
  amount: number;
}): Promise<void> {
  await notifyAllAdmins({
    type: "FUND_REQUEST_PENDING",
    title: "New fund request",
    body: `${params.retailerName} requested ₹${params.amount}.`,
    href: "/admin/funding",
    entityId: params.fundRequestId,
  });
}

export async function notifyDistributorWalletCredited(params: {
  distributorId: string;
  amount: number;
  transactionId: string;
}): Promise<void> {
  await notifyDistributor(params.distributorId, {
    type: "WALLET_CREDITED",
    title: "Wallet credited",
    body: `₹${params.amount} was added to your wallet by an administrator.`,
    href: "/distributor/ledger",
    entityId: params.transactionId,
  });
}

export async function notifyDistributorWalletDebited(params: {
  distributorId: string;
  amount: number;
  transactionId: string;
}): Promise<void> {
  await notifyDistributor(params.distributorId, {
    type: "WALLET_DEBITED",
    title: "Wallet debited",
    body: `₹${params.amount} was deducted from your wallet by an administrator.`,
    href: "/distributor/ledger",
    entityId: params.transactionId,
  });
}

const NON_RECHARGE_OPERATORS = new Set([
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "FUNDS_SENT",
  "FUNDS_RECEIVED",
]);

type RechargeSettlementOutcome = "SUCCESS" | "FAILED" | "REFUNDED";

function resolveRechargeNotificationType(
  outcome: RechargeSettlementOutcome,
): NotificationType {
  switch (outcome) {
    case "SUCCESS":
      return "RECHARGE_SUCCEEDED";
    case "FAILED":
      return "RECHARGE_FAILED";
    case "REFUNDED":
      return "RECHARGE_REFUNDED";
  }
}

function resolveRechargeSettlementOutcome(params: {
  status: "SUCCESS" | "FAILED" | "REFUNDED";
  refunded?: boolean;
}): RechargeSettlementOutcome {
  if (params.status === "REFUNDED") {
    return "REFUNDED";
  }
  if (params.status === "SUCCESS") {
    return "SUCCESS";
  }
  return params.refunded ? "REFUNDED" : "FAILED";
}

export { resolveRechargeSettlementOutcome };

function resolveDistributorIdForRecharge(params: {
  userId: string;
  role: string;
  distributorId: string | null;
}): string | null {
  if (params.role === "DISTRIBUTOR") {
    return params.userId;
  }
  return params.distributorId;
}

/** Notify distributor when a pending recharge in their network reaches a final status. */
export async function notifyDistributorRechargeSettled(params: {
  transactionId: string;
  operator: string;
  amount: number;
  targetPhone: string;
  actorName: string;
  actorRole: string;
  userId: string;
  distributorId: string | null;
  outcome: RechargeSettlementOutcome;
}): Promise<void> {
  if (NON_RECHARGE_OPERATORS.has(params.operator)) {
    return;
  }

  const notifyDistributorId = resolveDistributorIdForRecharge({
    userId: params.userId,
    role: params.actorRole,
    distributorId: params.distributorId,
  });

  if (!notifyDistributorId) {
    return;
  }

  const type = resolveRechargeNotificationType(params.outcome);
  const subject =
    params.actorRole === "DISTRIBUTOR"
      ? "Your recharge"
      : `${params.actorName}'s recharge`;
  const detail = `₹${params.amount} ${params.operator} to ${params.targetPhone}`;

  const copy: Record<
    RechargeSettlementOutcome,
    { title: string; body: string }
  > = {
    SUCCESS: {
      title: "Recharge successful",
      body: `${subject}: ${detail} succeeded.`,
    },
    FAILED: {
      title: "Recharge failed",
      body: `${subject}: ${detail} failed.`,
    },
    REFUNDED: {
      title: "Recharge refunded",
      body: `${subject}: ${detail} was refunded to the wallet.`,
    },
  };

  const { title, body } = copy[params.outcome];

  await notifyDistributor(notifyDistributorId, {
    type,
    title,
    body,
    href: "/distributor/ledger",
    entityId: params.transactionId,
  });

  if (params.actorRole === "RETAILER") {
    await notifyRetailerRechargeSettled({
      retailerId: params.userId,
      transactionId: params.transactionId,
      operator: params.operator,
      amount: params.amount,
      targetPhone: params.targetPhone,
      outcome: params.outcome,
    });
  }
}

export async function notifyRetailerAccountApproved(params: {
  retailerId: string;
}): Promise<void> {
  await notifyRetailer(params.retailerId, {
    type: "ACCOUNT_APPROVED",
    title: "Account approved",
    body: "Your retailer account was approved. You can now use the platform.",
    href: "/retailer",
    entityId: params.retailerId,
  });
}

export async function notifyRetailerAccountRejected(params: {
  retailerId: string;
}): Promise<void> {
  await notifyRetailer(params.retailerId, {
    type: "ACCOUNT_REJECTED",
    title: "Account rejected",
    body: "Your retailer application was rejected by an administrator.",
    href: "/rejected",
    entityId: params.retailerId,
  });
}

export async function notifyRetailerAccountSuspended(params: {
  retailerId: string;
}): Promise<void> {
  await notifyRetailer(params.retailerId, {
    type: "ACCOUNT_SUSPENDED",
    title: "Account suspended",
    body: "Your account was suspended by an administrator.",
    href: "/profile",
    entityId: params.retailerId,
  });
}

export async function notifyRetailerAccountRestored(params: {
  retailerId: string;
}): Promise<void> {
  await notifyRetailer(params.retailerId, {
    type: "ACCOUNT_RESTORED",
    title: "Account reactivated",
    body: "Your account was reactivated and you can operate again.",
    href: "/retailer",
    entityId: params.retailerId,
  });
}

export async function notifyRetailerFundRequestApproved(params: {
  retailerId: string;
  fundRequestId: string;
  amount: number;
  approverName: string;
}): Promise<void> {
  await notifyRetailer(params.retailerId, {
    type: "FUND_REQUEST_APPROVED",
    title: "Fund request approved",
    body: `${params.approverName} approved your ₹${params.amount} fund request.`,
    href: "/retailer/funds",
    entityId: params.fundRequestId,
  });
}

export async function notifyRetailerFundRequestRejected(params: {
  retailerId: string;
  fundRequestId: string;
  amount: number;
  approverName: string;
}): Promise<void> {
  await notifyRetailer(params.retailerId, {
    type: "FUND_REQUEST_REJECTED",
    title: "Fund request rejected",
    body: `${params.approverName} rejected your ₹${params.amount} fund request.`,
    href: "/retailer/funds",
    entityId: params.fundRequestId,
  });
}

export async function notifyRetailerWalletCredited(params: {
  retailerId: string;
  amount: number;
  transactionId: string;
  sourceLabel: string;
}): Promise<void> {
  await notifyRetailer(params.retailerId, {
    type: "WALLET_CREDITED",
    title: "Wallet credited",
    body: `₹${params.amount} was added to your wallet by ${params.sourceLabel}.`,
    href: "/retailer/ledger",
    entityId: params.transactionId,
  });
}

export async function notifyRetailerWalletDebited(params: {
  retailerId: string;
  amount: number;
  transactionId: string;
}): Promise<void> {
  await notifyRetailer(params.retailerId, {
    type: "WALLET_DEBITED",
    title: "Wallet debited",
    body: `₹${params.amount} was deducted from your wallet by an administrator.`,
    href: "/retailer/ledger",
    entityId: params.transactionId,
  });
}

export async function notifyRetailerDisputeResolved(params: {
  retailerId: string;
  disputeId: string;
  subject: string;
}): Promise<void> {
  await notifyRetailer(params.retailerId, {
    type: "RETAILER_DISPUTE_RESOLVED",
    title: "Dispute resolved",
    body: `Admin resolved your dispute: ${params.subject}`,
    href: `/retailer/support/${params.disputeId}`,
    entityId: params.disputeId,
  });
}

export async function notifyRetailerRechargeSettled(params: {
  retailerId: string;
  transactionId: string;
  operator: string;
  amount: number;
  targetPhone: string;
  outcome: RechargeSettlementOutcome;
}): Promise<void> {
  if (NON_RECHARGE_OPERATORS.has(params.operator)) {
    return;
  }

  const type = resolveRechargeNotificationType(params.outcome);
  const detail = `₹${params.amount} ${params.operator} to ${params.targetPhone}`;

  const copy: Record<
    RechargeSettlementOutcome,
    { title: string; body: string }
  > = {
    SUCCESS: {
      title: "Recharge successful",
      body: `Your recharge: ${detail} succeeded.`,
    },
    FAILED: {
      title: "Recharge failed",
      body: `Your recharge: ${detail} failed.`,
    },
    REFUNDED: {
      title: "Recharge refunded",
      body: `Your recharge: ${detail} was refunded to your wallet.`,
    },
  };

  const { title, body } = copy[params.outcome];

  await notifyRetailer(params.retailerId, {
    type,
    title,
    body,
    href: "/retailer/ledger",
    entityId: params.transactionId,
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

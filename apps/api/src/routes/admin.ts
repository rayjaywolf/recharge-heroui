import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import {
  commissionRule,
  createId,
  db,
  dispute,
  fundRequest,
  operatorProviderConfig,
  retailerCommissionOverride,
  transaction,
  user,
  type Provider,
  type Role,
  type TxStatus,
} from "@repo/db";
import { decrementBalance, incrementBalance } from "@repo/server/db-utils";
import {
  creditAdminCommission,
  debitAdminCommission,
} from "@repo/server/user-earnings";
import { resolveCommissionAmountsForUser } from "@repo/server/commission-margins";
import {
  markNotificationsReadForEntity,
  notifyDistributorDisputeResolved,
  notifyDistributorRechargeSettled,
  notifyDistributorRetailerApproved,
  notifyDistributorRetailerRejected,
  notifyDistributorRetailerRestored,
  notifyDistributorRetailerSuspended,
  notifyDistributorWalletCredited,
  notifyDistributorWalletDebited,
  notifyRetailerAccountApproved,
  notifyRetailerAccountRejected,
  notifyRetailerAccountRestored,
  notifyRetailerAccountSuspended,
  notifyRetailerDisputeResolved,
  notifyRetailerFundRequestApproved,
  notifyRetailerFundRequestRejected,
  notifyRetailerWalletCredited,
  notifyRetailerWalletDebited,
  resolveRechargeSettlementOutcome,
} from "@repo/server/notifications";
import { checkA1TopupStatus } from "@repo/server/a1topup";
import { checkMRoboticsStatus } from "@repo/server/mrobotics";
import { getAllProviderBalances } from "@repo/server/provider-balances";
import {
  settlePendingTransaction,
  syncPendingRechargeTransactions,
  syncPendingRealRoboTransactionsForUser,
} from "@repo/server/pending-recharge-sync";
import { parseRechargeProviderResponse } from "@repo/server/recharge-gateway";
import {
  assertProvider,
  BACKUP_NONE,
  normalizeOperatorKey,
  parseBackupValue,
  type BackupSlot,
} from "./admin-helpers";
import { requireAdmin, type AppVariables } from "../middleware";

export const adminRoutes = new Hono<{ Variables: AppVariables }>();

adminRoutes.get("/api/admin/provider-balances", requireAdmin, async (c) => {
  try {
    const balances = await getAllProviderBalances();
    return c.json({ balances });
  } catch (error) {
    console.error("Provider balances error:", error);
    return c.json({ error: "Failed to load provider balances." }, 500);
  }
});

adminRoutes.post("/api/admin/sync-pending", requireAdmin, async (c) => {
  try {
    const result = await syncPendingRechargeTransactions({ limit: 100 });

    const parts: string[] = [];
    if (result.succeeded > 0) parts.push(`${result.succeeded} succeeded`);
    if (result.failed > 0) parts.push(`${result.failed} failed`);
    if (result.stillPending > 0) {
      parts.push(`${result.stillPending} still pending`);
    }

    const message =
      result.checked === 0
        ? "No pending recharges to check."
        : result.updated > 0
          ? `Updated ${result.updated} of ${result.checked} pending recharge${result.checked === 1 ? "" : "s"}${parts.length > 0 ? ` (${parts.join(", ")})` : ""}.`
          : `Checked ${result.checked} pending recharge${result.checked === 1 ? "" : "s"}; no status changes yet${parts.length > 0 ? ` (${parts.join(", ")})` : ""}.`;

    return c.json({
      success: true,
      message,
      ...result,
    });
  } catch (error) {
    console.error("Admin sync pending recharges error:", error);
    return c.json({ error: "Could not refresh pending recharges." }, 500);
  }
});

adminRoutes.post("/api/admin/transactions/:id/refresh-status", requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    const [found] = await db
      .select()
      .from(transaction)
      .where(eq(transaction.id, id))
      .limit(1);

    if (!found) {
      return c.json({ error: "Transaction not found." }, 404);
    }

    if (found.status !== "PENDING") {
      return c.json({
        success: true,
        message: "Transaction is already in final state.",
        transaction: found,
      });
    }

    if (found.provider === "REALROBO") {
      await syncPendingRealRoboTransactionsForUser(found.userId, { limit: 100 });
      const [updated] = await db
        .select()
        .from(transaction)
        .where(eq(transaction.id, id))
        .limit(1);

      return c.json({
        success: true,
        message: "Status refreshed from RealRobo.",
        transaction: updated ?? found,
      });
    }

    if (found.provider === "MROBOTICS") {
      const statusResponse = await checkMRoboticsStatus(found.id);
      const parsed = parseRechargeProviderResponse(
        "MROBOTICS",
        statusResponse,
        found.id,
      );

      await settlePendingTransaction(found, parsed);
      const [updated] = await db
        .select()
        .from(transaction)
        .where(eq(transaction.id, found.id))
        .limit(1);

      return c.json({
        success: true,
        message: "Status refreshed from MRobotics.",
        transaction: updated ?? found,
      });
    }

    if (found.provider === "A1TOPUP") {
      const statusResponse = await checkA1TopupStatus(found.id);
      const parsed = parseRechargeProviderResponse(
        "A1TOPUP",
        statusResponse,
        found.id,
      );

      await settlePendingTransaction(found, parsed);
      const [updated] = await db
        .select()
        .from(transaction)
        .where(eq(transaction.id, found.id))
        .limit(1);

      return c.json({
        success: true,
        message: "Status refreshed from A1TopUp.",
        transaction: updated ?? found,
      });
    }

    return c.json(
      { error: `Status refresh is not supported for ${found.provider}.` },
      400,
    );
  } catch (error) {
    console.error("Refresh transaction status error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

adminRoutes.patch("/api/admin/transactions/:id/manual-status", requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const status = String(body?.status ?? "") as TxStatus;
    const message = String(body?.message ?? "").trim();

    const allowedStatuses: TxStatus[] = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"];
    if (!allowedStatuses.includes(status)) {
      return c.json({ error: "Invalid status." }, 400);
    }
    if (!message) {
      return c.json({ error: "Message is required when changing status." }, 400);
    }

    const [found] = await db
      .select({
        id: transaction.id,
        userId: transaction.userId,
        operator: transaction.operator,
        amount: transaction.amount,
        targetPhone: transaction.targetPhone,
        status: transaction.status,
        apiMessage: transaction.apiMessage,
        retailerCommission: transaction.retailerCommission,
        distributorCommission: transaction.distributorCommission,
        adminCommission: transaction.adminCommission,
      })
      .from(transaction)
      .where(eq(transaction.id, id))
      .limit(1);

    if (!found) {
      return c.json({ error: "Transaction not found." }, 404);
    }

    const [txUser] = await db
      .select({
        id: user.id,
        role: user.role,
        distributorId: user.distributorId,
        name: user.name,
      })
      .from(user)
      .where(eq(user.id, found.userId))
      .limit(1);

    if (!txUser) {
      return c.json({ error: "Transaction owner not found." }, 404);
    }

    const {
      retailerCommission: nextRetailerCommission,
      adminCommission: nextAdminCommission,
      distributorCommission: nextDistributorCommission,
    } = await resolveCommissionAmountsForUser(db, {
      userId: found.userId,
      operator: found.operator,
      amount: found.amount,
      userRole: txUser.role,
      distributorId: txUser.distributorId,
    });

    const amount = found.amount;

    const from = found.status;
    const to = status;
    const toSuccess = to === "SUCCESS";
    const fromSuccess = from === "SUCCESS";
    const toFailedLike = to === "FAILED" || to === "REFUNDED";
    const fromFailedLike = from === "FAILED" || from === "REFUNDED";

    const previousApiMessage = (found.apiMessage ?? "").toUpperCase();
    const wasManualNoRefund = previousApiMessage.startsWith(
      "[MANUAL_STATUS_NO_REFUND]",
    );
    const wasManualRefunded = previousApiMessage.startsWith(
      "[MANUAL_STATUS_REFUNDED]",
    );

    // Automatic refund detection for FAILED:
    // - REFUNDED is always considered refunded.
    // - FAILED from normal gateway flow is treated as refunded by default.
    // - FAILED manually set as no-refund is honored via message marker.
    const isRefundedOnFrom =
      from === "REFUNDED" ||
      (from === "FAILED" && (wasManualRefunded || !wasManualNoRefund));
    const shouldRefundOnTo = toFailedLike;

    const [updated] = await db.transaction(async (tx) => {
      const [next] = await tx
        .update(transaction)
        .set({
          status: to,
          apiMessage: toFailedLike
            ? `[MANUAL_STATUS_REFUNDED] ${message}`
            : `[MANUAL_STATUS] ${message}`,
          retailerCommission: toSuccess ? nextRetailerCommission : 0,
          distributorCommission: toSuccess ? nextDistributorCommission : 0,
          adminCommission: toSuccess ? nextAdminCommission : 0,
        })
        .where(and(eq(transaction.id, id), eq(transaction.status, from)))
        .returning();

      if (!next) {
        throw new Error("CONCURRENT_STATUS_UPDATE");
      }

      // Reverse previously credited earnings if moving away from SUCCESS.
      if (fromSuccess && !toSuccess) {
        if (found.retailerCommission > 0) {
          await tx
            .update(user)
            .set({ earnings: sql`${user.earnings} - ${found.retailerCommission}` })
            .where(eq(user.id, found.userId));
        }

        if (found.distributorCommission > 0 && txUser.distributorId) {
          await tx
            .update(user)
            .set({
              earnings: sql`${user.earnings} - ${found.distributorCommission}`,
            })
            .where(eq(user.id, txUser.distributorId));
        }

        if (found.adminCommission > 0) {
          await debitAdminCommission(tx, found.adminCommission);
        }
      }

      // Wallet refund on transitions to FAILED/REFUNDED from non-failed states.
      if (shouldRefundOnTo && !isRefundedOnFrom) {
        await tx
          .update(user)
          .set(incrementBalance(amount))
          .where(eq(user.id, found.userId));
      }

      // Reverse refund when moving to a non-refunded state.
      if (isRefundedOnFrom && !shouldRefundOnTo) {
        const [debited] = await tx
          .update(user)
          .set(decrementBalance(amount))
          .where(and(eq(user.id, found.userId), gte(user.balance, amount)))
          .returning({ id: user.id });

        if (!debited) {
          throw new Error("INSUFFICIENT_BALANCE_FOR_REVERSAL");
        }
      }

      // Apply earnings when entering SUCCESS from any non-success state.
      if (!fromSuccess && toSuccess) {
        if (nextRetailerCommission > 0) {
          await tx
            .update(user)
            .set({ earnings: sql`${user.earnings} + ${nextRetailerCommission}` })
            .where(eq(user.id, found.userId));
        }

        if (nextDistributorCommission > 0 && txUser.distributorId) {
          await tx
            .update(user)
            .set({
              earnings: sql`${user.earnings} + ${nextDistributorCommission}`,
            })
            .where(eq(user.id, txUser.distributorId));
        }

        if (nextAdminCommission > 0) {
          await creditAdminCommission(tx, nextAdminCommission);
        }
      }

      return [next];
    });

    if (
      from === "PENDING" &&
      (to === "SUCCESS" || to === "FAILED" || to === "REFUNDED") &&
      txUser
    ) {
      const outcome = resolveRechargeSettlementOutcome({
        status: to,
        refunded: to === "REFUNDED" || (to === "FAILED" && shouldRefundOnTo),
      });

      await notifyDistributorRechargeSettled({
        transactionId: found.id,
        operator: found.operator,
        amount: found.amount,
        targetPhone: found.targetPhone,
        actorName: txUser.name,
        actorRole: txUser.role,
        userId: found.userId,
        distributorId: txUser.distributorId,
        outcome,
      });
    }

    return c.json({
      success: true,
      message: "Transaction status updated manually.",
      transaction: updated,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CONCURRENT_STATUS_UPDATE") {
      return c.json(
        {
          error:
            "Transaction status changed concurrently. Please refresh and retry.",
        },
        409,
      );
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE_FOR_REVERSAL") {
      return c.json(
        {
          error:
            "Cannot mark this transaction as success/pending because user balance is insufficient to reverse earlier refund.",
        },
        400,
      );
    }
    console.error("Manual transaction status update error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

adminRoutes.post("/api/admin/fund", requireAdmin, async (c) => {
  try {
    const adminUser = c.get("dbUser");
    const body = await c.req.json();
    const { userId, amount, actionType = "credit", remarks } = body;

    if (!userId || !amount || amount <= 0) {
      return c.json({ error: "Invalid amount or parameters" }, 400);
    }

    if (actionType !== "credit" && actionType !== "debit") {
      return c.json({ error: "Invalid action selected" }, 400);
    }

    const [targetUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    if (actionType === "debit" && targetUser.balance < amount) {
      return c.json(
        {
          error:
            "Debit sum forcefully exceeds user capabilities. Cannot dip into negative balances.",
        },
        400,
      );
    }

    const result = await db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(user)
        .set(
          actionType === "credit"
            ? incrementBalance(amount)
            : decrementBalance(amount),
        )
        .where(
          actionType === "credit"
            ? eq(user.id, userId)
            : and(eq(user.id, userId), gte(user.balance, amount)),
        )
        .returning();

      if (!updatedUser) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const messageContent = remarks
        ? `[${actionType.toUpperCase()}] ${remarks}`
        : actionType === "credit"
          ? `Credited manually by Administrator (${adminUser.name})`
          : `Debited manually by Administrator (${adminUser.name})`;

      const txId = createId();
      await tx.insert(transaction).values({
        id: txId,
        userId,
        targetPhone: "WALLET",
        operator: actionType === "credit" ? "MANUAL_CREDIT" : "MANUAL_DEBIT",
        amount,
        status: "SUCCESS",
        apiMessage: messageContent,
      });

      return { updatedUser, txId };
    });

    if (targetUser.role === "DISTRIBUTOR") {
      if (actionType === "credit") {
        await notifyDistributorWalletCredited({
          distributorId: userId,
          amount,
          transactionId: result.txId,
        });
      } else {
        await notifyDistributorWalletDebited({
          distributorId: userId,
          amount,
          transactionId: result.txId,
        });
      }
    } else if (targetUser.role === "RETAILER") {
      if (actionType === "credit") {
        await notifyRetailerWalletCredited({
          retailerId: userId,
          amount,
          transactionId: result.txId,
          sourceLabel: "an administrator",
        });
      } else {
        await notifyRetailerWalletDebited({
          retailerId: userId,
          amount,
          transactionId: result.txId,
        });
      }
    }

    return c.json({
      success: true,
      message: `Successfully ${actionType === "credit" ? "credited" : "debited"} ₹${amount} ${actionType === "credit" ? "to" : "from"} ${targetUser.name}`,
      balance: result.updatedUser.balance,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return c.json({ error: "Insufficient balance" }, 400);
    }
    console.error("Fund Wallet Error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

adminRoutes.post(
  "/api/admin/fund-requests/:id/approve",
  requireAdmin,
  async (c) => {
    try {
      const adminUser = c.get("dbUser");
      const requestId = c.req.param("id");

      const [request] = await db
        .select({
          id: fundRequest.id,
          retailerId: fundRequest.retailerId,
          distributorId: fundRequest.distributorId,
          amount: fundRequest.amount,
          status: fundRequest.status,
          remarks: fundRequest.remarks,
        })
        .from(fundRequest)
        .where(eq(fundRequest.id, requestId))
        .limit(1);

      if (!request || request.distributorId !== null) {
        return c.json({ error: "Fund request not found." }, 404);
      }

      if (request.status !== "PENDING") {
        return c.json({ error: "Fund request is no longer pending." }, 409);
      }

      const [retailer] = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, request.retailerId))
        .limit(1);

      if (!retailer) {
        return c.json({ error: "Retailer not found." }, 404);
      }

      const result = await db.transaction(async (tx) => {
        const [updatedRetailer] = await tx
          .update(user)
          .set(incrementBalance(request.amount))
          .where(eq(user.id, request.retailerId))
          .returning();

        const retTxId = createId();
        const message = request.remarks
          ? `[CREDIT] Approved fund request: ${request.remarks}`
          : `Fund request approved by ${adminUser.name}`;

        await tx.insert(transaction).values({
          id: retTxId,
          userId: request.retailerId,
          targetPhone: "WALLET",
          operator: "MANUAL_CREDIT",
          amount: request.amount,
          status: "SUCCESS",
          apiMessage: message,
        });

        const [updatedRequest] = await tx
          .update(fundRequest)
          .set({ status: "APPROVED" })
          .where(eq(fundRequest.id, requestId))
          .returning();

        return { updatedRetailer, updatedRequest, retTxId };
      });

      await markNotificationsReadForEntity({
        type: "FUND_REQUEST_PENDING",
        entityId: requestId,
      });

      await notifyRetailerFundRequestApproved({
        retailerId: request.retailerId,
        fundRequestId: requestId,
        amount: request.amount,
        approverName: adminUser.name,
      });

      return c.json({
        success: true,
        message: `Approved fund request and credited ₹${request.amount} to ${retailer.name}.`,
        request: {
          id: result.updatedRequest?.id,
          status: result.updatedRequest?.status,
        },
      });
    } catch (error) {
      console.error("Approve admin fund request error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

adminRoutes.post(
  "/api/admin/fund-requests/:id/reject",
  requireAdmin,
  async (c) => {
    try {
      const adminUser = c.get("dbUser");
      const requestId = c.req.param("id");

      const [request] = await db
        .select({
          id: fundRequest.id,
          retailerId: fundRequest.retailerId,
          distributorId: fundRequest.distributorId,
          amount: fundRequest.amount,
          status: fundRequest.status,
        })
        .from(fundRequest)
        .where(eq(fundRequest.id, requestId))
        .limit(1);

      if (!request || request.distributorId !== null) {
        return c.json({ error: "Fund request not found." }, 404);
      }

      if (request.status !== "PENDING") {
        return c.json({ error: "Fund request is no longer pending." }, 409);
      }

      const [updated] = await db
        .update(fundRequest)
        .set({ status: "REJECTED" })
        .where(eq(fundRequest.id, requestId))
        .returning();

      await markNotificationsReadForEntity({
        type: "FUND_REQUEST_PENDING",
        entityId: requestId,
      });

      await notifyRetailerFundRequestRejected({
        retailerId: request.retailerId,
        fundRequestId: requestId,
        amount: request.amount,
        approverName: adminUser.name,
      });

      return c.json({
        success: true,
        message: "Fund request rejected.",
        request: {
          id: updated.id,
          status: updated.status,
        },
      });
    } catch (error) {
      console.error("Reject admin fund request error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

adminRoutes.post("/api/admin/retailer/toggle-status", requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const { userId } = body;

    if (!userId) {
      return c.json({ error: "Invalid input" }, 400);
    }

    const [targetUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!targetUser) {
      return c.json({ error: "Retailer not found" }, 404);
    }
    if (targetUser.role !== "RETAILER") {
      return c.json({ error: "Only retailers can be suspended/restored." }, 400);
    }
    if (targetUser.accountStatus === "REJECTED") {
      return c.json({ error: "Rejected retailers cannot be restored from here." }, 400);
    }

    const newStatus =
      targetUser.accountStatus === "SUSPENDED" ? "APPROVED" : "SUSPENDED";

    const [updatedUser] = await db
      .update(user)
      .set({ accountStatus: newStatus })
      .where(eq(user.id, userId))
      .returning({ name: user.name, accountStatus: user.accountStatus });

    if (targetUser.distributorId) {
      if (newStatus === "SUSPENDED") {
        await notifyDistributorRetailerSuspended({
          distributorId: targetUser.distributorId,
          retailerId: userId,
          retailerName: updatedUser?.name ?? targetUser.name,
        });
      } else {
        await notifyDistributorRetailerRestored({
          distributorId: targetUser.distributorId,
          retailerId: userId,
          retailerName: updatedUser?.name ?? targetUser.name,
        });
      }
    }

    if (newStatus === "SUSPENDED") {
      await notifyRetailerAccountSuspended({ retailerId: userId });
    } else {
      await notifyRetailerAccountRestored({ retailerId: userId });
    }

    return c.json({
      success: true,
      message: `Successfully ${newStatus === "SUSPENDED" ? "suspended" : "activated"} retailer ${updatedUser?.name}`,
      accountStatus: updatedUser?.accountStatus,
    });
  } catch (error) {
    console.error("Toggle Status Error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

adminRoutes.post("/api/admin/users/approve", requireAdmin, async (c) => {
  try {
    const { userId } = await c.req.json();
    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const [target] = await db
      .select({
        role: user.role,
        accountStatus: user.accountStatus,
        distributorId: user.distributorId,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!target) {
      return c.json({ error: "User not found" }, 404);
    }
    if (target.role !== "RETAILER") {
      return c.json({ error: "Only retailers can be approved here." }, 400);
    }
    if (target.accountStatus === "APPROVED") {
      return c.json({ error: "User is already approved." }, 409);
    }
    if (target.accountStatus === "REJECTED") {
      return c.json({ error: "Rejected users cannot be approved directly." }, 409);
    }

    const [updatedUser] = await db
      .update(user)
      .set({ accountStatus: "APPROVED", mpinMustReset: true })
      .where(eq(user.id, userId))
      .returning({ name: user.name });

    if (!updatedUser) {
      return c.json({ error: "User not found" }, 404);
    }

    await markNotificationsReadForEntity({
      type: "RETAILER_PENDING_APPROVAL",
      entityId: userId,
    });

    if (target.distributorId) {
      await notifyDistributorRetailerApproved({
        distributorId: target.distributorId,
        retailerId: userId,
        retailerName: updatedUser.name,
      });
    }

    await notifyRetailerAccountApproved({ retailerId: userId });

    return c.json({
      success: true,
      message: `User ${updatedUser.name} approved successfully.`,
    });
  } catch (error) {
    console.error("Admin approval error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

adminRoutes.post("/api/admin/users/reject", requireAdmin, async (c) => {
  try {
    const { userId } = await c.req.json();
    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const [target] = await db
      .select({
        role: user.role,
        accountStatus: user.accountStatus,
        distributorId: user.distributorId,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!target) {
      return c.json({ error: "User not found" }, 404);
    }
    if (target.role !== "RETAILER") {
      return c.json({ error: "Only retailers can be rejected here." }, 400);
    }
    if (target.accountStatus === "REJECTED") {
      return c.json({ error: "User is already rejected." }, 409);
    }

    const [updatedUser] = await db
      .update(user)
      .set({ accountStatus: "REJECTED" })
      .where(eq(user.id, userId))
      .returning({ name: user.name });

    if (!updatedUser) {
      return c.json({ error: "User not found" }, 404);
    }

    await markNotificationsReadForEntity({
      type: "RETAILER_PENDING_APPROVAL",
      entityId: userId,
    });

    if (target.distributorId) {
      await notifyDistributorRetailerRejected({
        distributorId: target.distributorId,
        retailerId: userId,
        retailerName: updatedUser.name,
      });
    }

    await notifyRetailerAccountRejected({ retailerId: userId });

    return c.json({
      success: true,
      message: `User ${updatedUser.name} application has been rejected.`,
    });
  } catch (error) {
    console.error("Admin rejection error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

adminRoutes.post("/api/admin/users/config", requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const { userId, role, distributorId } = body;

    if (!userId || !role) {
      return c.json({ error: "User ID and Role are required." }, 400);
    }

    if (role !== "RETAILER" && role !== "DISTRIBUTOR" && role !== "ADMIN") {
      return c.json({ error: "Invalid role specified." }, 400);
    }

    const updatedDistributorId =
      role === "DISTRIBUTOR" || role === "ADMIN"
        ? null
        : distributorId || null;

    const [updatedUser] = await db
      .update(user)
      .set({
        role: role as Role,
        distributorId: updatedDistributorId,
      })
      .where(eq(user.id, userId))
      .returning();

    if (!updatedUser) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({
      success: true,
      message: "User configuration updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("User Config Error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

adminRoutes.get("/api/admin/disputes", requireAdmin, async (c) => {
  try {
    const { searchParams } = new URL(c.req.url);
    const statusParam = searchParams.get("status");
    const status =
      statusParam === "PENDING" || statusParam === "RESOLVED"
        ? statusParam
        : "ALL";

    const rows = await db
      .select({
        id: dispute.id,
        distributorId: transaction.userId,
        distributorName: user.name,
        transactionId: dispute.transactionId,
        subject: dispute.subject,
        message: dispute.message,
        status: dispute.status,
        adminNote: dispute.adminNote,
        createdAt: dispute.createdAt,
        resolvedAt: dispute.resolvedAt,
        resolvedBy: dispute.resolvedBy,
        transactionStatus: transaction.status,
        operator: transaction.operator,
        amount: transaction.amount,
        targetPhone: transaction.targetPhone,
        apiReferenceId: transaction.apiReferenceId,
      })
      .from(dispute)
      .innerJoin(transaction, eq(dispute.transactionId, transaction.id))
      .innerJoin(user, eq(transaction.userId, user.id))
      .where(status === "ALL" ? undefined : eq(dispute.status, status))
      .orderBy(desc(dispute.createdAt));

    return c.json({
      disputes: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      })),
    });
  } catch (error) {
    console.error("List admin disputes error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

adminRoutes.patch("/api/admin/disputes/:id/resolve", requireAdmin, async (c) => {
  try {
    const adminUser = c.get("dbUser");
    const disputeId = c.req.param("id");
    const body = await c.req.json();
    const adminNote =
      body?.adminNote == null ? null : String(body.adminNote).trim() || null;

    const [current] = await db
      .select({
        id: dispute.id,
        status: dispute.status,
        distributorId: dispute.distributorId,
        subject: dispute.subject,
        transactionId: dispute.transactionId,
      })
      .from(dispute)
      .where(eq(dispute.id, disputeId))
      .limit(1);

    if (!current) {
      return c.json({ error: "Dispute not found." }, 404);
    }

    if (current.status === "RESOLVED") {
      return c.json({ error: "Dispute is already resolved." }, 409);
    }

    const [updated] = await db.transaction(async (tx) => {
      // Legacy rows: a second PENDING after an earlier RESOLVED for the same tx.
      await tx
        .delete(dispute)
        .where(
          and(
            eq(dispute.transactionId, current.transactionId),
            eq(dispute.status, "RESOLVED"),
            ne(dispute.id, disputeId),
          ),
        );

      return tx
        .update(dispute)
        .set({
          status: "RESOLVED",
          adminNote,
          resolvedBy: adminUser.id,
          resolvedAt: new Date(),
        })
        .where(eq(dispute.id, disputeId))
        .returning({
          id: dispute.id,
          status: dispute.status,
          adminNote: dispute.adminNote,
          resolvedAt: dispute.resolvedAt,
        });
    });

    await markNotificationsReadForEntity({
      type: "DISPUTE_PENDING",
      entityId: disputeId,
    });

    await markNotificationsReadForEntity({
      type: "DISTRIBUTOR_DISPUTE_PENDING",
      entityId: disputeId,
    });

    const [distributor] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, current.distributorId))
      .limit(1);

    if (distributor?.role === "DISTRIBUTOR") {
      await notifyDistributorDisputeResolved({
        distributorId: current.distributorId,
        disputeId,
        subject: current.subject,
      });
    }

    const [txRow] = await db
      .select({ userId: transaction.userId })
      .from(dispute)
      .innerJoin(transaction, eq(dispute.transactionId, transaction.id))
      .where(eq(dispute.id, disputeId))
      .limit(1);

    if (txRow) {
      const [owner] = await db
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, txRow.userId))
        .limit(1);

      if (owner?.role === "RETAILER") {
        await notifyRetailerDisputeResolved({
          retailerId: txRow.userId,
          disputeId,
          subject: current.subject,
        });
      }
    }

    return c.json({
      success: true,
      message: "Dispute marked as resolved.",
      dispute: {
        ...updated,
        resolvedAt: updated?.resolvedAt
          ? updated.resolvedAt.toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error("Resolve dispute error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

adminRoutes.put("/api/admin/operator-providers", requireAdmin, async (c) => {
  try {
    const { operator, provider } = await c.req.json();
    const key = normalizeOperatorKey(String(operator));
    const providerId = assertProvider(String(provider));

    const now = new Date();
    await db
      .insert(operatorProviderConfig)
      .values({
        id: createId(),
        operator: key,
        provider: providerId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: operatorProviderConfig.operator,
        set: { provider: providerId, updatedAt: now },
      });

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid provider";
    return c.json({ error: message }, 400);
  }
});

adminRoutes.put("/api/admin/operator-providers/backup", requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const { operator, backup, slot } = body as {
      operator: string;
      backup: string;
      slot: BackupSlot;
    };

    const key = normalizeOperatorKey(operator);
    const backupValue = parseBackupValue(backup);
    const data =
      slot === 1
        ? { backupProvider: backupValue }
        : { backupProvider2: backupValue };

    const [existing] = await db
      .select()
      .from(operatorProviderConfig)
      .where(eq(operatorProviderConfig.operator, key))
      .limit(1);

    if (existing) {
      await db
        .update(operatorProviderConfig)
        .set(data)
        .where(eq(operatorProviderConfig.operator, key));
    } else {
      const now = new Date();
      await db.insert(operatorProviderConfig).values({
        id: createId(),
        operator: key,
        provider: "REALROBO",
        createdAt: now,
        updatedAt: now,
        ...data,
      });
    }

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid provider";
    return c.json({ error: message }, 400);
  }
});

adminRoutes.delete(
  "/api/admin/operator-providers/:operator",
  requireAdmin,
  async (c) => {
    try {
      const key = normalizeOperatorKey(c.req.param("operator"));
      await db
        .delete(operatorProviderConfig)
        .where(eq(operatorProviderConfig.operator, key));
      return c.json({ success: true });
    } catch (error) {
      console.error("Delete operator provider error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

adminRoutes.post("/api/admin/commissions", requireAdmin, async (c) => {
  try {
    const data = await c.req.json();
    await db.insert(commissionRule).values({ id: createId(), ...data });
    return c.json({ success: true });
  } catch (error) {
    console.error("Create commission error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

adminRoutes.patch("/api/admin/commissions/:id", requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    await db.update(commissionRule).set(data).where(eq(commissionRule.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Update commission error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

adminRoutes.delete("/api/admin/commissions/:id", requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(commissionRule).where(eq(commissionRule.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete commission error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

type CommissionMarginPayload = {
  providerMargin?: number;
  adminMargin?: number;
  distributorMargin?: number;
  retailerMargin?: number;
};

function parseCommissionMarginPayload(data: CommissionMarginPayload) {
  return {
    providerMargin: Number(data.providerMargin ?? 0),
    adminMargin: Number(data.adminMargin ?? 0),
    distributorMargin: Number(data.distributorMargin ?? 0),
    retailerMargin: Number(data.retailerMargin ?? 0),
  };
}

async function requireRetailerUser(userId: string) {
  const [found] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!found) return { error: "User not found.", status: 404 as const };
  if (found.role !== "RETAILER") {
    return { error: "Commission overrides apply to retailers only.", status: 400 as const };
  }
  return { user: found };
}

adminRoutes.get(
  "/api/admin/users/:userId/commission-overrides",
  requireAdmin,
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const retailerCheck = await requireRetailerUser(userId);
      if ("error" in retailerCheck) {
        return c.json({ error: retailerCheck.error }, retailerCheck.status);
      }

      const [globalRules, overrides] = await Promise.all([
        db.select().from(commissionRule).orderBy(asc(commissionRule.operator)),
        db
          .select()
          .from(retailerCommissionOverride)
          .where(eq(retailerCommissionOverride.userId, userId)),
      ]);

      const overrideByOperator = new Map(
        overrides.map((row) => [row.operator, row]),
      );

      return c.json({
        rules: globalRules.map((rule) => {
          const override = overrideByOperator.get(rule.operator);
          const effective = override
            ? {
                providerMargin: override.providerMargin,
                adminMargin: override.adminMargin,
                distributorMargin: override.distributorMargin,
                retailerMargin: override.retailerMargin,
              }
            : {
                providerMargin: rule.providerMargin,
                adminMargin: rule.adminMargin,
                distributorMargin: rule.distributorMargin,
                retailerMargin: rule.retailerMargin,
              };

          return {
            operator: rule.operator,
            defaultRuleId: rule.id,
            default: {
              providerMargin: rule.providerMargin,
              adminMargin: rule.adminMargin,
              distributorMargin: rule.distributorMargin,
              retailerMargin: rule.retailerMargin,
            },
            override: override
              ? {
                  id: override.id,
                  providerMargin: override.providerMargin,
                  adminMargin: override.adminMargin,
                  distributorMargin: override.distributorMargin,
                  retailerMargin: override.retailerMargin,
                  updatedAt: override.updatedAt.toISOString(),
                }
              : null,
            effective,
            isOverridden: Boolean(override),
          };
        }),
      });
    } catch (error) {
      console.error("List retailer commission overrides error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

adminRoutes.post(
  "/api/admin/users/:userId/commission-overrides",
  requireAdmin,
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const retailerCheck = await requireRetailerUser(userId);
      if ("error" in retailerCheck) {
        return c.json({ error: retailerCheck.error }, retailerCheck.status);
      }

      const data = await c.req.json();
      const operator = String(data.operator ?? "").trim();
      if (!operator) {
        return c.json({ error: "Operator is required." }, 400);
      }

      const [globalRule] = await db
        .select({ id: commissionRule.id })
        .from(commissionRule)
        .where(eq(commissionRule.operator, operator))
        .limit(1);

      if (!globalRule) {
        return c.json(
          { error: "No default commission rule exists for this operator." },
          400,
        );
      }

      const margins = parseCommissionMarginPayload(data);
      const [created] = await db
        .insert(retailerCommissionOverride)
        .values({
          id: createId(),
          userId,
          operator,
          ...margins,
        })
        .returning();

      return c.json({
        success: true,
        override: {
          ...created,
          updatedAt: created.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("Create retailer commission override error:", error);
      return c.json(
        { error: "Could not create override. It may already exist for this operator." },
        500,
      );
    }
  },
);

adminRoutes.patch(
  "/api/admin/users/:userId/commission-overrides/:id",
  requireAdmin,
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const id = c.req.param("id");
      const retailerCheck = await requireRetailerUser(userId);
      if ("error" in retailerCheck) {
        return c.json({ error: retailerCheck.error }, retailerCheck.status);
      }

      const data = await c.req.json();
      const margins = parseCommissionMarginPayload(data);

      const [updated] = await db
        .update(retailerCommissionOverride)
        .set(margins)
        .where(
          and(
            eq(retailerCommissionOverride.id, id),
            eq(retailerCommissionOverride.userId, userId),
          ),
        )
        .returning();

      if (!updated) {
        return c.json({ error: "Override not found." }, 404);
      }

      return c.json({
        success: true,
        override: {
          ...updated,
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("Update retailer commission override error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

adminRoutes.delete(
  "/api/admin/users/:userId/commission-overrides/:id",
  requireAdmin,
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const id = c.req.param("id");
      const retailerCheck = await requireRetailerUser(userId);
      if ("error" in retailerCheck) {
        return c.json({ error: retailerCheck.error }, retailerCheck.status);
      }

      const [deleted] = await db
        .delete(retailerCommissionOverride)
        .where(
          and(
            eq(retailerCommissionOverride.id, id),
            eq(retailerCommissionOverride.userId, userId),
          ),
        )
        .returning({ id: retailerCommissionOverride.id });

      if (!deleted) {
        return c.json({ error: "Override not found." }, 404);
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("Delete retailer commission override error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

import { and, eq, sql } from "drizzle-orm";
import { commissionRule, db, transaction, user } from "@repo/db";

import { incrementBalance } from "./db-utils";
import { creditAdminCommission } from "./user-earnings";
import { validateProviderCredentials } from "./env-validation";
import {
  notifyDistributorRechargeSettled,
  resolveRechargeSettlementOutcome,
} from "./notifications";
import {
  parseRechargeProviderResponse,
  type ParsedRechargeResponse,
} from "./recharge-gateway";
import { checkRealRoboStatus } from "./realrobo";

const DEFAULT_LIMIT = 50;

export type SyncPendingRealRoboResult = {
  checked: number;
  updated: number;
  succeeded: number;
  failed: number;
  stillPending: number;
  errors: Array<{ transactionId: string; message: string }>;
};

type PendingTransaction = typeof transaction.$inferSelect;

export async function settlePendingTransaction(
  tx: PendingTransaction,
  parsed: ParsedRechargeResponse,
): Promise<"unchanged" | "updated"> {
  if (parsed.finalStatus === "PENDING") {
    if (
      parsed.apiMessage === tx.apiMessage &&
      (parsed.apiReferenceId ?? null) === (tx.apiReferenceId ?? null)
    ) {
      return "unchanged";
    }

    const [updated] = await db
      .update(transaction)
      .set({
        apiMessage: parsed.apiMessage,
        apiReferenceId: parsed.apiReferenceId ?? tx.apiReferenceId,
      })
      .where(and(eq(transaction.id, tx.id), eq(transaction.status, "PENDING")))
      .returning({ id: transaction.id });

    if (!updated) {
      return "unchanged";
    }

    return "updated";
  }

  const [txUser] = await db
    .select({
      distributorId: user.distributorId,
      role: user.role,
      name: user.name,
    })
    .from(user)
    .where(eq(user.id, tx.userId))
    .limit(1);

  const [rule] = await db
    .select()
    .from(commissionRule)
    .where(eq(commissionRule.operator, tx.operator))
    .limit(1);

  const amount = tx.amount;
  const rCommission = (amount * (rule?.retailerMargin ?? 0)) / 100;
  const dCommission = (amount * (rule?.distributorMargin ?? 0)) / 100;
  const aCommission = (amount * (rule?.adminMargin ?? 0)) / 100;

  const isDistributorSelfRecharge =
    txUser?.role === "DISTRIBUTOR" && !txUser?.distributorId;

  let adminCommission: number;
  let distributorCommission: number;

  if (isDistributorSelfRecharge) {
    adminCommission = aCommission + dCommission;
    distributorCommission = 0;
  } else {
    const hasDistributor = !!txUser?.distributorId;
    adminCommission = aCommission + (hasDistributor ? 0 : dCommission);
    distributorCommission = hasDistributor ? dCommission : 0;
  }

  const settled = await db.transaction(async (dbTx) => {
    const [settled] = await dbTx
      .update(transaction)
      .set({
        status: parsed.finalStatus,
        apiMessage: parsed.apiMessage,
        apiReferenceId: parsed.apiReferenceId,
        ...(parsed.finalStatus === "SUCCESS"
          ? {
              retailerCommission: rCommission,
              distributorCommission,
              adminCommission,
            }
          : {}),
      })
      .where(and(eq(transaction.id, tx.id), eq(transaction.status, "PENDING")))
      .returning({ id: transaction.id });

    if (!settled) {
      return false;
    }

    if (parsed.shouldRefund && parsed.finalStatus === "FAILED") {
      await dbTx
        .update(user)
        .set(incrementBalance(amount))
        .where(eq(user.id, tx.userId));
    }

    if (parsed.finalStatus === "SUCCESS") {
      if (rCommission > 0) {
        await dbTx
          .update(user)
          .set({ earnings: sql`${user.earnings} + ${rCommission}` })
          .where(eq(user.id, tx.userId));
      }

      if (distributorCommission > 0 && txUser?.distributorId) {
        await dbTx
          .update(user)
          .set({
            earnings: sql`${user.earnings} + ${distributorCommission}`,
          })
          .where(eq(user.id, txUser.distributorId));
      }

      if (adminCommission > 0) {
        await creditAdminCommission(dbTx, adminCommission);
      }
    }
    return true;
  });

  if (settled && txUser) {
    const finalStatus = parsed.finalStatus;
    if (
      finalStatus === "SUCCESS" ||
      finalStatus === "FAILED" ||
      finalStatus === "REFUNDED"
    ) {
      await notifyDistributorRechargeSettled({
        transactionId: tx.id,
        operator: tx.operator,
        amount: tx.amount,
        targetPhone: tx.targetPhone,
        actorName: txUser.name,
        actorRole: txUser.role,
        userId: tx.userId,
        distributorId: txUser.distributorId,
        outcome: resolveRechargeSettlementOutcome({
          status: finalStatus,
          refunded: parsed.shouldRefund && finalStatus === "FAILED",
        }),
      });
    }
  }

  return settled ? "updated" : "unchanged";
}

/** Poll RealRobo for pending recharges and update local transaction rows. */
export async function syncPendingRealRoboTransactionsForUser(
  userId: string,
  options?: { limit?: number },
): Promise<SyncPendingRealRoboResult> {
  validateProviderCredentials("REALROBO");

  const result: SyncPendingRealRoboResult = {
    checked: 0,
    updated: 0,
    succeeded: 0,
    failed: 0,
    stillPending: 0,
    errors: [],
  };

  const limit = options?.limit ?? DEFAULT_LIMIT;

  const pending = await db
    .select()
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        eq(transaction.status, "PENDING"),
        eq(transaction.provider, "REALROBO"),
      ),
    )
    .limit(limit);

  for (const tx of pending) {
    result.checked += 1;

    try {
      const apiResult = await checkRealRoboStatus(tx.id);
      const parsed = parseRechargeProviderResponse(
        "REALROBO",
        apiResult,
        tx.id,
      );

      const outcome = await settlePendingTransaction(tx, parsed);

      if (parsed.finalStatus === "PENDING") {
        result.stillPending += 1;
      } else if (parsed.finalStatus === "SUCCESS") {
        result.succeeded += 1;
      } else if (parsed.finalStatus === "FAILED") {
        result.failed += 1;
      }

      if (outcome === "updated") {
        result.updated += 1;
      }
    } catch (err) {
      result.errors.push({
        transactionId: tx.id,
        message:
          err instanceof Error ? err.message : "RealRobo status check failed",
      });
    }
  }

  return result;
}

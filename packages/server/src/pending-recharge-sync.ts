import { and, eq, sql } from "drizzle-orm";
import { commissionRule, db, transaction, user } from "@repo/db";

import { incrementBalance } from "./db-utils";
import { creditAdminCommission } from "./user-earnings";
import { validateProviderCredentials } from "./env-validation";
import {
  notifyDistributorRechargeSettled,
  resolveRechargeSettlementOutcome,
} from "./notifications";
import { checkA1TopupStatus } from "./a1topup";
import { getAvailableProviders, type LiveProvider } from "./env-validation";
import {
  parseRechargeProviderResponse,
  type ParsedRechargeResponse,
} from "./recharge-gateway";
import { checkMRoboticsStatus } from "./mrobotics";
import { checkRealRoboStatus } from "./realrobo";

const DEFAULT_LIMIT = 50;

export type SyncPendingResult = {
  checked: number;
  updated: number;
  succeeded: number;
  failed: number;
  stillPending: number;
  errors: Array<{ transactionId: string; message: string }>;
};

/** @deprecated Use SyncPendingResult */
export type SyncPendingRealRoboResult = SyncPendingResult;

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

function emptySyncResult(): SyncPendingResult {
  return {
    checked: 0,
    updated: 0,
    succeeded: 0,
    failed: 0,
    stillPending: 0,
    errors: [],
  };
}

function mergeSyncResults(...results: SyncPendingResult[]): SyncPendingResult {
  return results.reduce(
    (acc, result) => ({
      checked: acc.checked + result.checked,
      updated: acc.updated + result.updated,
      succeeded: acc.succeeded + result.succeeded,
      failed: acc.failed + result.failed,
      stillPending: acc.stillPending + result.stillPending,
      errors: [...acc.errors, ...result.errors],
    }),
    emptySyncResult(),
  );
}

async function syncPendingProviderTransactions(
  provider: LiveProvider,
  options?: { userId?: string; limit?: number },
): Promise<SyncPendingResult> {
  validateProviderCredentials(provider);

  const result = emptySyncResult();
  const limit = options?.limit ?? DEFAULT_LIMIT;

  const conditions = [
    eq(transaction.status, "PENDING"),
    eq(transaction.provider, provider),
  ];
  if (options?.userId) {
    conditions.push(eq(transaction.userId, options.userId));
  }

  const pending = await db
    .select()
    .from(transaction)
    .where(and(...conditions))
    .limit(limit);

  for (const tx of pending) {
    result.checked += 1;

    try {
      const apiResult =
        provider === "REALROBO"
          ? await checkRealRoboStatus(tx.id)
          : provider === "A1TOPUP"
            ? await checkA1TopupStatus(tx.id)
            : await checkMRoboticsStatus(tx.id);

      const parsed = parseRechargeProviderResponse(provider, apiResult, tx.id);
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
          err instanceof Error
            ? err.message
            : `${provider} status check failed`,
      });
    }
  }

  return result;
}

/** Poll configured providers for pending recharges and update local rows. */
export async function syncPendingRechargeTransactions(
  options?: { userId?: string; limit?: number },
): Promise<SyncPendingResult> {
  const configured = new Set(getAvailableProviders());
  const providers: LiveProvider[] = ["REALROBO", "A1TOPUP", "MROBOTICS"];
  const results: SyncPendingResult[] = [];

  for (const provider of providers) {
    if (!configured.has(provider)) continue;
    results.push(await syncPendingProviderTransactions(provider, options));
  }

  return mergeSyncResults(...results);
}

/** Poll RealRobo for pending recharges and update local transaction rows. */
export async function syncPendingRealRoboTransactions(
  options?: { userId?: string; limit?: number },
): Promise<SyncPendingResult> {
  return syncPendingProviderTransactions("REALROBO", options);
}

/** Poll A1Topup for pending recharges and update local transaction rows. */
export async function syncPendingA1TopupTransactions(
  options?: { userId?: string; limit?: number },
): Promise<SyncPendingResult> {
  return syncPendingProviderTransactions("A1TOPUP", options);
}

export async function syncPendingRealRoboTransactionsForUser(
  userId: string,
  options?: { limit?: number },
): Promise<SyncPendingResult> {
  return syncPendingRealRoboTransactions({ ...options, userId });
}

export async function syncPendingRechargeTransactionsForUser(
  userId: string,
  options?: { limit?: number },
): Promise<SyncPendingResult> {
  return syncPendingRechargeTransactions({ ...options, userId });
}

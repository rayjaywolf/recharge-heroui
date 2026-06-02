import { and, asc, desc, eq, gte, inArray, lte, notInArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import {
  commissionRule,
  createId,
  db,
  operatorProviderConfig,
  transaction,
  user,
} from "@repo/db";
import { PROVIDER_LABELS } from "@repo/shared/recharge-config";
import {
  normalizePhoneNumber,
  validatePhoneNumber,
} from "@repo/shared/phone";
import { validateMpin } from "@repo/shared/mpin";
import { decrementBalance, incrementBalance } from "@repo/server/db-utils";
import { resolveDateRange } from "@repo/server/date-range";
import {
  getAvailableProviders,
  validateProviderCredentials,
} from "@repo/server/env-validation";
import {
  buildProviderAttemptChain,
  resolveProvidersForOperator,
  type RechargeProviderId,
} from "@repo/server/operator-provider";
import {
  callRechargeProvider,
  parseRechargeProviderResponse,
  type ParsedRechargeResponse,
} from "@repo/server/recharge-gateway";
import { syncPendingRealRoboTransactionsForUser } from "@repo/server/pending-recharge-sync";
import { validateRealRoboCircle } from "@repo/server/realrobo";
import { verifyUserMpin } from "@repo/server/mpin";
import { CIRCLES_BY_PROVIDER, getClientProviders } from "@repo/shared/recharge-config";
import { isPlanapiConfigured } from "@repo/server/planapi";
import { lookupMobileOperatorAndCircleCached } from "@repo/server/operator-lookup-cache";
import {
  getRechargePlansForPair,
  isRechargePlansEnabled,
} from "@repo/server/recharge-plan-cache";
import {
  getRetailerTopAmounts,
  invalidateRetailerTopAmountsCache,
} from "@repo/server/retailer-top-amounts-cache";
import { requireSession, type AppVariables } from "../middleware";

const EXCLUDED_OPERATORS = [
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "FUNDS_SENT",
  "FUNDS_RECEIVED",
];

export const rechargeRoutes = new Hono<{ Variables: AppVariables }>();

rechargeRoutes.get("/api/recharge/config", requireSession, async (c) => {
  try {
    const [rules, routing] = await Promise.all([
      db
        .select({ operator: commissionRule.operator })
        .from(commissionRule)
        .orderBy(asc(commissionRule.operator)),
      db
        .select({
          operator: operatorProviderConfig.operator,
          provider: operatorProviderConfig.provider,
          backupProvider: operatorProviderConfig.backupProvider,
          backupProvider2: operatorProviderConfig.backupProvider2,
        })
        .from(operatorProviderConfig),
    ]);

    const liveProviders = getAvailableProviders();

    return c.json({
      operators: rules.map((r) => r.operator),
      providers: getClientProviders(liveProviders),
      circlesByProvider: CIRCLES_BY_PROVIDER,
      operatorLookupEnabled: isPlanapiConfigured(),
      rechargePlansEnabled: isRechargePlansEnabled(),
      operatorProviders: Object.fromEntries(
        routing.map((r) => [r.operator, r.provider]),
      ),
      operatorBackupProviders: Object.fromEntries(
        routing
          .filter((r) => r.backupProvider != null)
          .map((r) => [r.operator, r.backupProvider]),
      ),
      operatorBackup2Providers: Object.fromEntries(
        routing
          .filter((r) => r.backupProvider2 != null)
          .map((r) => [r.operator, r.backupProvider2]),
      ),
    });
  } catch (error) {
    console.error("Recharge config error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

rechargeRoutes.get("/api/recharge/operator-lookup", requireSession, async (c) => {
  try {
    const phone = c.req.query("phone")?.trim() ?? "";
    if (!phone) {
      return c.json({ error: "Phone number is required." }, 400);
    }

    if (!isPlanapiConfigured()) {
      return c.json(
        { error: "Operator lookup is not configured.", available: false },
        503,
      );
    }

    const [rules, routing] = await Promise.all([
      db
        .select({ operator: commissionRule.operator })
        .from(commissionRule)
        .orderBy(asc(commissionRule.operator)),
      db
        .select({
          operator: operatorProviderConfig.operator,
          provider: operatorProviderConfig.provider,
        })
        .from(operatorProviderConfig),
    ]);

    const operators = rules.map((r) => r.operator);
    const operatorProviders = Object.fromEntries(
      routing.map((r) => [r.operator, r.provider]),
    );

    const { lookupCached, ...result } = await lookupMobileOperatorAndCircleCached({
      phone,
      configuredOperators: operators,
      circlesByProvider: CIRCLES_BY_PROVIDER,
      operatorProviders,
    });

    let plans = null;
    if (isRechargePlansEnabled()) {
      try {
        plans = await getRechargePlansForPair({
          operatorLabel: result.operator,
          internalCircleCode: result.circleCode,
          circleLabel: result.circleLabel,
          planapiOpCode: result.planapi.opCode,
          planapiCircleCode: result.planapi.circleCode,
          planapiCircleName: result.planapi.circle,
        });
      } catch (planError) {
        console.error("Recharge plans fetch after lookup:", planError);
      }
    }

    return c.json({
      available: true,
      operator: result.operator,
      circleCode: result.circleCode,
      circleLabel: result.circleLabel,
      planapi: result.planapi,
      plans,
      lookupCached,
      plansCached: plans?.cached ?? false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Operator lookup failed.";
    console.error("Operator lookup error:", error);
    return c.json({ error: message, available: true }, 400);
  }
});

rechargeRoutes.get("/api/recharge/plans", requireSession, async (c) => {
  try {
    const operator = c.req.query("operator")?.trim() ?? "";
    const circleCode = c.req.query("circleCode")?.trim() || null;
    const planapiOpCode = c.req.query("planapiOpCode")?.trim() || null;
    const planapiCircleCode = c.req.query("planapiCircleCode")?.trim() || null;

    if (!operator) {
      return c.json({ error: "Operator is required." }, 400);
    }

    if (!isRechargePlansEnabled()) {
      return c.json(
        { error: "Recharge plans are not configured.", available: false },
        503,
      );
    }

    const circleLabel =
      circleCode != null
        ? (Object.values(CIRCLES_BY_PROVIDER)
            .flat()
            .find((c) => c.code === circleCode)?.label ?? null)
        : null;

    const plans = await getRechargePlansForPair({
      operatorLabel: operator,
      internalCircleCode: circleCode,
      circleLabel,
      planapiOpCode,
      planapiCircleCode,
    });

    if (!plans) {
      return c.json(
        {
          error:
            "Could not resolve operator and circle for plan lookup. Select a supported circle.",
        },
        400,
      );
    }

    return c.json({ available: true, ...plans });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load recharge plans.";
    console.error("Recharge plans error:", error);
    return c.json({ error: message, available: true }, 400);
  }
});

rechargeRoutes.get("/api/recharge/top-amounts", requireSession, async (c) => {
  try {
    const session = c.get("session");
    const operator = c.req.query("operator")?.trim() ?? "";

    if (!operator) {
      return c.json({ error: "Operator is required." }, 400);
    }

    const { amounts, cached } = await getRetailerTopAmounts({
      userId: session.user.id,
      operator,
    });

    return c.json({ amounts, cached });
  } catch (error) {
    console.error("Top recharge amounts error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

rechargeRoutes.get("/api/recharge/recent", requireSession, async (c) => {
  try {
    const session = c.get("session");

    const transactions = await db
      .select({
        targetPhone: transaction.targetPhone,
        operator: transaction.operator,
        amount: transaction.amount,
        createdAt: transaction.createdAt,
      })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, session.user.id),
          notInArray(transaction.operator, EXCLUDED_OPERATORS),
        ),
      )
      .orderBy(desc(transaction.createdAt))
      .limit(30);

    const seen = new Set<string>();
    const recent = [];

    for (const tx of transactions) {
      if (seen.has(tx.targetPhone)) continue;
      seen.add(tx.targetPhone);
      recent.push({
        phone: tx.targetPhone,
        operator: tx.operator,
        lastAmount: tx.amount,
        lastRechargedAt: tx.createdAt,
      });
      if (recent.length >= 8) break;
    }

    return c.json({ recent });
  } catch (error) {
    console.error("Recent recharges error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

rechargeRoutes.get("/api/recharge/transactions", requireSession, async (c) => {
  try {
    const session = c.get("session");
    const { searchParams } = new URL(c.req.url);

    let start: Date;
    let end: Date;
    let scope: string;

    try {
      ({ start, end, scope } = resolveDateRange(searchParams));
    } catch (e) {
      if ((e as Error).message === "INVALID_CUSTOM_RANGE") {
        return c.json(
          {
            error:
              "Invalid custom date range. Provide from and to (YYYY-MM-DD).",
          },
          400,
        );
      }
      throw e;
    }

    const take =
      scope === "last90" ? 500 : scope === "last30" ? 300 : 200;

    const transactions = await db
      .select({
        id: transaction.id,
        targetPhone: transaction.targetPhone,
        operator: transaction.operator,
        amount: transaction.amount,
        status: transaction.status,
        provider: transaction.provider,
        apiReferenceId: transaction.apiReferenceId,
        apiMessage: transaction.apiMessage,
        circleCode: transaction.circleCode,
        createdAt: transaction.createdAt,
      })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, session.user.id),
          notInArray(transaction.operator, EXCLUDED_OPERATORS),
          gte(transaction.createdAt, start),
          lte(transaction.createdAt, end),
        ),
      )
      .orderBy(desc(transaction.createdAt))
      .limit(take);

    return c.json({
      transactions: transactions.map((tx) => ({
        ...tx,
        createdAt: tx.createdAt.toISOString(),
      })),
      meta: {
        scope,
        from: start.toISOString(),
        to: end.toISOString(),
        count: transactions.length,
      },
    });
  } catch (error) {
    console.error("Transactions list error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

rechargeRoutes.post("/api/recharge/sync-pending", requireSession, async (c) => {
  try {
    const session = c.get("session");
    const result = await syncPendingRealRoboTransactionsForUser(
      session.user.id,
    );

    const parts: string[] = [];
    if (result.succeeded > 0) parts.push(`${result.succeeded} succeeded`);
    if (result.failed > 0) parts.push(`${result.failed} failed`);
    if (result.stillPending > 0) {
      parts.push(`${result.stillPending} still pending`);
    }

    const message =
      result.checked === 0
        ? "No pending RealRobo recharges to check."
        : result.updated > 0
          ? `Updated ${result.updated} of ${result.checked} pending recharge${result.checked === 1 ? "" : "s"}${parts.length > 0 ? ` (${parts.join(", ")})` : ""}.`
          : `Checked ${result.checked} pending recharge${result.checked === 1 ? "" : "s"}; no status changes yet${parts.length > 0 ? ` (${parts.join(", ")})` : ""}.`;

    return c.json({
      success: true,
      message,
      ...result,
    });
  } catch (error) {
    console.error("Sync pending recharges error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    if (msg.includes("REALROBO_API_TOKEN")) {
      return c.json({ error: "RealRobo is not configured." }, 503);
    }
    return c.json({ error: "Could not refresh pending recharges." }, 500);
  }
});

rechargeRoutes.post("/api/recharge", requireSession, async (c) => {
  try {
    const session = c.get("session");
    const body = await c.req.json();
    const { phone, operator, amount, circleCode, idempotencyKey, mpin } = body;

    if (!phone || !operator || !amount || amount <= 0) {
      return c.json({ error: "Invalid input" }, 400);
    }

    if (!validatePhoneNumber(phone)) {
      return c.json(
        {
          error:
            "Invalid phone number. Please enter a valid 10-digit Indian mobile number.",
        },
        400,
      );
    }

    if (session.user.role !== "ADMIN") {
      if (!validateMpin(String(mpin ?? ""))) {
        return c.json({ error: "Valid 4-digit MPIN is required." }, 400);
      }

      const mpinOk = await verifyUserMpin(session.user.id, String(mpin));
      if (!mpinOk) {
        return c.json(
          { error: "Incorrect MPIN. Please try again." },
          401,
        );
      }
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const routing = await resolveProvidersForOperator(operator);
    const providerChain = buildProviderAttemptChain(routing);
    const primaryProvider = routing.primary;

    if (providerChain.includes("REALROBO")) {
      try {
        validateRealRoboCircle(circleCode);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Circle is required for recharge.";
        return c.json({ error: message }, 400);
      }
    }

    if (idempotencyKey) {
      const [existing] = await db
        .select({ id: transaction.id })
        .from(transaction)
        .where(eq(transaction.idempotencyKey, idempotencyKey))
        .limit(1);
      if (existing) {
        return c.json(
          { error: "Duplicate action detected. Request is already processing." },
          409,
        );
      }
    }

    const result = await db.transaction(async (tx) => {
      const [currentUser] = await tx
        .select()
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);

      if (!currentUser) throw new Error("User not found");
      if (
        currentUser.role !== "ADMIN" &&
        currentUser.accountStatus !== "APPROVED"
      ) {
        throw new Error("ACCOUNT_NOT_APPROVED");
      }
      if (currentUser.accountStatus === "SUSPENDED") {
        throw new Error("ACCOUNT_SUSPENDED");
      }
      if (currentUser.balance < amount) throw new Error("Insufficient balance");

      const [updated] = await tx
        .update(user)
        .set(decrementBalance(amount))
        .where(and(eq(user.id, currentUser.id), gte(user.balance, amount)))
        .returning();

      if (!updated) throw new Error("Insufficient balance");

      const txId = createId();
      const [createdTx] = await tx
        .insert(transaction)
        .values({
          id: txId,
          userId: currentUser.id,
          targetPhone: normalizedPhone,
          operator,
          amount,
          circleCode: circleCode || null,
          provider: primaryProvider,
          status: "PENDING",
          idempotencyKey: idempotencyKey || null,
        })
        .returning();

      return {
        transaction: createdTx,
        distributorId: currentUser.distributorId,
        userRole: currentUser.role,
      };
    });

    const [rule] = await db
      .select()
      .from(commissionRule)
      .where(eq(commissionRule.operator, operator))
      .limit(1);

    const rMargin = rule?.retailerMargin ?? 0;
    const dMargin = rule?.distributorMargin ?? 0;
    const aMargin = rule?.adminMargin ?? 0;

    const rCommission = (amount * rMargin) / 100;
    const dCommission = (amount * dMargin) / 100;
    const aCommission = (amount * aMargin) / 100;

    const isDistributorSelfRecharge =
      result.userRole === "DISTRIBUTOR" && !result.distributorId;

    let adminCommission: number;
    let distributorCommission: number;

    if (isDistributorSelfRecharge) {
      adminCommission = aCommission + dCommission;
      distributorCommission = 0;
    } else {
      const hasDistributor = !!result.distributorId;
      adminCommission = aCommission + (hasDistributor ? 0 : dCommission);
      distributorCommission = hasDistributor ? dCommission : 0;
    }

    let usedProvider: RechargeProviderId = primaryProvider;
    let parsed: ParsedRechargeResponse = {
      finalStatus: "FAILED",
      apiMessage: "No provider available.",
      apiReferenceId: null,
      shouldRefund: true,
    };
    let usedBackup = false;
    let primaryFailedMessage: string | null = null;

    for (let i = 0; i < providerChain.length; i++) {
      const providerId = providerChain[i];
      if (i > 0) usedBackup = true;

      try {
        validateProviderCredentials(providerId);
        const apiResult = await callRechargeProvider({
          providerId,
          phone: normalizedPhone,
          operator,
          amount,
          circleCode,
          transactionId: result.transaction.id,
        });

        parsed = parseRechargeProviderResponse(
          providerId,
          apiResult,
          result.transaction.id,
        );
        usedProvider = providerId;

        if (parsed.finalStatus === "FAILED" && i === 0) {
          primaryFailedMessage = parsed.apiMessage;
        }

        if (parsed.finalStatus !== "FAILED") break;
      } catch (apiError) {
        console.error(`Provider ${providerId} API error:`, apiError);
        parsed = {
          finalStatus: "FAILED",
          apiMessage: "Provider API error. Please try again.",
          apiReferenceId: null,
          shouldRefund: true,
        };
        usedProvider = providerId;
        if (i === 0) primaryFailedMessage = parsed.apiMessage;
      }
    }

    let apiMessage = parsed.apiMessage;
    if (usedBackup) {
      const backupLabel =
        PROVIDER_LABELS[usedProvider as keyof typeof PROVIDER_LABELS] ??
        usedProvider;
      if (parsed.finalStatus === "FAILED") {
        apiMessage = primaryFailedMessage
          ? `[Primary failed: ${primaryFailedMessage}] [Backup ${backupLabel} failed: ${parsed.apiMessage}]`
          : `[Backup ${backupLabel} failed: ${parsed.apiMessage}]`;
      } else {
        apiMessage = `[Backup API: ${backupLabel}] ${parsed.apiMessage}`;
      }
    }

    const finalStatus = parsed.finalStatus;
    const apiReferenceId = parsed.apiReferenceId;
    const shouldRefund = parsed.shouldRefund;

    const updatedTransaction = await db.transaction(async (tx) => {
      const [t] = await tx
        .update(transaction)
        .set({
          status: finalStatus,
          provider: usedProvider,
          apiMessage,
          apiReferenceId,
          ...(finalStatus === "SUCCESS"
            ? {
                retailerCommission: rCommission,
                distributorCommission,
                adminCommission,
              }
            : {}),
        })
        .where(
          and(
            eq(transaction.id, result.transaction.id),
            eq(transaction.status, "PENDING"),
          ),
        )
        .returning();

      if (!t) {
        const [latest] = await tx
          .select()
          .from(transaction)
          .where(eq(transaction.id, result.transaction.id))
          .limit(1);
        return {
          transaction: latest ?? result.transaction,
          status: latest?.status ?? "PENDING",
          message:
            "Transaction status changed concurrently. Please refresh transaction status.",
          concurrentUpdate: true,
        };
      }

      if (shouldRefund) {
        await tx
          .update(user)
          .set(incrementBalance(amount))
          .where(eq(user.id, session.user.id));
      }

      if (finalStatus === "SUCCESS") {
        if (rCommission > 0) {
          await tx
            .update(user)
            .set({ earnings: sql`${user.earnings} + ${rCommission}` })
            .where(eq(user.id, session.user.id));
        }

        if (distributorCommission > 0 && result.distributorId) {
          await tx
            .update(user)
            .set({
              earnings: sql`${user.earnings} + ${distributorCommission}`,
            })
            .where(eq(user.id, result.distributorId));
        }

        if (adminCommission > 0) {
          const [adminUser] = await tx
            .select({ id: user.id })
            .from(user)
            .where(eq(user.role, "ADMIN"))
            .limit(1);
          if (adminUser) {
            await tx
              .update(user)
              .set({ earnings: sql`${user.earnings} + ${adminCommission}` })
              .where(eq(user.id, adminUser.id));
          }
        }
      }

      return { transaction: t, status: finalStatus, message: apiMessage };
    });

    if (updatedTransaction.concurrentUpdate) {
      return c.json(
        {
          error: updatedTransaction.message,
          transaction: updatedTransaction.transaction,
        },
        409,
      );
    }

    if (updatedTransaction.status === "PENDING") {
      return c.json({
        success: true,
        message: "Recharge submitted and is currently pending",
        transaction: updatedTransaction.transaction,
      });
    }

    if (updatedTransaction.status === "FAILED") {
      return c.json(
        {
          error: updatedTransaction.message,
          transaction: updatedTransaction.transaction,
        },
        400,
      );
    }

    void invalidateRetailerTopAmountsCache(session.user.id, operator);

    return c.json({
      success: true,
      message: "Recharge completed successfully",
      transaction: updatedTransaction.transaction,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ACCOUNT_NOT_APPROVED") {
      return c.json(
        {
          error:
            "Your account is not approved yet. Please wait for admin approval.",
        },
        403,
      );
    }
    if (message === "ACCOUNT_SUSPENDED") {
      return c.json(
        { error: "Your account has been suspended by the administrator." },
        403,
      );
    }
    if (message === "Insufficient balance") {
      return c.json({ error: "Insufficient balance" }, 400);
    }

    console.error("Recharge processing error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

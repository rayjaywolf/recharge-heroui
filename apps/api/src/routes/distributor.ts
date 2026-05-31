import { and, desc, eq, gte, notInArray, or } from "drizzle-orm";
import { Hono } from "hono";
import { createId, db, dispute, fundRequest, transaction, user } from "@repo/db";
import { auth } from "@repo/server/auth";
import { decrementBalance, incrementBalance } from "@repo/server/db-utils";
import {
  assertCanRegisterRetailer,
  parseRetailerRegistrationInput,
  RegistrationConflictError,
} from "@repo/server/retailer-registration";
import {
  markNotificationsReadForEntity,
  notifyAdminsDisputePending,
  notifyRetailerFundRequestApproved,
  notifyRetailerFundRequestRejected,
  notifyRetailerWalletCredited,
} from "@repo/server/notifications";
import { requireDistributor, type AppVariables } from "../middleware";

export const distributorRoutes = new Hono<{ Variables: AppVariables }>();

const NON_RECHARGE_OPERATORS = [
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "FUNDS_SENT",
  "FUNDS_RECEIVED",
];

distributorRoutes.post("/api/distributor/fund", requireDistributor, async (c) => {
  try {
    const session = c.get("session");
    const distributorUser = c.get("dbUser");
    const body = await c.req.json();
    const { userId, amount, remarks, idempotencyKey } = body;

    if (!userId || !amount || amount <= 0) {
      return c.json({ error: "Invalid amount or parameters" }, 400);
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

    const [targetRetailer] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!targetRetailer) {
      return c.json({ error: "Retailer not found" }, 404);
    }

    if (targetRetailer.distributorId !== session.user.id) {
      return c.json({ error: "Retailer is not assigned to you." }, 403);
    }

    if (distributorUser.balance < amount) {
      return c.json({ error: "Insufficient wallet balance." }, 400);
    }

    const result = await db.transaction(async (tx) => {
      const [updatedDistributor] = await tx
        .update(user)
        .set(decrementBalance(amount))
        .where(and(eq(user.id, session.user.id), gte(user.balance, amount)))
        .returning();

      if (!updatedDistributor) {
        throw new Error("Insufficient wallet balance.");
      }

      const [updatedRetailer] = await tx
        .update(user)
        .set(incrementBalance(amount))
        .where(eq(user.id, userId))
        .returning();

      const distTxId = createId();
      const retTxId = createId();

      await tx.insert(transaction).values({
        id: distTxId,
        userId: session.user.id,
        targetPhone: "DIST_FUNDS_TRANSFER",
        operator: "FUNDS_SENT",
        amount,
        status: "SUCCESS",
        apiMessage: remarks
          ? `[FUNDS_SENT] ${remarks}`
          : `Transferred ${amount} to retailer ${updatedRetailer.name}`,
        idempotencyKey: idempotencyKey || null,
      });

      await tx.insert(transaction).values({
        id: retTxId,
        userId,
        targetPhone: "RECEIVED_FUNDS",
        operator: "FUNDS_RECEIVED",
        amount,
        status: "SUCCESS",
        apiMessage: remarks
          ? `[FUNDS_RECEIVED] ${remarks}`
          : `Received ${amount} from distributor ${distributorUser.name}`,
      });

      return { updatedDistributor, updatedRetailer, retTxId };
    });

    await notifyRetailerWalletCredited({
      retailerId: userId,
      amount,
      transactionId: result.retTxId,
      sourceLabel: distributorUser.name,
    });

    return c.json({
      success: true,
      message: `Successfully transferred ₹${amount} to ${targetRetailer.name}`,
      balance: result.updatedDistributor.balance,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Insufficient wallet balance.") {
      return c.json({ error: "Insufficient wallet balance." }, 400);
    }
    console.error("Distributor Fund Wallet Error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

distributorRoutes.post("/api/distributor/retailer", requireDistributor, async (c) => {
  try {
    const session = c.get("session");
    const body = await c.req.json();
    const { normalizedPhone, accountEmail, input } =
      parseRetailerRegistrationInput(body);

    await assertCanRegisterRetailer(normalizedPhone, accountEmail);

    await auth.api.signUpEmail({
      body: {
        email: accountEmail,
        password: input.password,
        name: input.name,
        role: "RETAILER",
        distributorId: session.user.id,
        whatsappNumber: normalizedPhone,
        address: input.address,
        pincode: input.pincode,
        state: input.state,
        aadharNumber: input.aadharNumber,
        panNumber: input.panNumber,
        gstNumber: input.gstNumber,
        businessType: input.businessType,
        accountStatus: "PENDING",
      } as never,
    });

    return c.json({
      success: true,
      message: "Retailer created and assigned successfully.",
    });
  } catch (error: unknown) {
    if (error instanceof RegistrationConflictError) {
      return c.json(
        { error: error.message },
        error.status as 400 | 409,
      );
    }
    console.error("Create Retailer Error:", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      500,
    );
  }
});

distributorRoutes.get("/api/distributor/disputes", requireDistributor, async (c) => {
  try {
    const session = c.get("session");

    const rows = await db
      .select({
        id: dispute.id,
        transactionId: dispute.transactionId,
        subject: dispute.subject,
        message: dispute.message,
        status: dispute.status,
        adminNote: dispute.adminNote,
        createdAt: dispute.createdAt,
        resolvedAt: dispute.resolvedAt,
        transactionStatus: transaction.status,
        operator: transaction.operator,
        amount: transaction.amount,
        targetPhone: transaction.targetPhone,
        apiReferenceId: transaction.apiReferenceId,
      })
      .from(dispute)
      .innerJoin(transaction, eq(dispute.transactionId, transaction.id))
      .where(eq(dispute.distributorId, session.user.id))
      .orderBy(desc(dispute.createdAt));

    return c.json({
      disputes: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      })),
    });
  } catch (error) {
    console.error("List distributor disputes error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

distributorRoutes.post("/api/distributor/disputes", requireDistributor, async (c) => {
  try {
    const session = c.get("session");
    const body = await c.req.json();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();
    const transactionId = String(body?.transactionId ?? "").trim();

    if (!subject || !message || !transactionId) {
      return c.json(
        { error: "Subject, transaction, and message are required." },
        400,
      );
    }

    const [targetTx] = await db
      .select({
        id: transaction.id,
        ownerId: transaction.userId,
        ownerDistributorId: user.distributorId,
      })
      .from(transaction)
      .innerJoin(user, eq(transaction.userId, user.id))
      .where(
        and(
          eq(transaction.id, transactionId),
          notInArray(transaction.operator, NON_RECHARGE_OPERATORS),
          or(
            eq(transaction.userId, session.user.id),
            eq(user.distributorId, session.user.id),
          ),
        ),
      )
      .limit(1);

    if (!targetTx) {
      return c.json(
        { error: "Transaction not found in your allowed recharge scope." },
        404,
      );
    }

    const [existing] = await db
      .select({ id: dispute.id, status: dispute.status })
      .from(dispute)
      .where(eq(dispute.transactionId, transactionId))
      .limit(1);

    if (existing?.status === "PENDING") {
      return c.json(
        { error: "A pending dispute already exists for this transaction." },
        409,
      );
    }

    if (existing?.status === "RESOLVED") {
      return c.json(
        {
          error:
            "This transaction already has a resolved dispute. Contact admin if you need to reopen it.",
        },
        409,
      );
    }

    const [created] = await db
      .insert(dispute)
      .values({
        id: createId(),
        distributorId: session.user.id,
        transactionId,
        subject,
        message,
        status: "PENDING",
      })
      .returning();

    await notifyAdminsDisputePending({
      disputeId: created.id,
      subject,
      submitterName: session.user.name,
    });

    return c.json({
      success: true,
      message: "Dispute submitted to admin support.",
      dispute: {
        ...created,
        createdAt: created.createdAt.toISOString(),
        resolvedAt: created.resolvedAt ? created.resolvedAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error("Create distributor dispute error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

distributorRoutes.post(
  "/api/distributor/fund-requests/:id/approve",
  requireDistributor,
  async (c) => {
    try {
      const session = c.get("session");
      const distributorUser = c.get("dbUser");
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

      if (!request) {
        return c.json({ error: "Fund request not found." }, 404);
      }

      if (request.distributorId !== session.user.id) {
        return c.json({ error: "Fund request not found." }, 404);
      }

      if (request.status !== "PENDING") {
        return c.json({ error: "Fund request is no longer pending." }, 409);
      }

      if (distributorUser.balance < request.amount) {
        return c.json({ error: "Insufficient wallet balance." }, 400);
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
        const [updatedDistributor] = await tx
          .update(user)
          .set(decrementBalance(request.amount))
          .where(
            and(
              eq(user.id, session.user.id),
              gte(user.balance, request.amount),
            ),
          )
          .returning();

        if (!updatedDistributor) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const [updatedRetailer] = await tx
          .update(user)
          .set(incrementBalance(request.amount))
          .where(eq(user.id, request.retailerId))
          .returning();

        const distTxId = createId();
        const retTxId = createId();
        const transferMessage = request.remarks
          ? `[FUNDS_SENT] ${request.remarks}`
          : `Approved fund request from ${retailer.name}`;

        await tx.insert(transaction).values({
          id: distTxId,
          userId: session.user.id,
          targetPhone: "DIST_FUNDS_TRANSFER",
          operator: "FUNDS_SENT",
          amount: request.amount,
          status: "SUCCESS",
          apiMessage: transferMessage,
        });

        await tx.insert(transaction).values({
          id: retTxId,
          userId: request.retailerId,
          targetPhone: "RECEIVED_FUNDS",
          operator: "FUNDS_RECEIVED",
          amount: request.amount,
          status: "SUCCESS",
          apiMessage: request.remarks
            ? `[FUNDS_RECEIVED] ${request.remarks}`
            : `Fund request approved by ${distributorUser.name}`,
        });

        const [updatedRequest] = await tx
          .update(fundRequest)
          .set({ status: "APPROVED" })
          .where(eq(fundRequest.id, requestId))
          .returning();

        return { updatedDistributor, updatedRetailer, updatedRequest, retTxId };
      });

      await markNotificationsReadForEntity({
        type: "FUND_REQUEST_PENDING",
        entityId: requestId,
      });

      await notifyRetailerFundRequestApproved({
        retailerId: request.retailerId,
        fundRequestId: requestId,
        amount: request.amount,
        distributorName: distributorUser.name,
      });

      return c.json({
        success: true,
        message: `Approved fund request and transferred ₹${request.amount} to ${retailer.name}.`,
        balance: result.updatedDistributor.balance,
        request: {
          id: result.updatedRequest?.id,
          status: result.updatedRequest?.status,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
        return c.json({ error: "Insufficient wallet balance." }, 400);
      }
      console.error("Approve fund request error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

distributorRoutes.post(
  "/api/distributor/fund-requests/:id/reject",
  requireDistributor,
  async (c) => {
    try {
      const session = c.get("session");
      const distributorUser = c.get("dbUser");
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

      if (!request || request.distributorId !== session.user.id) {
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
        distributorName: distributorUser.name,
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
      console.error("Reject fund request error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

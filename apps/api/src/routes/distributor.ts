import { and, eq, gte } from "drizzle-orm";
import { Hono } from "hono";
import { createId, db, transaction, user } from "@repo/db";
import { auth } from "@repo/server/auth";
import { decrementBalance, incrementBalance } from "@repo/server/db-utils";
import {
  assertCanRegisterRetailer,
  parseRetailerRegistrationInput,
  RegistrationConflictError,
} from "@repo/server/retailer-registration";
import { requireDistributor, type AppVariables } from "../middleware";

export const distributorRoutes = new Hono<{ Variables: AppVariables }>();

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

      return { updatedDistributor, updatedRetailer };
    });

    return c.json({
      success: true,
      message: `Successfully transferred ₹${amount} to ${targetRetailer.name}`,
      balance: result.updatedDistributor.balance,
    });
  } catch (error) {
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
        isApproved: false,
        isRejected: false,
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

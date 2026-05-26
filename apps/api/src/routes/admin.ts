import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  commissionRule,
  createId,
  db,
  operatorProviderConfig,
  transaction,
  user,
  type Provider,
  type Role,
} from "@repo/db";
import { decrementBalance, incrementBalance } from "@repo/server/db-utils";
import {
  assertProvider,
  BACKUP_NONE,
  normalizeOperatorKey,
  parseBackupValue,
  type BackupSlot,
} from "./admin-helpers";
import { requireAdmin, type AppVariables } from "../middleware";

export const adminRoutes = new Hono<{ Variables: AppVariables }>();

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
        .where(eq(user.id, userId))
        .returning();

      const messageContent = remarks
        ? `[${actionType.toUpperCase()}] ${remarks}`
        : actionType === "credit"
          ? `Credited manually by Administrator (${adminUser.name})`
          : `Debited manually by Administrator (${adminUser.name})`;

      await tx.insert(transaction).values({
        id: createId(),
        userId,
        targetPhone: "WALLET",
        operator: actionType === "credit" ? "MANUAL_CREDIT" : "MANUAL_DEBIT",
        amount,
        status: "SUCCESS",
        apiMessage: messageContent,
      });

      return { updatedUser };
    });

    return c.json({
      success: true,
      message: `Successfully ${actionType === "credit" ? "credited" : "debited"} ₹${amount} ${actionType === "credit" ? "to" : "from"} ${targetUser.name}`,
      balance: result.updatedUser.balance,
    });
  } catch (error) {
    console.error("Fund Wallet Error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

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

    const newStatus = !targetUser.isSuspended;

    const [updatedUser] = await db
      .update(user)
      .set({ isSuspended: newStatus })
      .where(eq(user.id, userId))
      .returning({ name: user.name, isSuspended: user.isSuspended });

    return c.json({
      success: true,
      message: `Successfully ${newStatus ? "suspended" : "activated"} retailer ${updatedUser?.name}`,
      isSuspended: updatedUser?.isSuspended,
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

    const [updatedUser] = await db
      .update(user)
      .set({ isApproved: true })
      .where(eq(user.id, userId))
      .returning({ name: user.name });

    if (!updatedUser) {
      return c.json({ error: "User not found" }, 404);
    }

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

    const [updatedUser] = await db
      .update(user)
      .set({ isRejected: true, isApproved: false })
      .where(eq(user.id, userId))
      .returning({ name: user.name });

    if (!updatedUser) {
      return c.json({ error: "User not found" }, 404);
    }

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

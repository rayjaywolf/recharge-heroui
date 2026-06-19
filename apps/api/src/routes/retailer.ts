import { and, asc, count, desc, eq, gt, gte, inArray, lte, notInArray, sum } from "drizzle-orm";
import { Hono } from "hono";
import {
  commissionRule,
  createId,
  db,
  dispute,
  fundRequest,
  retailerCommissionOverride,
  transaction,
  user,
} from "@repo/db";
import { resolveDateRange } from "@repo/server/date-range";
import { ensureUserAvatar } from "@repo/server/user-avatar";
import {
  notifyAdminsDisputePending,
  notifyAdminsFundRequestPending,
  notifyDistributorDisputePending,
  notifyDistributorFundRequestPending,
} from "@repo/server/notifications";
import {
  requireRetailer,
  type AppVariables,
} from "../middleware";

const WALLET_OPERATORS = [
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "FUNDS_RECEIVED",
  "FUNDS_SENT",
] as const;
const NON_RECHARGE_OPERATORS = [
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "FUNDS_SENT",
  "FUNDS_RECEIVED",
] as const;

function labelForOperator(operator: string): string {
  switch (operator) {
    case "MANUAL_CREDIT":
      return "Admin wallet credit";
    case "MANUAL_DEBIT":
      return "Admin wallet debit";
    case "FUNDS_RECEIVED":
      return "Received from distributor";
    case "FUNDS_SENT":
      return "Sent to retailer";
    default:
      return operator;
  }
}

export const retailerRoutes = new Hono<{ Variables: AppVariables }>();

retailerRoutes.get("/api/retailer/profile", requireRetailer, async (c) => {
  try {
    const session = c.get("session");
    const found = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      with: {
        distributor: {
          columns: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            whatsappNumber: true,
            address: true,
            pincode: true,
            state: true,
            businessType: true,
            gstNumber: true,
          },
        },
      },
    });

    if (!found) {
      return c.json({ error: "User not found" }, 404);
    }

    const image = await ensureUserAvatar(found.id, found.name, found.image);

    return c.json({
      id: found.id,
      name: found.name,
      storeName: found.storeName ?? null,
      image,
      email: found.email ?? null,
      phoneNumber: found.phoneNumber,
      balance: found.balance,
      earnings: found.earnings,
      whatsappNumber: found.whatsappNumber,
      distributor: found.distributor
        ? {
            id: found.distributor.id,
            name: found.distributor.name,
            email: found.distributor.email,
            phoneNumber: found.distributor.phoneNumber,
            whatsappNumber: found.distributor.whatsappNumber,
            address: found.distributor.address,
            pincode: found.distributor.pincode,
            state: found.distributor.state,
            businessType: found.distributor.businessType,
            gstNumber: found.distributor.gstNumber,
          }
        : null,
    });
  } catch (error) {
    console.error("Retailer profile error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

retailerRoutes.get("/api/retailer/commissions", requireRetailer, async (c) => {
  try {
    const session = c.get("session");
    const [rules, overrides] = await Promise.all([
      db
        .select({
          id: commissionRule.id,
          operator: commissionRule.operator,
          retailerMargin: commissionRule.retailerMargin,
          updatedAt: commissionRule.updatedAt,
        })
        .from(commissionRule)
        .orderBy(asc(commissionRule.operator)),
      db
        .select({
          operator: retailerCommissionOverride.operator,
          retailerMargin: retailerCommissionOverride.retailerMargin,
          updatedAt: retailerCommissionOverride.updatedAt,
        })
        .from(retailerCommissionOverride)
        .where(eq(retailerCommissionOverride.userId, session.user.id)),
    ]);

    const overrideByOperator = new Map(
      overrides.map((row) => [row.operator, row]),
    );

    return c.json({
      rules: rules.map((rule) => {
        const override = overrideByOperator.get(rule.operator);
        return {
          id: rule.id,
          operator: rule.operator,
          retailerMargin: override?.retailerMargin ?? rule.retailerMargin,
          isCustom: Boolean(override),
          updatedAt: (override?.updatedAt ?? rule.updatedAt).toISOString(),
        };
      }),
    });
  } catch (error) {
    console.error("Retailer commissions error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

retailerRoutes.get("/api/retailer/earnings", requireRetailer, async (c) => {
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

    const periodWhere = and(
      eq(transaction.userId, session.user.id),
      gt(transaction.retailerCommission, 0),
      gte(transaction.createdAt, start),
      lte(transaction.createdAt, end),
    );

    const lifetimeWhere = and(
      eq(transaction.userId, session.user.id),
      gt(transaction.retailerCommission, 0),
    );

    const limit = scope === "last90" ? 500 : scope === "last30" ? 300 : 200;

    const [entries, [periodAggregate], [lifetimeAggregate]] = await Promise.all([
      db
        .select({
          id: transaction.id,
          targetPhone: transaction.targetPhone,
          operator: transaction.operator,
          amount: transaction.amount,
          status: transaction.status,
          retailerCommission: transaction.retailerCommission,
          createdAt: transaction.createdAt,
        })
        .from(transaction)
        .where(periodWhere)
        .orderBy(desc(transaction.createdAt))
        .limit(limit),
      db
        .select({
          total: sum(transaction.retailerCommission),
          count: count(),
        })
        .from(transaction)
        .where(periodWhere),
      db
        .select({ total: sum(transaction.retailerCommission) })
        .from(transaction)
        .where(lifetimeWhere),
    ]);

    return c.json({
      periodTotal: Number(periodAggregate?.total ?? 0),
      lifetimeTotal: Number(lifetimeAggregate?.total ?? 0),
      entries: entries.map((tx) => ({
        ...tx,
        createdAt: tx.createdAt.toISOString(),
      })),
      meta: {
        scope,
        from: start.toISOString(),
        to: end.toISOString(),
        count: periodAggregate?.count ?? 0,
      },
    });
  } catch (error) {
    console.error("Retailer earnings error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

retailerRoutes.get("/api/retailer/disputes", requireRetailer, async (c) => {
  try {
    const retailer = c.get("dbUser");

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
      .where(eq(transaction.userId, retailer.id))
      .orderBy(desc(dispute.createdAt));

    return c.json({
      disputes: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      })),
    });
  } catch (error) {
    console.error("List retailer disputes error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

retailerRoutes.post("/api/retailer/disputes", requireRetailer, async (c) => {
  try {
    const retailer = c.get("dbUser");
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
      })
      .from(transaction)
      .where(
        and(
          eq(transaction.id, transactionId),
          eq(transaction.userId, retailer.id),
          notInArray(transaction.operator, [...NON_RECHARGE_OPERATORS]),
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
        distributorId: retailer.distributorId ?? retailer.id,
        transactionId,
        subject,
        message,
        status: "PENDING",
      })
      .returning();

    await notifyAdminsDisputePending({
      disputeId: created.id,
      subject,
      submitterName: retailer.name,
    });

    if (retailer.distributorId) {
      await notifyDistributorDisputePending({
        distributorId: retailer.distributorId,
        disputeId: created.id,
        subject,
        retailerName: retailer.name,
      });
    }

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
    console.error("Create retailer dispute error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

retailerRoutes.post("/api/retailer/fund-request", requireRetailer, async (c) => {
  try {
    const retailer = c.get("dbUser");
    const body = await c.req.json();
    const { amount, remarks } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return c.json(
        { error: "Enter a valid amount greater than zero." },
        400,
      );
    }

    if (!Number.isInteger(amount)) {
      return c.json({ error: "Amount must be a whole number." }, 400);
    }

    const routedToAdmin = !retailer.distributorId;

    const [existingPending] = await db
      .select({ id: fundRequest.id })
      .from(fundRequest)
      .where(
        and(
          eq(fundRequest.retailerId, retailer.id),
          eq(fundRequest.status, "PENDING"),
        ),
      )
      .limit(1);

    if (existingPending) {
      return c.json(
        {
          error: routedToAdmin
            ? "You already have a pending fund request. Wait for an administrator to respond."
            : "You already have a pending fund request. Wait for your distributor to respond.",
        },
        409,
      );
    }

    const requestId = createId();
    await db.insert(fundRequest).values({
      id: requestId,
      retailerId: retailer.id,
      distributorId: retailer.distributorId,
      amount,
      remarks: remarks?.trim() || null,
    });

    if (routedToAdmin) {
      await notifyAdminsFundRequestPending({
        fundRequestId: requestId,
        retailerName: retailer.name,
        amount,
      });

      return c.json({
        success: true,
        message: `Fund request of ₹${amount} sent to the administrator.`,
        request: {
          id: requestId,
          amount,
          remarks: remarks?.trim() || null,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        },
      });
    }

    const created = await db.query.fundRequest.findFirst({
      where: eq(fundRequest.id, requestId),
      with: {
        distributor: { columns: { name: true } },
      },
    });

    if (!created?.distributor) {
      return c.json({ error: "Internal server error" }, 500);
    }

    await notifyDistributorFundRequestPending({
      distributorId: retailer.distributorId!,
      fundRequestId: requestId,
      retailerName: retailer.name,
      amount,
    });

    return c.json({
      success: true,
      message: `Fund request of ₹${amount} sent to ${created.distributor.name}.`,
      request: {
        id: created.id,
        amount: created.amount,
        remarks: created.remarks,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Fund request error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

retailerRoutes.get("/api/retailer/funding/history", requireRetailer, async (c) => {
  try {
    const session = c.get("session");

    const [transactions, requests] = await Promise.all([
      db
        .select({
          id: transaction.id,
          amount: transaction.amount,
          operator: transaction.operator,
          status: transaction.status,
          apiMessage: transaction.apiMessage,
          createdAt: transaction.createdAt,
        })
        .from(transaction)
        .where(
          and(
            eq(transaction.userId, session.user.id),
            inArray(transaction.operator, [...WALLET_OPERATORS]),
          ),
        )
        .orderBy(desc(transaction.createdAt))
        .limit(50),
      db
        .select({
          id: fundRequest.id,
          amount: fundRequest.amount,
          remarks: fundRequest.remarks,
          status: fundRequest.status,
          distributorId: fundRequest.distributorId,
          createdAt: fundRequest.createdAt,
        })
        .from(fundRequest)
        .where(eq(fundRequest.retailerId, session.user.id))
        .orderBy(desc(fundRequest.createdAt))
        .limit(30),
    ]);

    const txItems = transactions.map((tx) => ({
      kind: "transaction" as const,
      id: tx.id,
      amount: tx.amount,
      status: tx.status,
      title: labelForOperator(tx.operator),
      subtitle: tx.apiMessage || tx.operator,
      createdAt: tx.createdAt.toISOString(),
      direction: tx.operator === "MANUAL_DEBIT" ? "debit" : "credit",
    }));

    const requestItems = requests.map((req) => {
      const routedToAdmin = req.distributorId == null;
      return {
        kind: "request" as const,
        id: req.id,
        amount: req.amount,
        status: req.status,
        title: routedToAdmin
          ? "Fund request to administrator"
          : "Fund request to distributor",
        subtitle:
          req.remarks ||
          (routedToAdmin
            ? "Awaiting administrator approval"
            : "Awaiting distributor approval"),
        createdAt: req.createdAt.toISOString(),
        direction: "credit" as const,
      };
    });

    const items = [...txItems, ...requestItems].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return c.json({ items });
  } catch (error) {
    console.error("Funding history error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

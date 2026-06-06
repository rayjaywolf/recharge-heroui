import { Hono } from "hono";
import { and, count, eq, isNull } from "drizzle-orm";
import { db, dispute, fundRequest, transaction, user } from "@repo/db";
import { auth } from "@repo/server/auth";
import {
  ensureUserMpinBackfill,
  setUserMpin,
  verifyUserMpin,
} from "@repo/server/mpin";
import { validateMpin } from "@repo/shared/mpin";
import {
  assertCanRegisterRetailer,
  parseRetailerRegistrationInput,
  RegistrationConflictError,
} from "@repo/server/retailer-registration";
import { ensureUserAvatar } from "@repo/server/user-avatar";
import { getAllProviderBalances } from "@repo/server/provider-balances";
import { getUnreadNotificationCount } from "@repo/server/notifications";
import { requireSession, type AppVariables } from "../middleware";

export const authRoutes = new Hono<{ Variables: AppVariables }>();

// Must be registered before the Better Auth `/api/auth/*` catch-all.
authRoutes.post("/api/auth/register-retailer", async (c) => {
  try {
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
        whatsappNumber: normalizedPhone,
        address: input.address,
        pincode: input.pincode,
        state: input.state,
        aadharNumber: input.aadharNumber,
        panNumber: input.panNumber,
        gstNumber: input.gstNumber,
        businessType: input.businessType,
        distributorId: input.distributorId,
        accountStatus: "PENDING",
      } as never,
    });

    return c.json({
      success: true,
      message: "Application submitted. You can sign in while awaiting approval.",
    });
  } catch (error) {
    if (error instanceof RegistrationConflictError) {
      return c.json(
        { error: error.message },
        error.status as 400 | 409,
      );
    }

    console.error("Register retailer error:", error);
    const message =
      error instanceof Error ? error.message : "Registration failed.";
    return c.json({ error: message }, 500);
  }
});

function shouldLogAuthDetails(pathname: string): boolean {
  if (process.env.DETAILED_API_LOGS === "false") return false;
  return (
    pathname.startsWith("/api/auth/sign-in") ||
    pathname.startsWith("/api/auth/sign-up") ||
    pathname.startsWith("/api/auth/sign-out")
  );
}

authRoutes.on(["GET", "POST"], "/api/auth/*", async (c) => {
  const startedAt = Date.now();
  const url = new URL(c.req.url);
  const pathname = url.pathname;
  const detailed = shouldLogAuthDetails(pathname);

  const res = await auth.handler(c.req.raw);

  if (!detailed) return res;

  // Never log request bodies (passwords). Only metadata + response error body.
  const elapsedMs = Date.now() - startedAt;
  const status = res.status;

  const origin = c.req.header("origin") ?? null;
  const referer = c.req.header("referer") ?? null;
  const userAgent = c.req.header("user-agent") ?? null;
  const secFetchSite = c.req.header("sec-fetch-site") ?? null;
  const secFetchMode = c.req.header("sec-fetch-mode") ?? null;
  const cfConnectingIp = c.req.header("cf-connecting-ip") ?? null;
  const xForwardedFor = c.req.header("x-forwarded-for") ?? null;

  if (status >= 400) {
    let errorBody: unknown = null;
    try {
      const cloned = res.clone();
      const contentType = cloned.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        errorBody = await cloned.json();
      } else {
        const text = await cloned.text();
        errorBody = text.length > 2000 ? text.slice(0, 2000) + "…" : text;
      }
    } catch (error) {
      errorBody = { message: "Could not read response body.", error };
    }

    console.warn(`[${new Date().toISOString()}] [auth] request failed`, {
      method: c.req.method,
      pathname,
      status,
      elapsedMs,
      origin,
      referer,
      secFetchSite,
      secFetchMode,
      userAgent,
      cfConnectingIp,
      xForwardedFor,
      errorBody,
    });
  } else {
    console.info(`[${new Date().toISOString()}] [auth] request ok`, {
      method: c.req.method,
      pathname,
      status,
      elapsedMs,
    });
  }

  return res;
});

authRoutes.post("/api/profile/verify-mpin", requireSession, async (c) => {
  try {
    const session = c.get("session");
    if (session.user.role === "ADMIN") {
      return c.json({ success: true });
    }

    const body = await c.req.json();
    const mpin = typeof body?.mpin === "string" ? body.mpin.trim() : "";

    if (!validateMpin(mpin)) {
      return c.json({ error: "Valid 4-digit MPIN is required." }, 400);
    }

    const mpinOk = await verifyUserMpin(session.user.id, mpin);
    if (!mpinOk) {
      return c.json({ error: "Incorrect MPIN. Please try again." }, 401);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Verify MPIN error:", error);
    return c.json({ error: "Failed to verify MPIN." }, 500);
  }
});

authRoutes.post("/api/profile/set-mpin", requireSession, async (c) => {
  try {
    const session = c.get("session");
    if (session.user.role === "ADMIN") {
      return c.json({ error: "MPIN is not required for admin accounts." }, 400);
    }

    const body = await c.req.json();
    const password = typeof body?.password === "string" ? body.password : "";
    const mpin = typeof body?.mpin === "string" ? body.mpin.trim() : "";

    if (!password) {
      return c.json({ error: "Password is required." }, 400);
    }
    if (!validateMpin(mpin)) {
      return c.json({ error: "MPIN must be exactly 4 digits." }, 400);
    }

    const verify = await auth.api.verifyPassword({
      body: { password },
      headers: c.req.raw.headers,
    });

    if (!verify?.status) {
      return c.json({ error: "Incorrect password." }, 401);
    }

    await setUserMpin(session.user.id, mpin);

    return c.json({ success: true, message: "MPIN updated successfully." });
  } catch (error) {
    console.error("Set MPIN error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update MPIN.";
    return c.json({ error: message }, 500);
  }
});

authRoutes.post("/api/profile/change-name", requireSession, async (c) => {
  try {
    const session = c.get("session");
    const body = await c.req.json();
    const rawName = typeof body?.name === "string" ? body.name : "";
    const name = rawName.trim();

    if (name.length < 2 || name.length > 80) {
      return c.json({ error: "Name must be between 2 and 80 characters." }, 400);
    }

    await db
      .update(user)
      .set({ name })
      .where(eq(user.id, session.user.id));

    return c.json({ success: true, name });
  } catch (error) {
    console.error("Change name error:", error);
    return c.json({ error: "Failed to update name." }, 500);
  }
});

authRoutes.get("/api/dashboard/bootstrap", requireSession, async (c) => {
  try {
    const session = c.get("session");
    const [found] = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!found) {
      return c.json({ error: "User not found" }, 404);
    }

    const pendingApprovalsCount =
      found.role === "ADMIN"
        ? (
            await db
              .select({ total: count() })
              .from(user)
              .where(and(eq(user.role, "RETAILER"), eq(user.accountStatus, "PENDING")))
          )[0]?.total ?? 0
        : 0;

    const unreadNotificationCount =
      found.role === "ADMIN" || found.role === "DISTRIBUTOR" || found.role === "RETAILER"
        ? await getUnreadNotificationCount(found.id)
        : 0;

    const pendingFundRequestsCount =
      found.role === "DISTRIBUTOR"
        ? (
            await db
              .select({ total: count() })
              .from(fundRequest)
              .where(
                and(
                  eq(fundRequest.distributorId, found.id),
                  eq(fundRequest.status, "PENDING"),
                ),
              )
          )[0]?.total ?? 0
        : found.role === "ADMIN"
          ? (
              await db
                .select({ total: count() })
                .from(fundRequest)
                .where(
                  and(
                    isNull(fundRequest.distributorId),
                    eq(fundRequest.status, "PENDING"),
                  ),
                )
            )[0]?.total ?? 0
          : 0;

    let pendingSupportCount = 0;
    if (found.role === "ADMIN") {
      const [row] = await db
        .select({ total: count() })
        .from(dispute)
        .where(eq(dispute.status, "PENDING"));
      pendingSupportCount = row?.total ?? 0;
    } else if (found.role === "DISTRIBUTOR") {
      const [row] = await db
        .select({ total: count() })
        .from(dispute)
        .where(
          and(
            eq(dispute.distributorId, found.id),
            eq(dispute.status, "PENDING"),
          ),
        );
      pendingSupportCount = row?.total ?? 0;
    } else if (found.role === "RETAILER") {
      const [row] = await db
        .select({ total: count() })
        .from(dispute)
        .innerJoin(transaction, eq(dispute.transactionId, transaction.id))
        .where(
          and(
            eq(transaction.userId, found.id),
            eq(dispute.status, "PENDING"),
          ),
        );
      pendingSupportCount = row?.total ?? 0;
    }

    let mpinMustReset = false;
    if (found.role !== "ADMIN") {
      const mpinState = await ensureUserMpinBackfill(found.id, found.role);
      mpinMustReset = mpinState.mpinMustReset;
    }

    const userImage = await ensureUserAvatar(found.id, found.name, found.image);

    let adminProviderBalance: number | null = null;
    if (found.role === "ADMIN") {
      const balances = await getAllProviderBalances();
      const realRobo = balances.find((row) => row.id === "REALROBO");
      if (realRobo?.status === "ok" && realRobo.balance != null) {
        adminProviderBalance = realRobo.balance;
      }
    }

    return c.json({
      user: {
        id: found.id,
        role: found.role,
        name: found.name,
        balance: found.balance,
        accountStatus: found.accountStatus,
        image: userImage,
      },
      ui: {
        pendingApprovalsCount,
        unreadNotificationCount,
        pendingFundRequestsCount,
        pendingSupportCount,
        mpinMustReset,
        adminProviderBalance,
      },
    });
  } catch (error) {
    console.error("Dashboard bootstrap error:", error);
    return c.json({ error: "Failed to load dashboard data." }, 500);
  }
});

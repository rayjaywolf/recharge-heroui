import type { Context, MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { db, user } from "@repo/db";
import { auth } from "@repo/server/auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  balance?: number;
  [key: string]: unknown;
};

export type AppVariables = {
  session: { user: SessionUser };
  dbUser: typeof user.$inferSelect;
};

async function getSessionFromContext(c: Context) {
  return auth.api.getSession({ headers: c.req.raw.headers });
}

export const requireSession: MiddlewareHandler<{ Variables: AppVariables }> =
  async (c, next) => {
    const session = await getSessionFromContext(c);
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("session", session as { user: SessionUser });
    await next();
  };

export const requireAdmin: MiddlewareHandler<{ Variables: AppVariables }> =
  async (c, next) => {
    const session = await getSessionFromContext(c);
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [found] = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (found?.role !== "ADMIN") {
      return c.json({ error: "Forbidden" }, 403);
    }

    c.set("session", session as { user: SessionUser });
    c.set("dbUser", found);
    await next();
  };

export const requireDistributor: MiddlewareHandler<{ Variables: AppVariables }> =
  async (c, next) => {
    const session = await getSessionFromContext(c);
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [found] = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (found?.role !== "DISTRIBUTOR") {
      return c.json(
        { error: "Forbidden. Distributor access required." },
        403,
      );
    }
    if (found.accountStatus !== "APPROVED") {
      return c.json(
        { error: "Your account is not approved for distributor actions." },
        403,
      );
    }

    c.set("session", session as { user: SessionUser });
    c.set("dbUser", found);
    await next();
  };

export const requireRetailer: MiddlewareHandler<{ Variables: AppVariables }> =
  async (c, next) => {
    const session = await getSessionFromContext(c);
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [found] = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (found?.role !== "RETAILER") {
      return c.json({ error: "Forbidden" }, 403);
    }
    if (found.accountStatus !== "APPROVED") {
      return c.json(
        { error: "Your account is not approved for retailer actions." },
        403,
      );
    }

    c.set("session", session as { user: SessionUser });
    c.set("dbUser", found);
    await next();
  };

export const requireAdminSessionRole: MiddlewareHandler = async (c, next) => {
  const session = await getSessionFromContext(c);
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const [found] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (found?.role !== "ADMIN") {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
};

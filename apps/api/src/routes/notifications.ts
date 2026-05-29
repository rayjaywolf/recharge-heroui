import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { db, notification } from "@repo/db";
import {
  deleteNotificationsByIds,
  getUnreadNotificationCount,
  listNotificationsForUser,
  markNotificationsReadByIds,
} from "@repo/server/notifications";
import { requireSession, type AppVariables } from "../middleware";

export const notificationRoutes = new Hono<{ Variables: AppVariables }>();

notificationRoutes.get("/api/notifications", requireSession, async (c) => {
  try {
    const session = c.get("session");
    const limit = Math.min(
      Math.max(Number(c.req.query("limit") ?? 30), 1),
      100,
    );
    const rows = await listNotificationsForUser(session.user.id, limit);

    return c.json({
      notifications: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        readAt: row.readAt ? row.readAt.toISOString() : null,
      })),
    });
  } catch (error) {
    console.error("List notifications error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

notificationRoutes.get(
  "/api/notifications/unread-count",
  requireSession,
  async (c) => {
    try {
      const session = c.get("session");
      const count = await getUnreadNotificationCount(session.user.id);
      return c.json({ count });
    } catch (error) {
      console.error("Unread notification count error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

notificationRoutes.patch(
  "/api/notifications/:id/read",
  requireSession,
  async (c) => {
    try {
      const session = c.get("session");
      const notificationId = c.req.param("id");

      const [updated] = await db
        .update(notification)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notification.id, notificationId),
            eq(notification.userId, session.user.id),
          ),
        )
        .returning({ id: notification.id });

      if (!updated) {
        return c.json({ error: "Notification not found." }, 404);
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

notificationRoutes.post(
  "/api/notifications/mark-read",
  requireSession,
  async (c) => {
    try {
      const session = c.get("session");
      const body = await c.req.json();
      const ids = Array.isArray(body?.ids)
        ? body.ids.filter((id: unknown) => typeof id === "string")
        : [];

      if (ids.length === 0) {
        return c.json({ error: "At least one notification id is required." }, 400);
      }

      const count = await markNotificationsReadByIds(session.user.id, ids);
      return c.json({ success: true, count });
    } catch (error) {
      console.error("Bulk mark notifications read error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

notificationRoutes.delete("/api/notifications", requireSession, async (c) => {
  try {
    const session = c.get("session");
    const body = await c.req.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((id: unknown) => typeof id === "string")
      : [];

    if (ids.length === 0) {
      return c.json({ error: "At least one notification id is required." }, 400);
    }

    const count = await deleteNotificationsByIds(session.user.id, ids);
    return c.json({ success: true, count });
  } catch (error) {
    console.error("Delete notifications error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

notificationRoutes.patch(
  "/api/notifications/read-all",
  requireSession,
  async (c) => {
    try {
      const session = c.get("session");

      await db
        .update(notification)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notification.userId, session.user.id),
            isNull(notification.readAt),
          ),
        );

      return c.json({ success: true });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

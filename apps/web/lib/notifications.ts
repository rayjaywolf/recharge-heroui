import { resolveNotificationHref } from "@repo/server/notifications";
import type { NotificationType } from "@repo/db";

export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

export function toNotificationListItems(
  rows: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    href: string;
    readAt: Date | string | null;
    createdAt: Date | string;
  }>,
): NotificationListItem[] {
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: resolveNotificationHref(row.type as NotificationType, row.href),
    readAt:
      row.readAt == null
        ? null
        : typeof row.readAt === "string"
          ? row.readAt
          : row.readAt.toISOString(),
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : row.createdAt.toISOString(),
  }));
}

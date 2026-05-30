import { resolveNotificationHref } from "@repo/shared/notification-href";

import { formatTableDateTime } from "@/lib/utils";

export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
  /** Pre-formatted on the server to avoid SSR/client locale hydration mismatches. */
  createdAtLabel: string;
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
  return rows.map((row) => {
    const createdAt =
      typeof row.createdAt === "string"
        ? row.createdAt
        : row.createdAt.toISOString();

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      href: resolveNotificationHref(row.type, row.href),
      readAt:
        row.readAt == null
          ? null
          : typeof row.readAt === "string"
            ? row.readAt
            : row.readAt.toISOString(),
      createdAt,
      createdAtLabel: formatTableDateTime(createdAt),
    };
  });
}

/** Maps API JSON rows to list items (client-side refresh only). */
export function notificationRowsFromApi(
  rows: Array<Omit<NotificationListItem, "createdAtLabel">>,
): NotificationListItem[] {
  return rows.map((row) => ({
    ...row,
    createdAtLabel: formatTableDateTime(row.createdAt),
  }));
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listNotificationsForUser } from "@repo/server/notifications";

import { AdminNotificationsList } from "@/components/admin/admin-notifications-list";
import { auth } from "@/lib/auth";
import {
  toNotificationListItems,
  type NotificationListItem,
} from "@/lib/notifications";

export default async function AdminNotificationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const rows = await listNotificationsForUser(session.user.id, 50);
  const initialItems: NotificationListItem[] = toNotificationListItems(rows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted">
          Retailer applications and support disputes that need your attention.
        </p>
      </div>
      <AdminNotificationsList initialItems={initialItems} />
    </div>
  );
}

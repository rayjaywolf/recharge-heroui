import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listNotificationsForUser } from "@repo/server/notifications";

import { NotificationsList } from "@/components/notifications/notifications-list";
import { auth } from "@/lib/auth";
import {
  toNotificationListItems,
  type NotificationListItem,
} from "@/lib/notifications";
import { requireDistributor } from "@/lib/distributor-retailers";

export default async function DistributorNotificationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  await requireDistributor();

  const rows = await listNotificationsForUser(session.user.id, 50);
  const initialItems: NotificationListItem[] = toNotificationListItems(rows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted">
          Retailer updates, fund requests, disputes, and wallet changes for
          your network.
        </p>
      </div>
      <NotificationsList
        emptyMessage="No notifications yet. You will be notified about retailer KYC, fund requests, disputes, and wallet updates."
        emptyReadMessage="No read notifications. Items you mark as read appear here."
        emptyUnreadMessage="All caught up. Switch to Read to see older notifications."
        initialItems={initialItems}
      />
    </div>
  );
}

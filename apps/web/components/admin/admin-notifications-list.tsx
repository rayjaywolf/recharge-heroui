import { NotificationsList } from "@/components/notifications/notifications-list";
import type { NotificationListItem } from "@/lib/notifications";

export function AdminNotificationsList({
  initialItems,
}: {
  initialItems: NotificationListItem[];
}) {
  return (
    <NotificationsList
      emptyMessage="No notifications yet. You will be notified when retailers apply, request funds, or open disputes."
      emptyReadMessage="No read notifications. Items you mark as read appear here."
      emptyUnreadMessage="All caught up. Switch to Read to see older notifications."
      initialItems={initialItems}
    />
  );
}

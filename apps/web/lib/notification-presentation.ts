import type { LucideIcon } from "lucide-react";
import { Bell, ClipboardCheck, LifeBuoy } from "lucide-react";

export const NOTIFICATION_TYPES = [
  "RETAILER_PENDING_APPROVAL",
  "DISPUTE_PENDING",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationPresentation = {
  iconClassName: string;
  Icon: LucideIcon;
  categoryLabel: string;
  actionLabel: string;
};

/** Maps notification type to icon color and label (text stays neutral). */
export function getNotificationPresentation(
  type: string,
): NotificationPresentation {
  switch (type) {
    case "DISPUTE_PENDING":
      return {
        iconClassName: "text-danger",
        Icon: LifeBuoy,
        categoryLabel: "Support dispute",
        actionLabel: "Go to dispute",
      };
    case "RETAILER_PENDING_APPROVAL":
      return {
        iconClassName: "text-warning",
        Icon: ClipboardCheck,
        categoryLabel: "Retailer approval",
        actionLabel: "Go to approvals",
      };
    default:
      return {
        iconClassName: "text-muted",
        Icon: Bell,
        categoryLabel: "Notification",
        actionLabel: "View details",
      };
  }
}

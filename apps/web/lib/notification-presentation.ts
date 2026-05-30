import { Wallet, ClipboardCheck, LifeBuoy, Users, Ban, CheckCircle2, Bell, CircleX, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const NOTIFICATION_TYPES = [
  "RETAILER_PENDING_APPROVAL",
  "DISPUTE_PENDING",
  "RETAILER_APPROVED",
  "RETAILER_REJECTED",
  "RETAILER_SUSPENDED",
  "RETAILER_RESTORED",
  "DISTRIBUTOR_DISPUTE_PENDING",
  "DISTRIBUTOR_DISPUTE_RESOLVED",
  "FUND_REQUEST_PENDING",
  "WALLET_CREDITED",
  "WALLET_DEBITED",
  "RECHARGE_SUCCEEDED",
  "RECHARGE_FAILED",
  "RECHARGE_REFUNDED",
  "ACCOUNT_APPROVED",
  "ACCOUNT_REJECTED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_RESTORED",
  "FUND_REQUEST_APPROVED",
  "FUND_REQUEST_REJECTED",
  "RETAILER_DISPUTE_RESOLVED",
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
    case "DISTRIBUTOR_DISPUTE_PENDING":
      return {
        iconClassName: "text-danger",
        Icon: LifeBuoy,
        categoryLabel: "Support dispute",
        actionLabel: "Go to dispute",
      };
    case "DISTRIBUTOR_DISPUTE_RESOLVED":
      return {
        iconClassName: "text-success",
        Icon: LifeBuoy,
        categoryLabel: "Dispute resolved",
        actionLabel: "View dispute",
      };
    case "RETAILER_PENDING_APPROVAL":
      return {
        iconClassName: "text-warning",
        Icon: ClipboardCheck,
        categoryLabel: "Retailer approval",
        actionLabel: "Go to approvals",
      };
    case "RETAILER_APPROVED":
      return {
        iconClassName: "text-success",
        Icon: CheckCircle2,
        categoryLabel: "Retailer approved",
        actionLabel: "View retailer",
      };
    case "RETAILER_REJECTED":
      return {
        iconClassName: "text-danger",
        Icon: Ban,
        categoryLabel: "Retailer rejected",
        actionLabel: "View retailers",
      };
    case "RETAILER_SUSPENDED":
      return {
        iconClassName: "text-warning",
        Icon: Ban,
        categoryLabel: "Retailer suspended",
        actionLabel: "View retailer",
      };
    case "RETAILER_RESTORED":
      return {
        iconClassName: "text-success",
        Icon: Users,
        categoryLabel: "Retailer reactivated",
        actionLabel: "View retailer",
      };
    case "FUND_REQUEST_PENDING":
      return {
        iconClassName: "text-warning",
        Icon: Wallet,
        categoryLabel: "Fund request",
        actionLabel: "Go to funds",
      };
    case "WALLET_CREDITED":
      return {
        iconClassName: "text-success",
        Icon: Wallet,
        categoryLabel: "Wallet credit",
        actionLabel: "View ledger",
      };
    case "WALLET_DEBITED":
      return {
        iconClassName: "text-danger",
        Icon: Wallet,
        categoryLabel: "Wallet debit",
        actionLabel: "View ledger",
      };
    case "RECHARGE_SUCCEEDED":
      return {
        iconClassName: "text-success",
        Icon: CheckCircle2,
        categoryLabel: "Recharge success",
        actionLabel: "View ledger",
      };
    case "RECHARGE_FAILED":
      return {
        iconClassName: "text-danger",
        Icon: CircleX,
        categoryLabel: "Recharge failed",
        actionLabel: "View ledger",
      };
    case "RECHARGE_REFUNDED":
      return {
        iconClassName: "text-warning",
        Icon: RotateCcw,
        categoryLabel: "Recharge refunded",
        actionLabel: "View ledger",
      };
    case "ACCOUNT_APPROVED":
      return {
        iconClassName: "text-success",
        Icon: CheckCircle2,
        categoryLabel: "Account approved",
        actionLabel: "Go to dashboard",
      };
    case "ACCOUNT_REJECTED":
      return {
        iconClassName: "text-danger",
        Icon: Ban,
        categoryLabel: "Account rejected",
        actionLabel: "View details",
      };
    case "ACCOUNT_SUSPENDED":
      return {
        iconClassName: "text-warning",
        Icon: Ban,
        categoryLabel: "Account suspended",
        actionLabel: "View profile",
      };
    case "ACCOUNT_RESTORED":
      return {
        iconClassName: "text-success",
        Icon: RotateCcw,
        categoryLabel: "Account reactivated",
        actionLabel: "Go to dashboard",
      };
    case "FUND_REQUEST_APPROVED":
      return {
        iconClassName: "text-success",
        Icon: Wallet,
        categoryLabel: "Fund request approved",
        actionLabel: "Go to funds",
      };
    case "FUND_REQUEST_REJECTED":
      return {
        iconClassName: "text-danger",
        Icon: CircleX,
        categoryLabel: "Fund request rejected",
        actionLabel: "Go to funds",
      };
    case "RETAILER_DISPUTE_RESOLVED":
      return {
        iconClassName: "text-success",
        Icon: LifeBuoy,
        categoryLabel: "Dispute resolved",
        actionLabel: "View dispute",
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

export const NOTIFICATION_HREF_TYPES = [
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

export type NotificationHrefType = (typeof NOTIFICATION_HREF_TYPES)[number];

/** Canonical routes for notification actions (covers legacy stored hrefs). */
export function resolveNotificationHref(
  type: string,
  href: string,
): string {
  if (type === "RETAILER_PENDING_APPROVAL") {
    return "/admin/approvals";
  }
  if (type === "FUND_REQUEST_PENDING") {
    return "/distributor/funds";
  }
  if (type === "FUND_REQUEST_APPROVED" || type === "FUND_REQUEST_REJECTED") {
    return "/retailer/funds";
  }
  return href;
}

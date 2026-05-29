export const NOTIFICATIONS_SYNC_EVENT = "recharge:notifications-sync";

export function notifyNotificationsSync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_SYNC_EVENT));
  }
}

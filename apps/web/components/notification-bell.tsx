"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@heroui/react";

import { apiFetch } from "@/lib/api-client";
import { NOTIFICATIONS_SYNC_EVENT } from "@/lib/notification-sync";

const POLL_MS = 60_000;

export function NotificationBell({
  initialUnreadCount = 0,
}: {
  initialUnreadCount?: number;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  const refreshUnread = useCallback(async () => {
    const res = await apiFetch("/api/notifications/unread-count");
    if (!res.ok) return;
    const data = (await res.json()) as { count: number };
    setUnreadCount(data.count);
  }, []);

  useEffect(() => {
    void refreshUnread();
    const pollId = window.setInterval(() => void refreshUnread(), POLL_MS);
    const onSync = () => void refreshUnread();
    window.addEventListener(NOTIFICATIONS_SYNC_EVENT, onSync);
    return () => {
      window.clearInterval(pollId);
      window.removeEventListener(NOTIFICATIONS_SYNC_EVENT, onSync);
    };
  }, [refreshUnread]);

  return (
    <Button
      aria-label="Notifications"
      asChild
      className="relative"
      isIconOnly
      variant="ghost"
    >
      <Link href="/admin/notifications">
        <Bell className="size-4" strokeWidth={2} aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex size-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-0.5 text-[9px] font-semibold leading-none text-danger-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}

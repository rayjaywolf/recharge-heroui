"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Chip,
  Description,
  Label,
  Link,
  Tabs,
} from "@heroui/react";

import { apiFetch } from "@/lib/api-client";
import {
  notificationRowsFromApi,
  type NotificationListItem,
} from "@/lib/notifications";
import { getNotificationPresentation } from "@/lib/notification-presentation";
import {
  NOTIFICATIONS_SYNC_EVENT,
  notifyNotificationsSync,
} from "@/lib/notification-sync";
import { cn } from "@/lib/utils";

type NotificationTab = "unread" | "read";

type NotificationsListProps = {
  initialItems: NotificationListItem[];
  emptyMessage: string;
  emptyUnreadMessage: string;
  emptyReadMessage: string;
};

function NotificationCheckboxItem({ item }: { item: NotificationListItem }) {
  const router = useRouter();
  const { iconClassName, Icon, categoryLabel, actionLabel } =
    getNotificationPresentation(item.type);
  const isUnread = !item.readAt;

  return (
    <Checkbox
      className={cn(
        "group flex w-full flex-row items-stretch gap-4 rounded-3xl bg-surface px-5 py-4 transition-all",
        "data-[selected=true]:bg-accent/10",
      )}
      value={item.id}
      variant="secondary"
    >
      <Checkbox.Content className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-4">
          <Icon
            aria-hidden
            className={cn("size-5 shrink-0", iconClassName)}
            strokeWidth={2}
          />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <Label>{item.title}</Label>
            <Chip
              className="h-5 px-1.5 text-[10px]"
              size="sm"
              variant="secondary"
            >
              {categoryLabel}
            </Chip>
            {isUnread ? (
              <Chip
                className="h-5 px-1.5 text-[10px]"
                color="accent"
                size="sm"
                variant="soft"
              >
                New
              </Chip>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-1 pl-9">
          <Description>{item.body}</Description>
          <p className="text-xs text-muted">{item.createdAtLabel}</p>
        </div>
      </Checkbox.Content>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
        <Checkbox.Control className="size-5 rounded-full before:rounded-full">
          <Checkbox.Indicator />
        </Checkbox.Control>
        <span
          className="shrink-0"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Link
            className="inline-flex items-center gap-0.5 text-xs font-medium"
            onPress={() => router.push(item.href)}
          >
            {actionLabel}
            <Link.Icon />
          </Link>
        </span>
      </div>
    </Checkbox>
  );
}

export function NotificationsList({
  initialItems,
  emptyMessage,
  emptyUnreadMessage,
  emptyReadMessage,
}: NotificationsListProps) {
  const [items, setItems] = useState(initialItems);
  const [activeTab, setActiveTab] = useState<NotificationTab>("unread");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const unreadItems = items.filter((item) => !item.readAt);
  const readItems = items.filter((item) => item.readAt);
  const visibleItems = activeTab === "unread" ? unreadItems : readItems;
  const visibleIds = useMemo(
    () => visibleItems.map((item) => item.id),
    [visibleItems],
  );

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const someVisibleSelected =
    selected.length > 0 &&
    visibleIds.some((id) => selected.includes(id)) &&
    !allVisibleSelected;

  const selectedInTab = selected.filter((id) => visibleIds.includes(id));

  const reload = useCallback(async () => {
    const res = await apiFetch("/api/notifications?limit=50");
    if (!res.ok) return;
    const data = (await res.json()) as {
      notifications: NotificationListItem[];
    };
    setItems(notificationRowsFromApi(data.notifications));
  }, []);

  useEffect(() => {
    const onSync = () => void reload();
    window.addEventListener(NOTIFICATIONS_SYNC_EVENT, onSync);
    return () => window.removeEventListener(NOTIFICATIONS_SYNC_EVENT, onSync);
  }, [reload]);

  useEffect(() => {
    setSelected([]);
  }, [activeTab]);

  const toggleSelectAll = (checked: boolean) => {
    setSelected(checked ? visibleIds : []);
  };

  const markSelectedRead = async () => {
    if (selectedInTab.length === 0) return;
    setBusy(true);
    try {
      const res = await apiFetch("/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ ids: selectedInTab }),
      });
      if (!res.ok) return;
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((item) =>
          selectedInTab.includes(item.id)
            ? { ...item, readAt: item.readAt ?? now }
            : item,
        ),
      );
      setSelected([]);
      notifyNotificationsSync();
    } finally {
      setBusy(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedInTab.length === 0) return;
    setBusy(true);
    try {
      const res = await apiFetch("/api/notifications", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedInTab }),
      });
      if (!res.ok) return;
      setItems((prev) =>
        prev.filter((item) => !selectedInTab.includes(item.id)),
      );
      setSelected([]);
      notifyNotificationsSync();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => {
          if (key != null) setActiveTab(String(key) as NotificationTab);
        }}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Notification filters" className="w-full max-w-md">
            <Tabs.Tab className="flex-1" id="unread">
              Unread ({unreadItems.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="flex-1" id="read">
              Read ({readItems.length})
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      {items.length === 0 ? (
        <p className="rounded-3xl bg-surface px-5 py-8 text-center text-sm text-muted">
          {emptyMessage}
        </p>
      ) : visibleItems.length === 0 ? (
        <p className="rounded-3xl bg-surface px-5 py-8 text-center text-sm text-muted">
          {activeTab === "unread" ? emptyUnreadMessage : emptyReadMessage}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Checkbox
              isIndeterminate={someVisibleSelected}
              isSelected={allVisibleSelected}
              variant="secondary"
              onChange={(isSelected) =>
                toggleSelectAll(isSelected === true)
              }
            >
              <Checkbox.Control className="size-5 shrink-0 rounded-full before:rounded-full">
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <Label>
                  {allVisibleSelected ? "Deselect all" : "Select all"}
                </Label>
              </Checkbox.Content>
            </Checkbox>

            <div className="flex flex-wrap items-center gap-2">
              {activeTab === "unread" ? (
                <Button
                  isDisabled={selectedInTab.length === 0 || busy}
                  size="sm"
                  variant="secondary"
                  onPress={() => void markSelectedRead()}
                >
                  <CheckCheck aria-hidden className="size-4" strokeWidth={2} />
                  Mark selected as read
                </Button>
              ) : (
                <Button
                  className="text-danger"
                  isDisabled={selectedInTab.length === 0 || busy}
                  size="sm"
                  variant="secondary"
                  onPress={() => void deleteSelected()}
                >
                  <Trash2 aria-hidden className="size-4" strokeWidth={2} />
                  Delete selected
                </Button>
              )}
            </div>
          </div>

          <CheckboxGroup
            aria-label="Notifications"
            className="[&_[data-slot=checkbox]]:mt-3 [&_[data-slot=checkbox]:first]:mt-1"
            value={selected}
            onChange={setSelected}
          >
            {visibleItems.map((item) => (
              <NotificationCheckboxItem key={item.id} item={item} />
            ))}
          </CheckboxGroup>
        </div>
      )}
    </div>
  );
}

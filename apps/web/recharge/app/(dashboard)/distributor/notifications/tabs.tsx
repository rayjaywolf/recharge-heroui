"use client"

import { useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNotificationReadIds } from "@/hooks/use-notification-read-ids"

type DistributorNotification = {
  id: string
  title: string
  description: string
  createdAt: string
}

type NotificationsTabsProps = {
  userId: string
  notifications: DistributorNotification[]
}

export function NotificationsTabs({
  userId,
  notifications,
}: NotificationsTabsProps) {
  const storageKey = `distributor-notifications-read:${userId}`
  const { readIds, persistReadIds } = useNotificationReadIds(storageKey)

  const unread = useMemo(
    () =>
      notifications.filter(
        (notification) => !readIds.includes(notification.id)
      ),
    [notifications, readIds]
  )
  const read = useMemo(
    () =>
      notifications.filter((notification) => readIds.includes(notification.id)),
    [notifications, readIds]
  )

  const markOneAsRead = (id: string) => {
    if (readIds.includes(id)) return
    persistReadIds([...readIds, id])
  }

  const markAllAsRead = () => {
    persistReadIds(notifications.map((notification) => notification.id))
  }

  const markAllAsUnread = () => {
    persistReadIds([])
  }

  return (
    <Tabs defaultValue="unread">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="unread">
            Unread <Badge variant="outline">{unread.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="read">
            Read <Badge variant="outline">{read.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={unread.length === 0}
          >
            Mark all as read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsUnread}
            disabled={read.length === 0}
          >
            Mark all as unread
          </Button>
        </div>
      </div>

      <TabsContent value="unread" className="space-y-3">
        {unread.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No unread notifications.
          </p>
        ) : (
          unread.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div>
                <p className="font-medium">{notification.title}</p>
                <p className="text-sm text-muted-foreground">
                  {notification.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markOneAsRead(notification.id)}
              >
                Mark as read
              </Button>
            </div>
          ))
        )}
      </TabsContent>

      <TabsContent value="read" className="space-y-3">
        {read.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No read notifications.
          </p>
        ) : (
          read.map((notification) => (
            <div key={notification.id} className="rounded-md border p-3">
              <p className="font-medium">{notification.title}</p>
              <p className="text-sm text-muted-foreground">
                {notification.description}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(notification.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </p>
            </div>
          ))
        )}
      </TabsContent>
    </Tabs>
  )
}

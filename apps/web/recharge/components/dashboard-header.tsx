"use client"

import { Bell, Wallet } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { LogoutButton } from "@/components/logout-button"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useNotificationReadIds } from "@/hooks/use-notification-read-ids"

type RetailerNotification = {
  id: string
  title: string
  description: string
  createdAt: string
}

type DashboardHeaderProps = {
  userId: string
  userName: string
  userRole: string
  balance: number
  apiBalance?: number
  isRetailer: boolean
  notifications: RetailerNotification[]
}

export function DashboardHeader({
  userId,
  userName,
  userRole,
  balance,
  apiBalance,
  isRetailer,
  notifications,
}: DashboardHeaderProps) {
  const storageKey = `retailer-notifications-read:${userId}`
  const { readIds, persistReadIds } = useNotificationReadIds(storageKey)
  const router = useRouter()
  const pathname = usePathname()
  
  // Basic heuristic: if we are deeper than /retailer (e.g. /retailer/recharge) it's a subpage
  const isSubPage = pathname.split("/").filter(Boolean).length > 1

  const unreadNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) => !readIds.includes(notification.id)
      ),
    [notifications, readIds]
  )

  const unreadCount = unreadNotifications.length

  const markOneAsRead = (id: string) => {
    if (readIds.includes(id)) return
    persistReadIds([...readIds, id])
  }

  const markAllAsRead = () => {
    persistReadIds(notifications.map((notification) => notification.id))
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/70 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      {isSubPage && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={() => router.back()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </Button>
      )}

      <div className="gap- ml-auto flex items-center gap-3">
        <div className="hidden flex-col text-right sm:flex">
          <span className="text-sm font-medium">{userName}</span>
          <span className="text-xs text-muted-foreground">{userRole}</span>
        </div>

        {userRole !== "ADMIN" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-white px-1 text-[9px] font-semibold text-primary-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Badge variant="outline">{unreadCount}</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {unreadNotifications.length === 0 ? (
                <DropdownMenuItem disabled>
                  No unread notifications
                </DropdownMenuItem>
              ) : (
                unreadNotifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="block py-2"
                    onSelect={() => markOneAsRead(notification.id)}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.description}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href={
                    userRole === "DISTRIBUTOR"
                      ? "/distributor/notifications"
                      : "/retailer/notifications"
                  }
                >
                  View all notifications
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={markAllAsRead}
                disabled={unreadNotifications.length === 0}
              >
                Mark all as read
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {userRole !== "ADMIN" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="h-8 gap-2 px-3">
                <Wallet className="h-4 w-4" />₹ {balance.toFixed(2)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  href={
                    userRole === "DISTRIBUTOR"
                      ? "/distributor/funds"
                      : "/retailer/funds"
                  }
                >
                  Add Funds
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
            <Wallet className="h-4 w-4" />₹{" "}
            {apiBalance !== undefined
              ? apiBalance.toFixed(2)
              : balance.toFixed(2)}
          </div>
        )}

        <LogoutButton />
      </div>
    </header>
  )
}

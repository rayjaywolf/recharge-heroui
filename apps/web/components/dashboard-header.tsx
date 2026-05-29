"use client";

import { Menu, Wallet } from "lucide-react";
import Link from "next/link";
import { Button, Chip, Header } from "@heroui/react";
import Avatar from "boring-avatars";

import { Money } from "@/components/money";
import { SidebarPanelIcon } from "@/components/sidebar-panel-icon";
import { WalletBalanceMenu } from "@/components/wallet-balance-menu";
import { useDashboardSidebar } from "@/components/dashboard-sidebar-context";
import { LogoutButton } from "@/components/logout-button";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

type DashboardHeaderProps = {
  userName: string;
  userRole: string;
  balance: number;
  pendingApprovalsCount?: number;
  pendingSupportCount?: number;
  unreadNotificationCount?: number;
};

function formatRole(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function DashboardHeader({
  userName,
  userRole,
  balance,
  pendingApprovalsCount = 0,
  pendingSupportCount = 0,
  unreadNotificationCount = 0,
}: DashboardHeaderProps) {
  const { collapsed, toggle } = useDashboardSidebar();
  const showWalletMenu = userRole === "DISTRIBUTOR" || userRole === "RETAILER";
  const showNotifications = userRole === "ADMIN";

  return (
    <Header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-separator bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Button
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden md:inline-flex"
        isIconOnly
        variant="ghost"
        onPress={toggle}
      >
        <SidebarPanelIcon className="size-4" />
      </Button>

      <MobileNavDrawer
        pendingApprovalsCount={pendingApprovalsCount}
        pendingSupportCount={pendingSupportCount}
        userRole={userRole}
      >
        <Button aria-label="Open menu" className="md:hidden" isIconOnly variant="ghost">
          <Menu className="size-5" />
        </Button>
      </MobileNavDrawer>

      <div className="ml-auto flex min-w-0 items-center gap-4">
        <Link
          aria-label="View profile"
          href="/profile"
          className="hidden min-w-0 items-center gap-2 rounded-md py-1 hover:bg-content2/50 sm:inline-flex"
        >
          <div className="flex size-8 items-center justify-center overflow-hidden rounded-full">
            <Avatar name={userName} size={28} variant="beam" />
          </div>
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-medium text-foreground">
              {userName}
            </p>
            <p className="text-xs text-muted">{formatRole(userRole)}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:border-l sm:border-separator sm:pl-4">
          <ThemeToggle />

          {showNotifications ? (
            <NotificationBell initialUnreadCount={unreadNotificationCount} />
          ) : null}

          {showWalletMenu ? (
            <WalletBalanceMenu balance={balance} userRole={userRole} />
          ) : (
            <Chip
              className="inline-flex items-center gap-2.5 font-medium"
              size="md"
              variant="secondary"
            >
              <Wallet
                className="size-4 shrink-0 text-success"
                strokeWidth={2}
                aria-hidden
              />
              <Money
                amount={balance}
                className="leading-none text-success"
                fractionDigits={2}
              />
            </Chip>
          )}

          <Link
            aria-label="View profile"
            href="/profile"
            className="min-w-0 rounded-md py-1 hover:bg-content2/50 sm:hidden"
          >
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center overflow-hidden rounded-full">
                <Avatar name={userName} size={28} variant="beam" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {userName}
                </p>
                <p className="text-xs text-muted">{formatRole(userRole)}</p>
              </div>
            </div>
          </Link>

          <LogoutButton />
        </div>
      </div>
    </Header>
  );
}

"use client";

import { Menu, Wallet } from "lucide-react";
import Link from "next/link";
import { Button, Chip, Header, Separator } from "@heroui/react";
import Avatar from "boring-avatars";

import { Money } from "@/components/money";
import { SidebarPanelIcon } from "@/components/sidebar-panel-icon";
import { WalletBalanceMenu } from "@/components/wallet-balance-menu";
import { useDashboardSidebar } from "@/components/dashboard-sidebar-context";
import { LogoutButton } from "@/components/logout-button";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { ThemeToggle } from "@/components/theme-toggle";

type DashboardHeaderProps = {
  userName: string;
  userRole: string;
  balance: number;
  pendingApprovalsCount?: number;
};

function formatRole(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function DashboardHeader({
  userName,
  userRole,
  balance,
  pendingApprovalsCount = 0,
}: DashboardHeaderProps) {
  const { collapsed, toggle } = useDashboardSidebar();
  const showWalletMenu = userRole === "DISTRIBUTOR" || userRole === "RETAILER";

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
        userRole={userRole}
      >
        <Button aria-label="Open menu" className="md:hidden" isIconOnly variant="ghost">
          <Menu className="size-5" />
        </Button>
      </MobileNavDrawer>

      <div className="ml-auto flex min-w-0 items-center gap-3">
        <Link
          aria-label="View profile"
          href="/profile"
          className="hidden min-w-0 items-center gap-2 rounded-md px-1 py-1 hover:bg-content2/50 sm:inline-flex"
        >
          <div className="flex size-8 items-center justify-center rounded-full overflow-hidden">
            <Avatar name={userName} size={28} variant="beam" />
          </div>
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-medium text-foreground">
              {userName}
            </p>
            <p className="text-xs text-muted">{formatRole(userRole)}</p>
          </div>
        </Link>

        <Separator className="hidden h-8 sm:block" orientation="vertical" />

        <ThemeToggle />

        {showWalletMenu ? (
          <WalletBalanceMenu balance={balance} userRole={userRole} />
        ) : (
          <Chip className="gap-1 font-medium" size="md" variant="secondary">
            <Wallet className="size-3.5 shrink-0" aria-hidden />
            <Money
              amount={balance}
              className="text-inherit"
              fractionDigits={2}
            />
          </Chip>
        )}

        <Link
          aria-label="View profile"
          href="/profile"
          className="min-w-0 rounded-md px-1 py-1 hover:bg-content2/50 sm:hidden"
        >
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full overflow-hidden">
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
    </Header>
  );
}

"use client";

import { Menu, PanelLeftClose, PanelLeftOpen, Wallet } from "lucide-react";
import { Button, Chip, Header, Separator } from "@heroui/react";

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

  return (
    <Header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-separator bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Button
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden md:inline-flex"
        isIconOnly
        variant="ghost"
        onPress={toggle}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-5" />
        ) : (
          <PanelLeftClose className="size-5" />
        )}
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
        <div className="hidden min-w-0 text-right sm:block">
          <p className="truncate text-sm font-medium text-foreground">
            {userName}
          </p>
          <p className="text-xs text-muted">{formatRole(userRole)}</p>
        </div>

        <Separator className="hidden h-8 sm:block" orientation="vertical" />

        <ThemeToggle />

        <Chip
          className="gap-1 font-medium"
          size="md"
          variant="secondary"
        >
          <Wallet className="size-3.5 shrink-0" aria-hidden />
          ₹ {balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Chip>

        <div className="min-w-0 sm:hidden">
          <p className="truncate text-sm font-medium text-foreground">
            {userName}
          </p>
          <p className="text-xs text-muted">{formatRole(userRole)}</p>
        </div>

        <LogoutButton />
      </div>
    </Header>
  );
}

"use client";

import { Tooltip } from "@heroui/react";

import { BrandMark } from "@/components/brand-mark";
import { useDashboardSidebar } from "@/components/dashboard-sidebar-context";
import { NavLinksList } from "@/components/nav-links";
import { cn } from "@/lib/utils";

export function AppSidebar({
  userRole,
  pendingApprovalsCount = 0,
}: {
  userRole: string;
  pendingApprovalsCount?: number;
}) {
  const { collapsed, isReady } = useDashboardSidebar();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-separator bg-surface transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-16" : "w-60",
        !isReady && "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-separator px-3",
          collapsed && "justify-center px-2"
        )}
      >
        {!collapsed ? (
          <BrandMark />
        ) : (
          <Tooltip delay={0}>
            <Tooltip.Trigger aria-label="RechargePro" className="cursor-default">
              <BrandMark collapsed />
            </Tooltip.Trigger>
            <Tooltip.Content placement="right" showArrow>
              <Tooltip.Arrow />
              <p className="text-xs">RechargePro</p>
            </Tooltip.Content>
          </Tooltip>
        )}
      </div>

      <div className="flex-1 overflow-x-hidden overflow-y-auto px-2 pb-2 pt-4">
        {!collapsed ? (
          <p className="mb-3 px-2 text-xs font-medium uppercase tracking-wider text-muted">
            Menu
          </p>
        ) : null}
        <NavLinksList
          className={collapsed ? "pt-1" : undefined}
          collapsed={collapsed}
          pendingApprovalsCount={pendingApprovalsCount}
          userRole={userRole}
        />
      </div>
    </aside>
  );
}

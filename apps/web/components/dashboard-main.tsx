"use client";

import type { ReactNode } from "react";

import { useDashboardSidebar } from "@/components/dashboard-sidebar-context";
import { DashboardHeader } from "@/components/dashboard-header";
import { cn } from "@/lib/utils";

type DashboardMainProps = {
  children: ReactNode;
  userName: string;
  userRole: string;
  balance: number;
  pendingApprovalsCount?: number;
  pendingSupportCount?: number;
};

export function DashboardMain({
  children,
  userName,
  userRole,
  balance,
  pendingApprovalsCount = 0,
  pendingSupportCount = 0,
}: DashboardMainProps) {
  const { collapsed, isReady } = useDashboardSidebar();

  return (
    <div
      className={cn(
        "flex min-h-svh flex-col transition-[padding] duration-200 ease-out md:pl-60",
        isReady && collapsed && "md:pl-16"
      )}
    >
      <DashboardHeader
        balance={balance}
        pendingApprovalsCount={pendingApprovalsCount}
        pendingSupportCount={pendingSupportCount}
        userName={userName}
        userRole={userRole}
      />

      <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

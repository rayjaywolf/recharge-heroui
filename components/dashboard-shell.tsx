"use client";

import type { ReactNode } from "react";
import { Toast } from "@heroui/react";

import { AppSidebar } from "@/components/app-sidebar";
import { DashboardMain } from "@/components/dashboard-main";
import { DashboardSidebarProvider } from "@/components/dashboard-sidebar-context";

type DashboardShellProps = {
  children: ReactNode;
  userName: string;
  userRole: string;
  balance: number;
  pendingApprovalsCount?: number;
};

export function DashboardShell({
  children,
  userName,
  userRole,
  balance,
  pendingApprovalsCount = 0,
}: DashboardShellProps) {
  return (
    <div className="min-h-svh bg-background">
      <Toast.Provider />
      <DashboardSidebarProvider>
        <AppSidebar
          pendingApprovalsCount={pendingApprovalsCount}
          userRole={userRole}
        />

        <DashboardMain
          balance={balance}
          pendingApprovalsCount={pendingApprovalsCount}
          userName={userName}
          userRole={userRole}
        >
          {children}
        </DashboardMain>
      </DashboardSidebarProvider>
    </div>
  );
}

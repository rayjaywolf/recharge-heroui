"use client";

import type { ReactNode } from "react";
import { Toast } from "@heroui/react";

import { AppSidebar } from "@/components/app-sidebar";
import { DashboardMain } from "@/components/dashboard-main";
import { DashboardSidebarProvider } from "@/components/dashboard-sidebar-context";
import { MpinGate } from "@/components/mpin-gate";

type DashboardShellProps = {
  children: ReactNode;
  userName: string;
  userRole: string;
  balance: number;
  pendingApprovalsCount?: number;
  pendingSupportCount?: number;
  mpinMustReset?: boolean;
};

export function DashboardShell({
  children,
  userName,
  userRole,
  balance,
  pendingApprovalsCount = 0,
  pendingSupportCount = 0,
  mpinMustReset = false,
}: DashboardShellProps) {
  return (
    <div className="min-h-svh bg-background">
      <Toast.Provider />
      <MpinGate mpinMustReset={mpinMustReset} userRole={userRole}>
        <DashboardSidebarProvider>
          <AppSidebar
            pendingApprovalsCount={pendingApprovalsCount}
            pendingSupportCount={pendingSupportCount}
            userRole={userRole}
          />

          <DashboardMain
            balance={balance}
            pendingApprovalsCount={pendingApprovalsCount}
            pendingSupportCount={pendingSupportCount}
            userName={userName}
            userRole={userRole}
          >
            {children}
          </DashboardMain>
        </DashboardSidebarProvider>
      </MpinGate>
    </div>
  );
}

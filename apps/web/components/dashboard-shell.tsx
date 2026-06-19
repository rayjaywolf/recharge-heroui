"use client";

import type { ReactNode } from "react";
import { Toast } from "@heroui/react";

import { AppSidebar } from "@/components/app-sidebar";
import { DashboardMain } from "@/components/dashboard-main";
import { DashboardSidebarProvider } from "@/components/dashboard-sidebar-context";
import { MpinGate } from "@/components/mpin-gate";
import { StoreNameGate } from "@/components/store-name-gate";
type DashboardShellProps = {
  children: ReactNode;
  userName: string;
  userStoreName: string | null;
  userImage: string;
  userRole: string;
  balance: number;
  adminProviderBalance?: number | null;
  pendingApprovalsCount?: number;
  pendingSupportCount?: number;
  pendingFundRequestsCount?: number;
  unreadNotificationCount?: number;
  mpinMustReset?: boolean;
};

export function DashboardShell({
  children,
  userName,
  userStoreName,
  userImage,
  userRole,
  balance,
  adminProviderBalance = null,
  pendingApprovalsCount = 0,
  pendingSupportCount = 0,
  pendingFundRequestsCount = 0,
  unreadNotificationCount = 0,
  mpinMustReset = false,
}: DashboardShellProps) {
  return (
    <div className="min-h-svh bg-background">
      <Toast.Provider />
      <StoreNameGate storeName={userStoreName} userRole={userRole}>
        <MpinGate mpinMustReset={mpinMustReset} userRole={userRole}>
          <DashboardSidebarProvider>
            <AppSidebar
              pendingApprovalsCount={pendingApprovalsCount}
              pendingFundRequestsCount={pendingFundRequestsCount}
              pendingSupportCount={pendingSupportCount}
              userRole={userRole}
            />

            <DashboardMain
              adminProviderBalance={adminProviderBalance}
              balance={balance}
              pendingApprovalsCount={pendingApprovalsCount}
              pendingFundRequestsCount={pendingFundRequestsCount}
              pendingSupportCount={pendingSupportCount}
              unreadNotificationCount={unreadNotificationCount}
              userName={userName}
              userImage={userImage}
              userRole={userRole}
            >
              {children}
            </DashboardMain>
          </DashboardSidebarProvider>
        </MpinGate>
      </StoreNameGate>
    </div>
  );
}

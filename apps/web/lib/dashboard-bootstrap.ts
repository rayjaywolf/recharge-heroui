import { serverApiFetch } from "@/lib/server-api";

export type DashboardBootstrap = {
  user: {
    id: string;
    role: string;
    name: string;
    balance: number;
    accountStatus: string;
    image: string;
  };
  ui: {
    pendingApprovalsCount: number;
    unreadNotificationCount: number;
    pendingFundRequestsCount: number;
    pendingSupportCount: number;
    mpinMustReset: boolean;
    adminProviderBalance: number | null;
  };
};

export async function getDashboardBootstrap(): Promise<DashboardBootstrap> {
  const response = await serverApiFetch("/api/dashboard/bootstrap");

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard bootstrap.");
  }

  return (await response.json()) as DashboardBootstrap;
}

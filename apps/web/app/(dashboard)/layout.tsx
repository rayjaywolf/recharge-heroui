import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardBootstrap } from "@/lib/dashboard-bootstrap";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let bootstrap;
  try {
    bootstrap = await getDashboardBootstrap();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  if (!bootstrap) {
    redirect("/login");
  }

  const { user, ui } = bootstrap;

  if (user.accountStatus === "REJECTED") {
    redirect("/rejected");
  }

  if (user.accountStatus !== "APPROVED" && user.role !== "ADMIN") {
    redirect("/pending-approval");
  }

  return (
    <DashboardShell
      adminProviderBalance={ui.adminProviderBalance}
      balance={user.balance}
      pendingApprovalsCount={ui.pendingApprovalsCount}
      pendingSupportCount={ui.pendingSupportCount}
      pendingFundRequestsCount={ui.pendingFundRequestsCount}
      unreadNotificationCount={ui.unreadNotificationCount}
      mpinMustReset={ui.mpinMustReset}
      userName={user.name}
      userStoreName={user.storeName}
      userImage={user.image}
      userRole={user.role}
    >
      {children}
    </DashboardShell>
  );
}

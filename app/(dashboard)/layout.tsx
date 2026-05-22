import { auth, prisma } from "@/lib/auth";
import { getPendingApprovalsCount } from "@/lib/pending-approvals";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.isRejected) {
    redirect("/rejected");
  }

  if (!user.isApproved && user.role !== "ADMIN") {
    redirect("/pending-approval");
  }

  const pendingApprovalsCount =
    user.role === "ADMIN" ? await getPendingApprovalsCount() : 0;

  return (
    <DashboardShell
      balance={user.balance}
      pendingApprovalsCount={pendingApprovalsCount}
      userName={user.name}
      userRole={user.role}
    >
      {children}
    </DashboardShell>
  );
}

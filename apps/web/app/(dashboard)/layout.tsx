import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, user } from "@repo/db";

import { DashboardShell } from "@/components/dashboard-shell";
import { auth } from "@/lib/auth";
import { getPendingApprovalsCount } from "@/lib/pending-approvals";

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

  const [found] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!found) {
    redirect("/login");
  }

  if (found.isRejected) {
    redirect("/rejected");
  }

  if (!found.isApproved && found.role !== "ADMIN") {
    redirect("/pending-approval");
  }

  const pendingApprovalsCount =
    found.role === "ADMIN" ? await getPendingApprovalsCount() : 0;

  return (
    <DashboardShell
      balance={found.balance}
      pendingApprovalsCount={pendingApprovalsCount}
      userName={found.name}
      userRole={found.role}
    >
      {children}
    </DashboardShell>
  );
}

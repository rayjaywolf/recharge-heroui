import { and, count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, dispute, user } from "@repo/db";

import { DashboardShell } from "@/components/dashboard-shell";
import { auth } from "@/lib/auth";
import { getPendingApprovalsCount } from "@/lib/pending-approvals";
import { ensureUserMpinBackfill } from "@repo/server/mpin";

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
  let pendingSupportCount = 0;
  if (found.role === "ADMIN") {
    const [row] = await db
      .select({ total: count() })
      .from(dispute)
      .where(eq(dispute.status, "PENDING"));
    pendingSupportCount = row?.total ?? 0;
  } else if (found.role === "DISTRIBUTOR") {
    const [row] = await db
      .select({ total: count() })
      .from(dispute)
      .where(
        and(
          eq(dispute.distributorId, found.id),
          eq(dispute.status, "PENDING"),
        ),
      );
    pendingSupportCount = row?.total ?? 0;
  } else if (found.role === "RETAILER") {
    const [row] = await db
      .select({ total: count() })
      .from(dispute)
      .where(
        and(
          eq(dispute.distributorId, found.id),
          eq(dispute.status, "PENDING"),
        ),
      );
    pendingSupportCount = row?.total ?? 0;
  }

  let mpinMustReset = false;
  if (found.role !== "ADMIN") {
    const mpinState = await ensureUserMpinBackfill(found.id, found.role);
    mpinMustReset = mpinState.mpinMustReset;
  }

  return (
    <DashboardShell
      balance={found.balance}
      pendingApprovalsCount={pendingApprovalsCount}
      pendingSupportCount={pendingSupportCount}
      mpinMustReset={mpinMustReset}
      userName={found.name}
      userRole={found.role}
    >
      {children}
    </DashboardShell>
  );
}

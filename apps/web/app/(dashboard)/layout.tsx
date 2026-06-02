import { and, count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, dispute, transaction, user } from "@repo/db";

import { DashboardShell } from "@/components/dashboard-shell";
import { auth } from "@/lib/auth";
import { getPendingApprovalsCount } from "@/lib/pending-approvals";
import { ensureUserMpinBackfill } from "@repo/server/mpin";
import { ensureUserAvatar } from "@repo/server/user-avatar";
import { getUnreadNotificationCount } from "@repo/server/notifications";
import { getPendingFundRequestsCount } from "@/lib/pending-fund-requests";

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

  if (found.accountStatus === "REJECTED") {
    redirect("/rejected");
  }

  if (found.accountStatus !== "APPROVED" && found.role !== "ADMIN") {
    redirect("/pending-approval");
  }

  const pendingApprovalsCount =
    found.role === "ADMIN" ? await getPendingApprovalsCount() : 0;
  const unreadNotificationCount =
    found.role === "ADMIN" ||
    found.role === "DISTRIBUTOR" ||
    found.role === "RETAILER"
      ? await getUnreadNotificationCount(found.id)
      : 0;
  const pendingFundRequestsCount =
    found.role === "DISTRIBUTOR"
      ? await getPendingFundRequestsCount(found.id)
      : 0;
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
      .innerJoin(transaction, eq(dispute.transactionId, transaction.id))
      .where(
        and(
          eq(transaction.userId, found.id),
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

  const userImage = await ensureUserAvatar(found.id, found.name, found.image);

  return (
    <DashboardShell
      balance={found.balance}
      pendingApprovalsCount={pendingApprovalsCount}
      pendingSupportCount={pendingSupportCount}
      pendingFundRequestsCount={pendingFundRequestsCount}
      unreadNotificationCount={unreadNotificationCount}
      mpinMustReset={mpinMustReset}
      userName={found.name}
      userImage={userImage}
      userRole={found.role}
    >
      {children}
    </DashboardShell>
  );
}

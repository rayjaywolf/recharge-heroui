import { prisma } from "@/lib/auth";
import { pendingApprovalsWhere } from "@/lib/pending-approvals";

import {
  ApprovalsTable,
  type PendingUser,
} from "@/components/admin/approvals-table";

export default async function AdminApprovalsPage() {
  const pendingUsers = await prisma.user.findMany({
    where: pendingApprovalsWhere,
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      whatsappNumber: true,
      aadharNumber: true,
      panNumber: true,
      gstNumber: true,
      businessType: true,
      address: true,
      pincode: true,
      state: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const initialData: PendingUser[] = pendingUsers.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Pending approvals
        </h1>
        <p className="mt-1 text-sm text-muted">
          Review KYC submissions and approve new platform registrations.
        </p>
      </div>

      <ApprovalsTable initialData={initialData} />
    </div>
  );
}

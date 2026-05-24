import { desc } from "drizzle-orm";
import { db, user } from "@repo/db";

import {
  ApprovalsTable,
  type PendingUser,
} from "@/components/admin/approvals-table";
import { pendingApprovalsWhere } from "@/lib/pending-approvals";

export default async function AdminApprovalsPage() {
  const pendingUsers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      whatsappNumber: user.whatsappNumber,
      aadharNumber: user.aadharNumber,
      panNumber: user.panNumber,
      gstNumber: user.gstNumber,
      businessType: user.businessType,
      address: user.address,
      pincode: user.pincode,
      state: user.state,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(pendingApprovalsWhere)
    .orderBy(desc(user.createdAt));

  const initialData: PendingUser[] = pendingUsers.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
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

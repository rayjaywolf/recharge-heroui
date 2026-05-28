import { desc, eq } from "drizzle-orm";
import { db, dispute, transaction, user } from "@repo/db";

import {
  AdminDisputesTableCard,
  type AdminDisputeRow,
} from "@/components/admin/admin-disputes-table";

export default async function AdminSupportPage() {
  const rows = await db
    .select({
      id: dispute.id,
      retailerId: dispute.distributorId,
      retailerName: user.name,
      transactionId: dispute.transactionId,
      subject: dispute.subject,
      status: dispute.status,
      createdAt: dispute.createdAt,
      operator: transaction.operator,
      amount: transaction.amount,
      targetPhone: transaction.targetPhone,
    })
    .from(dispute)
    .innerJoin(user, eq(dispute.distributorId, user.id))
    .innerJoin(transaction, eq(dispute.transactionId, transaction.id))
    .orderBy(desc(dispute.status), desc(dispute.createdAt));

  const initialRows: AdminDisputeRow[] = rows.map((row) => ({
    ...row,
    status: row.status as "PENDING" | "RESOLVED",
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Support
      </h1>
      <p className="text-sm text-muted">
        Resolve distributor recharge disputes and add resolution notes.
      </p>

      <AdminDisputesTableCard
        description="Newly submitted disputes waiting for review."
        initialRows={initialRows.filter((row) => row.status === "PENDING")}
        title={`Pending disputes (${initialRows.filter((row) => row.status === "PENDING").length})`}
      />

      <AdminDisputesTableCard
        description="Disputes that were already resolved."
        initialRows={initialRows.filter((row) => row.status === "RESOLVED")}
        title={`Resolved disputes (${initialRows.filter((row) => row.status === "RESOLVED").length})`}
      />
    </div>
  );
}

import { and, desc, eq, notInArray, or } from "drizzle-orm";
import { db, dispute, transaction, user } from "@repo/db";

import {
  DistributorDisputesTable,
  type DistributorDisputeRow,
} from "@/components/distributor/distributor-disputes-table";
import {
  DistributorSupportForm,
  type DistributorSupportTransactionOption,
} from "@/components/distributor/distributor-support-form";
import { requireDistributor } from "@/lib/distributor-retailers";

const NON_RECHARGE_OPERATORS = [
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "FUNDS_SENT",
  "FUNDS_RECEIVED",
];

export default async function DistributorSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ transactionId?: string }>;
}) {
  const distributor = await requireDistributor();
  const { transactionId } = await searchParams;

  const [txRows, disputeRows] = await Promise.all([
    db
      .select({
        id: transaction.id,
        targetPhone: transaction.targetPhone,
        operator: transaction.operator,
        amount: transaction.amount,
        status: transaction.status,
        apiReferenceId: transaction.apiReferenceId,
        createdAt: transaction.createdAt,
      })
      .from(transaction)
      .innerJoin(user, eq(transaction.userId, user.id))
      .where(
        and(
          notInArray(transaction.operator, NON_RECHARGE_OPERATORS),
          or(
            eq(transaction.userId, distributor.id),
            eq(user.distributorId, distributor.id),
          ),
        ),
      )
      .orderBy(desc(transaction.createdAt))
      .limit(300),
    db
      .select({
        id: dispute.id,
        transactionId: dispute.transactionId,
        subject: dispute.subject,
        message: dispute.message,
        status: dispute.status,
        adminNote: dispute.adminNote,
        createdAt: dispute.createdAt,
        resolvedAt: dispute.resolvedAt,
        transactionStatus: transaction.status,
        operator: transaction.operator,
        amount: transaction.amount,
        targetPhone: transaction.targetPhone,
        apiReferenceId: transaction.apiReferenceId,
      })
      .from(dispute)
      .innerJoin(transaction, eq(dispute.transactionId, transaction.id))
      .where(eq(dispute.distributorId, distributor.id))
      .orderBy(desc(dispute.createdAt)),
  ]);

  const txOptions: DistributorSupportTransactionOption[] = txRows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));

  const disputes: DistributorDisputeRow[] = disputeRows.map((row) => ({
    ...row,
    status: row.status as "PENDING" | "RESOLVED",
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  }));
  const pendingDisputes = disputes.filter((row) => row.status === "PENDING");
  const resolvedDisputes = disputes.filter((row) => row.status === "RESOLVED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Support
        </h1>
        <p className="mt-1 text-sm text-muted">
          Raise disputes for recharge issues and track admin resolutions.
        </p>
      </div>

      <DistributorSupportForm
        transactions={txOptions}
        initialTransactionId={transactionId ?? null}
      />
      <DistributorDisputesTable
        rows={pendingDisputes}
        title={`Pending disputes (${pendingDisputes.length})`}
        description="Newly submitted disputes waiting for admin review."
        emptyMessage="No pending disputes."
      />
      <DistributorDisputesTable
        rows={resolvedDisputes}
        title={`Resolved disputes (${resolvedDisputes.length})`}
        description="Disputes that have already been resolved by admin."
        emptyMessage="No resolved disputes yet."
      />
    </div>
  );
}

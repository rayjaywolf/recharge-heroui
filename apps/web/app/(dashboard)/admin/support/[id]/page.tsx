import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@heroui/react";
import { db, dispute, transaction, user } from "@repo/db";

import { AdminDisputeDetailActions } from "@/components/admin/admin-dispute-detail-actions";
import { ButtonLink } from "@/components/button-link";
import { Money } from "@/components/money";
import { formatTableDateTime } from "@/lib/utils";

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const row = await db
    .select({
      id: dispute.id,
      subject: dispute.subject,
      message: dispute.message,
      status: dispute.status,
      adminNote: dispute.adminNote,
      createdAt: dispute.createdAt,
      resolvedAt: dispute.resolvedAt,
      transactionId: dispute.transactionId,
      retailerId: transaction.userId,
      retailerName: user.name,
      operator: transaction.operator,
      targetPhone: transaction.targetPhone,
      amount: transaction.amount,
      transactionStatus: transaction.status,
      apiReferenceId: transaction.apiReferenceId,
      apiMessage: transaction.apiMessage,
    })
    .from(dispute)
    .innerJoin(transaction, eq(dispute.transactionId, transaction.id))
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(eq(dispute.id, id))
    .limit(1);

  const detail = row[0];
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/support"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to support inbox
        </Link>
      </div>

      <div className="space-y-2 rounded-xl border border-separator p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{detail.subject}</h1>
          <Chip
            color={detail.status === "RESOLVED" ? "success" : "warning"}
            size="sm"
            variant="soft"
          >
            {detail.status}
          </Chip>
        </div>
        <p className="text-sm text-muted">
          Ticket #{detail.id} • Created {formatTableDateTime(detail.createdAt)}
          {detail.resolvedAt
            ? ` • Resolved ${formatTableDateTime(detail.resolvedAt)}`
            : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-separator p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Request
          </h2>
          <div className="space-y-1">
            <p className="text-xs text-muted">Retailer</p>
            <p className="text-sm font-medium text-foreground">
              {detail.retailerName}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted">Message</p>
            <p className="whitespace-pre-wrap text-sm text-foreground">{detail.message}</p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-separator p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Transaction
            </h2>
            <ButtonLink
              href={`/admin/transactions/${encodeURIComponent(detail.transactionId)}`}
              size="sm"
              variant="secondary"
            >
              Go to transaction
            </ButtonLink>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted">Transaction ID</p>
            <p className="font-mono text-xs text-foreground">{detail.transactionId}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted">Info</p>
            <p className="text-sm text-foreground">
              {detail.operator}, {detail.targetPhone}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted">Amount</p>
            <Money amount={detail.amount} className="text-sm font-medium text-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted">Status</p>
            <p className="text-sm text-foreground">{detail.transactionStatus}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted">Reference</p>
            <p className="text-sm text-foreground">{detail.apiReferenceId ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted">API message</p>
            <p className="text-sm text-foreground">{detail.apiMessage ?? "—"}</p>
          </div>
        </div>
      </div>

      <AdminDisputeDetailActions
        disputeId={detail.id}
        isResolved={detail.status === "RESOLVED"}
        initialNote={detail.adminNote}
      />
    </div>
  );
}

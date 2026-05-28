import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@heroui/react";
import { db, dispute, transaction } from "@repo/db";

import { Money } from "@/components/money";
import { requireRetailer } from "@/lib/retailer-auth";
import { formatTableDateTime } from "@/lib/utils";

export default async function RetailerDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const retailer = await requireRetailer();
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
      operator: transaction.operator,
      targetPhone: transaction.targetPhone,
      amount: transaction.amount,
      transactionStatus: transaction.status,
      apiReferenceId: transaction.apiReferenceId,
      apiMessage: transaction.apiMessage,
    })
    .from(dispute)
    .innerJoin(transaction, eq(dispute.transactionId, transaction.id))
    .where(and(eq(dispute.id, id), eq(transaction.userId, retailer.id)))
    .limit(1);

  const detail = row[0];
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/retailer/support"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to support
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
          {detail.resolvedAt ? ` • Resolved ${formatTableDateTime(detail.resolvedAt)}` : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-separator p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Your message
          </h2>
          <p className="whitespace-pre-wrap text-sm text-foreground">{detail.message}</p>
          <div className="space-y-1">
            <p className="text-xs text-muted">Admin note</p>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {detail.adminNote ?? "No note yet."}
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-separator p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Transaction
          </h2>
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
    </div>
  );
}

import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@heroui/react";
import { db, transaction, user } from "@repo/db";

import { AdminTransactionDetailActions } from "@/components/admin/admin-transaction-detail-actions";
import { TransactionStatusChip } from "@/components/admin/transaction-status-chip";
import { Money } from "@/components/money";
import { formatRechargeProvider } from "@/lib/recharge-provider";
import { formatTableDateTime } from "@/lib/utils";

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | null;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={
          mono
            ? "font-mono text-xs text-foreground"
            : "text-sm text-foreground"
        }
      >
        {value == null || value === "" ? "—" : value}
      </p>
    </div>
  );
}

export default async function AdminTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db
    .select({
      id: transaction.id,
      userId: transaction.userId,
      targetPhone: transaction.targetPhone,
      operator: transaction.operator,
      amount: transaction.amount,
      circleCode: transaction.circleCode,
      provider: transaction.provider,
      status: transaction.status,
      apiReferenceId: transaction.apiReferenceId,
      apiMessage: transaction.apiMessage,
      idempotencyKey: transaction.idempotencyKey,
      retailerCommission: transaction.retailerCommission,
      distributorCommission: transaction.distributorCommission,
      adminCommission: transaction.adminCommission,
      openingBalance: transaction.openingBalance,
      closingBalance: transaction.closingBalance,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phoneNumber,
      userWhatsapp: user.whatsappNumber,
      userRole: user.role,
    })
    .from(transaction)
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(eq(transaction.id, id))
    .limit(1);

  const detail = row[0];
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/transactions"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to transactions
        </Link>
      </div>

      <div className="space-y-2 rounded-xl border border-separator p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">
            Transaction details
          </h1>
          <TransactionStatusChip status={detail.status} />
          <Chip size="sm" variant="soft">
            <Money amount={detail.amount} />
          </Chip>
        </div>
        <p className="text-sm text-muted">
          Created {formatTableDateTime(detail.createdAt)} • Updated{" "}
          {formatTableDateTime(detail.updatedAt)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-separator p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Transaction
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Transaction ID" mono value={detail.id} />
            <DetailItem label="User ID" mono value={detail.userId} />
            <DetailItem label="Provider" value={formatRechargeProvider(detail.provider)} />
            <DetailItem label="Operator" value={detail.operator} />
            <DetailItem label="Target phone" mono value={detail.targetPhone} />
            <DetailItem label="Circle code" value={detail.circleCode} />
            <DetailItem label="Reference ID" mono value={detail.apiReferenceId} />
            <DetailItem label="Opening balance" value={`₹${detail.openingBalance.toLocaleString("en-IN")}`} />
            <DetailItem label="Closing balance" value={`₹${detail.closingBalance.toLocaleString("en-IN")}`} />
            <DetailItem
              label="Idempotency key"
              mono
              value={detail.idempotencyKey}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted">API message</p>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {detail.apiMessage ?? "—"}
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-separator p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Retailer
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Name" value={detail.userName} />
            <DetailItem label="Role" value={detail.userRole} />
            <DetailItem label="Email" value={detail.userEmail} />
            <DetailItem label="Phone" value={detail.userPhone} />
            <DetailItem label="WhatsApp" value={detail.userWhatsapp} />
          </div>

          <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Commissions
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <DetailItem
              label="Retailer"
              value={`₹${detail.retailerCommission.toFixed(2)}`}
            />
            <DetailItem
              label="Distributor"
              value={`₹${detail.distributorCommission.toFixed(2)}`}
            />
            <DetailItem label="Admin" value={`₹${detail.adminCommission.toFixed(2)}`} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-separator p-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Actions
        </h2>
        <AdminTransactionDetailActions
          transactionId={detail.id}
          initialStatus={detail.status}
        />
      </div>
    </div>
  );
}

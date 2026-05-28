import { and, desc, eq, inArray } from "drizzle-orm";
import { Chip } from "@heroui/react";
import { fundRequest, transaction } from "@repo/db";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { Money } from "@/components/money";
import { RetailerFundRequestForm } from "@/components/retailer/retailer-fund-request-form";
import { requireRetailer } from "@/lib/retailer-auth";
import { formatTableDateTime } from "@/lib/utils";
import { db } from "@repo/db";

const WALLET_OPERATORS = [
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "FUNDS_RECEIVED",
  "FUNDS_SENT",
] as const;

function statusColor(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "SUCCESS" || status === "APPROVED") return "success";
  if (status === "PENDING") return "warning";
  if (status === "FAILED" || status === "REJECTED" || status === "CANCELLED") {
    return "danger";
  }
  return "default";
}

export default async function RetailerFundsPage() {
  const retailer = await requireRetailer();

  const [walletTx, fundRequests] = await Promise.all([
    db
      .select({
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        operator: transaction.operator,
        apiMessage: transaction.apiMessage,
        createdAt: transaction.createdAt,
      })
      .from(transaction)
      .where(
        and(
          eq(transaction.userId, retailer.id),
          inArray(transaction.operator, [...WALLET_OPERATORS]),
        ),
      )
      .orderBy(desc(transaction.createdAt))
      .limit(30),
    db
      .select({
        id: fundRequest.id,
        amount: fundRequest.amount,
        remarks: fundRequest.remarks,
        status: fundRequest.status,
        createdAt: fundRequest.createdAt,
      })
      .from(fundRequest)
      .where(eq(fundRequest.retailerId, retailer.id))
      .orderBy(desc(fundRequest.createdAt))
      .limit(30),
  ]);

  const history = [
    ...walletTx.map((row) => ({
      id: row.id,
      kind: "transaction" as const,
      title: row.operator,
      subtitle: row.apiMessage || row.operator,
      amount: row.amount,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
    ...fundRequests.map((row) => ({
      id: row.id,
      kind: "request" as const,
      title: "Fund request",
      subtitle: row.remarks || "Awaiting distributor response",
      amount: row.amount,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Funds
        </h1>
        <p className="mt-1 text-sm text-muted">
          Request wallet funds from your distributor and track updates.
        </p>
      </div>

      <RetailerFundRequestForm />

      <AdminTableCard
        description="Wallet movements and fund request updates."
        title={`Funding history (${history.length})`}
      >
        {history.length === 0 ? (
          <AdminTableEmpty message="No funding history yet." />
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={`${item.kind}-${item.id}`}
                className="rounded-lg border border-separator p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <Chip color={statusColor(item.status)} size="sm" variant="soft">
                    {item.status}
                  </Chip>
                </div>
                <p className="mt-1 text-sm text-muted">{item.subtitle}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted">
                    {formatTableDateTime(item.createdAt)}
                  </p>
                  <Money amount={item.amount} className="text-sm font-semibold" />
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminTableCard>
    </div>
  );
}

import { and, desc, eq, inArray } from "drizzle-orm";
import { Chip, Table } from "@heroui/react";
import { fundRequest, transaction } from "@repo/db";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { Money } from "@/components/money";
import { RetailerFundRequestForm } from "@/components/retailer/retailer-fund-request-form";
import { requireRetailer } from "@/lib/retailer-auth";
import { formatEnumLabel, transactionLabel } from "@/lib/transaction-label";
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
      title: transactionLabel(row.operator, "").title,
      subtitle: null as string | null,
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
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Funding history table" className="min-w-full">
                <Table.Header>
                  <Table.Column>Date</Table.Column>
                  <Table.Column>Type</Table.Column>
                  <Table.Column>Details</Table.Column>
                  <Table.Column>Amount</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {history.map((item) => (
                    <Table.Row key={`${item.kind}-${item.id}`}>
                      <Table.Cell className="text-sm text-muted">
                        {formatTableDateTime(item.createdAt)}
                      </Table.Cell>
                      <Table.Cell>{item.title}</Table.Cell>
                      <Table.Cell className="text-muted">
                        {item.subtitle ?? "—"}
                      </Table.Cell>
                      <Table.Cell>
                        <Money amount={item.amount} className="text-sm font-semibold" />
                      </Table.Cell>
                      <Table.Cell>
                        <Chip color={statusColor(item.status)} size="sm" variant="soft">
                          {formatEnumLabel(item.status)}
                        </Chip>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </AdminTableCard>
    </div>
  );
}

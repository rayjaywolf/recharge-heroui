"use client";

import { useRouter } from "next/navigation";
import { Chip, Table } from "@heroui/react";

import { AdminTableCard, AdminTableEmpty } from "@/components/admin/admin-table-card";
import { Money } from "@/components/money";
import { operatorLabel } from "@/lib/transaction-label";
import { formatTableDateTime } from "@/lib/utils";

export type RetailerDisputeRow = {
  id: string;
  transactionId: string;
  subject: string;
  message: string;
  status: "PENDING" | "RESOLVED";
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  transactionStatus: string;
  operator: string;
  amount: number;
  targetPhone: string;
  apiReferenceId: string | null;
};

export function RetailerDisputesTable({
  rows,
  title,
  description,
  emptyMessage,
}: {
  rows: RetailerDisputeRow[];
  title?: string;
  description?: string;
  emptyMessage?: string;
}) {
  const router = useRouter();

  return (
    <AdminTableCard
      description={description ?? "Track dispute progress and admin responses."}
      title={title ?? `Disputes (${rows.length})`}
    >
      {rows.length === 0 ? (
        <AdminTableEmpty message={emptyMessage ?? "No disputes submitted yet."} />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Retailer disputes" className="min-w-[860px]">
              <Table.Header>
                <Table.Column isRowHeader>Created</Table.Column>
                <Table.Column>Subject</Table.Column>
                <Table.Column>Info</Table.Column>
                <Table.Column>Transaction</Table.Column>
                <Table.Column>Amount</Table.Column>
                <Table.Column>Status</Table.Column>
              </Table.Header>
              <Table.Body>
                {rows.map((row) => (
                  <Table.Row
                    key={row.id}
                    className="align-top cursor-pointer hover:bg-default/40"
                    onAction={() => router.push(`/retailer/support/${row.id}`)}
                  >
                    <Table.Cell className="whitespace-nowrap text-sm text-muted">
                      {formatTableDateTime(row.createdAt)}
                    </Table.Cell>
                    <Table.Cell className="max-w-[220px] text-sm font-medium text-foreground">
                      <span className="block truncate" title={row.subject}>
                        {row.subject}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="max-w-[220px] text-sm text-muted">
                      {operatorLabel(row.operator)}, {row.targetPhone}
                    </Table.Cell>
                    <Table.Cell className="font-mono text-xs text-muted">
                      {row.transactionId}
                    </Table.Cell>
                    <Table.Cell>
                      <Money amount={row.amount} className="text-sm text-foreground" />
                    </Table.Cell>
                    <Table.Cell>
                      <Chip
                        color={row.status === "RESOLVED" ? "success" : "warning"}
                        size="sm"
                        variant="soft"
                      >
                        {row.status}
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
  );
}

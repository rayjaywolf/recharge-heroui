"use client";

import { Chip, Table } from "@heroui/react";
import { useRouter } from "next/navigation";

import { AdminTableCard, AdminTableEmpty } from "@/components/admin/admin-table-card";
import { Money } from "@/components/money";
import { operatorLabel } from "@/lib/transaction-label";
import { formatTableDateTime } from "@/lib/utils";

export type AdminDisputeRow = {
  id: string;
  retailerId: string;
  retailerName: string;
  transactionId: string;
  subject: string;
  status: "PENDING" | "RESOLVED";
  createdAt: string;
  resolvedAt: string | null;
  operator: string;
  amount: number;
  targetPhone: string;
};

export function AdminDisputesTable({ initialRows }: { initialRows: AdminDisputeRow[] }) {
  return (
    <AdminDisputesTableCard
      description="Review disputes submitted by retailers/distributor network."
      initialRows={initialRows}
      title={`Disputes (${initialRows.length})`}
    />
  );
}

export function AdminDisputesTableCard({
  initialRows,
  title,
  description,
}: {
  initialRows: AdminDisputeRow[];
  title: string;
  description: string;
}) {
  const router = useRouter();
  const rows = initialRows;

  return (
    <AdminTableCard
      description={description}
      title={title}
    >
      {rows.length === 0 ? (
        <AdminTableEmpty message="No disputes yet." />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Admin disputes" className="min-w-[980px]">
              <Table.Header>
                <Table.Column isRowHeader>Created</Table.Column>
                <Table.Column>Retailer</Table.Column>
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
                    onAction={() => router.push(`/admin/support/${row.id}`)}
                  >
                    <Table.Cell className="whitespace-nowrap text-sm text-muted">
                      {formatTableDateTime(row.createdAt)}
                    </Table.Cell>
                    <Table.Cell className="text-sm font-medium text-foreground">
                      {row.retailerName}
                    </Table.Cell>
                    <Table.Cell className="max-w-[220px] text-sm font-medium text-foreground">
                      {row.subject}
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

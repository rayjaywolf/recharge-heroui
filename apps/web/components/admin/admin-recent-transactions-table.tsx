"use client";

import { useRouter } from "next/navigation";
import { Table } from "@heroui/react";

import { AdminTableEmpty } from "@/components/admin/admin-table-card";
import { TransactionStatusChip } from "@/components/admin/transaction-status-chip";
import { Money } from "@/components/money";
import { operatorLabel } from "@/lib/transaction-label";
import { formatTableDateTime } from "@/lib/utils";

export type AdminRecentTransactionRow = {
  id: string;
  createdAt: Date;
  operator: string;
  targetPhone: string;
  amount: number;
  status: string;
  userName: string;
};

export function AdminRecentTransactionsTable({
  rows,
}: {
  rows: AdminRecentTransactionRow[];
}) {
  const router = useRouter();

  if (rows.length === 0) {
    return <AdminTableEmpty message="No recent API transactions found." />;
  }

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Recent transactions"
          className="min-w-[640px]"
        >
          <Table.Header>
            <Table.Column isRowHeader>Time</Table.Column>
            <Table.Column>User</Table.Column>
            <Table.Column>Carrier</Table.Column>
            <Table.Column>Phone</Table.Column>
            <Table.Column>Amount</Table.Column>
            <Table.Column>Status</Table.Column>
          </Table.Header>
          <Table.Body>
            {rows.map((tx) => (
              <Table.Row
                key={tx.id}
                className="cursor-pointer whitespace-nowrap"
                onAction={() => router.push(`/admin/transactions/${tx.id}`)}
              >
                <Table.Cell className="whitespace-nowrap text-sm text-muted">
                  {formatTableDateTime(tx.createdAt)}
                </Table.Cell>
                <Table.Cell className="font-medium">{tx.userName}</Table.Cell>
                <Table.Cell>{operatorLabel(tx.operator)}</Table.Cell>
                <Table.Cell className="font-mono text-sm text-muted">
                  {tx.targetPhone}
                </Table.Cell>
                <Table.Cell className="font-semibold">
                  <Money amount={tx.amount} />
                </Table.Cell>
                <Table.Cell>
                  <TransactionStatusChip status={tx.status} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

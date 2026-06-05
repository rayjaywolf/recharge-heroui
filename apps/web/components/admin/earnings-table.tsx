"use client";

import { Table } from "@heroui/react";

import { AdminTableEmpty } from "@/components/admin/admin-table-card";
import type { EarningRow } from "@/components/admin/earnings-download-button";
import { TransactionStatusChip } from "@/components/admin/transaction-status-chip";
import { Money } from "@/components/money";
import { operatorLabel } from "@/lib/transaction-label";
import { formatTableDateTime } from "@/lib/utils";

export function AdminEarningsTable({ rows }: { rows: EarningRow[] }) {
  if (rows.length === 0) {
    return <AdminTableEmpty message="No earnings match your filters." />;
  }

  return (
    <Table>
      <Table.ScrollContainer className="max-h-[min(70vh,720px)]">
        <Table.Content
          aria-label="Platform earnings"
          className="min-w-[800px]"
        >
          <Table.Header>
            <Table.Column isRowHeader>Date & time</Table.Column>
            <Table.Column>Retailer</Table.Column>
            <Table.Column>Operator</Table.Column>
            <Table.Column>Status</Table.Column>
            <Table.Column className="text-right">Recharge amount</Table.Column>
            <Table.Column className="text-right">Platform cut</Table.Column>
          </Table.Header>
          <Table.Body>
            {rows.map((tx) => (
              <Table.Row key={tx.id} className="whitespace-nowrap">
                <Table.Cell className="whitespace-nowrap text-sm text-muted">
                  {formatTableDateTime(tx.createdAt)}
                </Table.Cell>
                <Table.Cell className="font-medium">{tx.user.name}</Table.Cell>
                <Table.Cell>{operatorLabel(tx.operator)}</Table.Cell>
                <Table.Cell>
                  <TransactionStatusChip status={tx.status} />
                </Table.Cell>
                <Table.Cell className="text-right">
                  <Money amount={tx.amount} fractionDigits={0} />
                </Table.Cell>
                <Table.Cell className="text-right font-semibold">
                  <Money
                    amount={tx.commission}
                    className="text-success"
                    sign="+"
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

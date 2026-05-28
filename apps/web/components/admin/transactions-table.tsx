"use client";

import { useRouter } from "next/navigation";
import {
  Table,
} from "@heroui/react";

import { AdminTableEmpty } from "@/components/admin/admin-table-card";
import { TransactionStatusChip } from "@/components/admin/transaction-status-chip";
import { TransactionPdfDownloadButton } from "@/components/admin/transaction-pdf-download-button";
import { Money } from "@/components/money";
import { formatRechargeProvider } from "@/lib/recharge-provider";
import { formatTableDateTime } from "@/lib/utils";

export type AdminTransactionRow = {
  id: string;
  userId: string;
  targetPhone: string;
  operator: string;
  amount: number;
  circleCode: string | null;
  provider: string;
  status: string;
  apiReferenceId: string | null;
  apiMessage: string | null;
  idempotencyKey: string | null;
  retailerCommission: number;
  distributorCommission: number;
  adminCommission: number;
  createdAt: string;
  updatedAt: string;
  /** Recharger (transaction owner) role — for distributor self-recharge UI. */
  userRole: string;
  /** Recharger's `user.distributorId` (null = top-level distributor). */
  rechargerDistributorId: string | null;
  user: {
    name: string;
    email: string;
    phoneNumber: string | null;
    whatsappNumber: string | null;
  };
};

export function TransactionsTable({
  transactions,
}: {
  transactions: AdminTransactionRow[];
}) {
  const router = useRouter();

  if (transactions.length === 0) {
    return (
      <AdminTableEmpty message="No transactions match your filters." />
    );
  }

  return (
    <>
      <Table>
          <Table.ScrollContainer className="max-h-[min(70vh,720px)]">
            <Table.Content
              aria-label="Transactions ledger"
              className="min-w-[1200px]"
            >
              <Table.Header>
                <Table.Column isRowHeader>Date & time</Table.Column>
                <Table.Column>Retailer</Table.Column>
                <Table.Column>Carrier</Table.Column>
                <Table.Column>Phone</Table.Column>
                <Table.Column>Amount</Table.Column>
                <Table.Column>API</Table.Column>
                <Table.Column>Status</Table.Column>
                <Table.Column className="min-w-[280px]">Ref ID</Table.Column>
                <Table.Column className="w-[72px]">PDF</Table.Column>
              </Table.Header>
              <Table.Body>
                {transactions.map((tx) => (
                  <Table.Row
                    key={tx.id}
                    className="cursor-pointer whitespace-nowrap"
                    onAction={() => router.push(`/admin/transactions/${tx.id}`)}
                  >
                    <Table.Cell className="text-sm text-muted">
                      {formatTableDateTime(tx.createdAt)}
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block max-w-[120px] truncate font-semibold">
                        {tx.user.name}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="font-semibold">
                      {tx.operator}
                    </Table.Cell>
                    <Table.Cell className="font-mono text-xs text-muted">
                      {tx.targetPhone}
                    </Table.Cell>
                    <Table.Cell className="font-semibold">
                      <Money amount={tx.amount} />
                    </Table.Cell>
                    <Table.Cell>
                      {formatRechargeProvider(tx.provider)}
                    </Table.Cell>
                    <Table.Cell>
                      <TransactionStatusChip status={tx.status} />
                    </Table.Cell>
                    <Table.Cell className="font-mono text-xs text-muted">
                      {tx.apiReferenceId || tx.id}
                    </Table.Cell>
                    <Table.Cell>
                      <div
                        className="inline-flex"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <TransactionPdfDownloadButton transaction={tx} />
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
      </Table>
    </>
  );
}

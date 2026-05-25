"use client";

import { useState, type ReactNode } from "react";
import {
  Button,
  Chip,
  Modal,
  Surface,
  Table,
  useOverlayState,
} from "@heroui/react";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { TransactionStatusChip } from "@/components/admin/transaction-status-chip";
import { TransactionPdfDownloadButton } from "@/components/admin/transaction-pdf-download-button";
import { Money } from "@/components/money";
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone";
import { formatRechargeProvider } from "@/lib/recharge-provider";

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
  user: {
    name: string;
    email: string;
    phoneNumber: string | null;
    whatsappNumber: string | null;
  };
};

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={`text-sm break-all ${mono ? "font-mono text-xs" : "font-medium text-foreground"}`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function TransactionsTable({
  transactions,
}: {
  transactions: AdminTransactionRow[];
}) {
  const [selected, setSelected] = useState<AdminTransactionRow | null>(null);
  const modalState = useOverlayState();

  const openDetails = (tx: AdminTransactionRow) => {
    setSelected(tx);
    modalState.open();
  };

  const closeDetails = () => {
    modalState.close();
    setSelected(null);
  };

  if (transactions.length === 0) {
    return (
      <AdminTableCard>
        <AdminTableEmpty message="No transactions match your filters." />
      </AdminTableCard>
    );
  }

  return (
    <>
      <AdminTableCard>
        <Table>
          <Table.ScrollContainer className="max-h-[min(70vh,720px)]">
            <Table.Content
              aria-label="Transactions ledger"
              className="min-w-[1200px]"
            >
              <Table.Header>
                <Table.Column isRowHeader>Date</Table.Column>
                <Table.Column>Time</Table.Column>
                <Table.Column>Retailer</Table.Column>
                <Table.Column>Contact</Table.Column>
                <Table.Column>Carrier</Table.Column>
                <Table.Column>Phone</Table.Column>
                <Table.Column>Amount</Table.Column>
                <Table.Column>API</Table.Column>
                <Table.Column>Status</Table.Column>
                <Table.Column className="min-w-[240px]">Ref ID</Table.Column>
                <Table.Column className="w-[72px]">PDF</Table.Column>
              </Table.Header>
              <Table.Body>
                {transactions.map((tx) => (
                  <Table.Row
                    key={tx.id}
                    className="cursor-pointer"
                    onAction={() => openDetails(tx)}
                  >
                    <Table.Cell>
                      <span className="text-sm font-medium text-foreground">
                        {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="text-sm text-muted">
                      {new Date(tx.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block max-w-[120px] truncate font-semibold">
                        {tx.user.name}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block max-w-[120px] truncate text-xs text-muted">
                        {getDisplayEmail(tx.user.email) ?? "—"}
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
                    <Table.Cell className="min-w-[240px] align-top font-mono text-xs text-muted">
                      <span className="block whitespace-normal break-all leading-relaxed">
                        {tx.apiReferenceId || tx.id}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="align-top">
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
      </AdminTableCard>

      <Modal>
        <Modal.Backdrop
          isOpen={modalState.isOpen}
          onOpenChange={(open) => {
            modalState.setOpen(open);
            if (!open) setSelected(null);
          }}
        >
          <Modal.Container>
            <Modal.Dialog className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <Modal.CloseTrigger />
              {selected ? (
                <>
                  <Modal.Header>
                    <Modal.Heading>Transaction details</Modal.Heading>
                    <p className="mt-1 text-sm text-muted">
                      Recharge to {selected.targetPhone}
                    </p>
                  </Modal.Header>

                  <Modal.Body className="space-y-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <TransactionStatusChip status={selected.status} />
                      <Chip size="md" variant="secondary">
                        <Money amount={selected.amount} />
                      </Chip>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <DetailItem
                        label="Transaction ID"
                        mono
                        value={selected.id}
                      />
                      <DetailItem
                        label="Date & time"
                        value={formatDateTime(selected.createdAt)}
                      />
                      <DetailItem
                        label="API gateway"
                        value={formatRechargeProvider(selected.provider)}
                      />
                      <DetailItem label="Carrier" value={selected.operator} />
                      <DetailItem
                        label="Recharge phone"
                        mono
                        value={selected.targetPhone}
                      />
                      <DetailItem
                        label="Circle code"
                        value={selected.circleCode}
                      />
                      <DetailItem
                        label="Reference ID"
                        mono
                        value={selected.apiReferenceId}
                      />
                    </div>

                    <Surface className="space-y-3 p-4" variant="tertiary">
                      <p className="text-sm font-semibold text-foreground">
                        Retailer
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DetailItem label="Name" value={selected.user.name} />
                        <DetailItem
                          label="Phone"
                          value={getDisplayPhone(selected.user)}
                        />
                        <DetailItem
                          label="Email"
                          value={getDisplayEmail(selected.user.email)}
                        />
                        <DetailItem label="User ID" mono value={selected.userId} />
                      </div>
                    </Surface>

                    <Surface className="space-y-3 p-4" variant="tertiary">
                      <p className="text-sm font-semibold text-foreground">
                        Commissions
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <DetailItem
                          label="Retailer"
                          value={<Money amount={selected.retailerCommission} />}
                        />
                        <DetailItem
                          label="Distributor"
                          value={<Money amount={selected.distributorCommission} />}
                        />
                        <DetailItem
                          label="Admin"
                          value={<Money amount={selected.adminCommission} />}
                        />
                      </div>
                    </Surface>

                    <div className="grid gap-4">
                      <DetailItem
                        label="API message"
                        value={selected.apiMessage || "—"}
                      />
                      <DetailItem
                        label="Idempotency key"
                        mono
                        value={selected.idempotencyKey}
                      />
                      <DetailItem
                        label="Last updated"
                        value={formatDateTime(selected.updatedAt)}
                      />
                    </div>
                  </Modal.Body>

                  <Modal.Footer className="flex flex-wrap gap-2">
                    <TransactionPdfDownloadButton
                      showLabel
                      size="md"
                      transaction={selected}
                    />
                    <Button slot="close" variant="secondary" onPress={closeDetails}>
                      Close
                    </Button>
                  </Modal.Footer>
                </>
              ) : null}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

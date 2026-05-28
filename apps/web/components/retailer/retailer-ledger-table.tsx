"use client";

import { useState, type ReactNode } from "react";
import { Button, Chip, Modal, Surface, Table, useOverlayState } from "@heroui/react";

import { AdminTableEmpty } from "@/components/admin/admin-table-card";
import { TransactionStatusChip } from "@/components/admin/transaction-status-chip";
import { TransactionPdfDownloadButton } from "@/components/admin/transaction-pdf-download-button";
import type { AdminTransactionRow } from "@/components/admin/transactions-table";
import { Money } from "@/components/money";
import { formatTableDateTime } from "@/lib/utils";

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
      <p className={`text-sm break-all ${mono ? "font-mono text-xs" : "font-medium text-foreground"}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

export function RetailerLedgerTable({
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
    return <AdminTableEmpty message="No ledger history records found." />;
  }

  return (
    <>
      <Table>
        <Table.ScrollContainer className="max-h-[min(70vh,720px)]">
          <Table.Content aria-label="Retailer ledger" className="min-w-[960px]">
            <Table.Header>
              <Table.Column isRowHeader>Date & time</Table.Column>
              <Table.Column>Type</Table.Column>
              <Table.Column>Phone</Table.Column>
              <Table.Column>Amount</Table.Column>
              <Table.Column>Status</Table.Column>
              <Table.Column className="min-w-[280px]">Ref ID</Table.Column>
              <Table.Column className="w-[72px]">PDF</Table.Column>
            </Table.Header>
            <Table.Body>
              {transactions.map((tx) => (
                <Table.Row
                  key={tx.id}
                  className="cursor-pointer whitespace-nowrap"
                  onAction={() => openDetails(tx)}
                >
                  <Table.Cell className="text-sm text-muted">
                    {formatTableDateTime(tx.createdAt)}
                  </Table.Cell>
                  <Table.Cell className="font-semibold">{tx.operator}</Table.Cell>
                  <Table.Cell className="font-mono text-xs text-muted">
                    {tx.targetPhone || "—"}
                  </Table.Cell>
                  <Table.Cell className="font-semibold">
                    <Money amount={tx.amount} />
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
                      {selected.targetPhone
                        ? `Activity for ${selected.targetPhone}`
                        : selected.operator}
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
                      <DetailItem label="Transaction ID" mono value={selected.id} />
                      <DetailItem
                        label="Date & time"
                        value={formatDateTime(selected.createdAt)}
                      />
                      <DetailItem label="Type" value={selected.operator} />
                      <DetailItem
                        label="Phone"
                        mono
                        value={selected.targetPhone}
                      />
                      <DetailItem label="Circle code" value={selected.circleCode} />
                      <DetailItem
                        label="Reference ID"
                        mono
                        value={selected.apiReferenceId}
                      />
                    </div>

                    {selected.retailerCommission > 0 ? (
                      <Surface className="space-y-3 p-4" variant="tertiary">
                        <p className="text-sm font-semibold text-foreground">
                          Commission
                        </p>
                        <DetailItem
                          label="Your margin"
                          value={
                            selected.amount > 0
                              ? `${((selected.retailerCommission / selected.amount) * 100).toFixed(2)}%`
                              : "—"
                          }
                        />
                        <DetailItem
                          label="Your earnings"
                          value={<Money amount={selected.retailerCommission} />}
                        />
                      </Surface>
                    ) : null}

                    <div className="grid gap-4">
                      <DetailItem
                        label="Last updated"
                        value={formatDateTime(selected.updatedAt)}
                      />
                    </div>
                  </Modal.Body>

                  <Modal.Footer className="flex flex-wrap gap-2">
                    <TransactionPdfDownloadButton
                      mode="retailer"
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

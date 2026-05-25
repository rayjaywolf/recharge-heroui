import { asc, desc, eq, inArray } from "drizzle-orm";
import { Chip, Table } from "@heroui/react";
import { db, transaction, user } from "@repo/db";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { Money } from "@/components/money";
import { FundingControls } from "@/components/admin/funding-controls";
import {
  FundingDownloadButton,
  type FundingLedgerRow,
} from "@/components/admin/funding-download-button";
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone";

export default async function AdminFundingPage() {
  const usersList = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      whatsappNumber: user.whatsappNumber,
      balance: user.balance,
      role: user.role,
    })
    .from(user)
    .where(inArray(user.role, ["RETAILER", "DISTRIBUTOR"]))
    .orderBy(asc(user.name));

  const bankLedger = await db
    .select({
      id: transaction.id,
      createdAt: transaction.createdAt,
      amount: transaction.amount,
      operator: transaction.operator,
      apiMessage: transaction.apiMessage,
      userName: user.name,
      userEmail: user.email,
      userPhoneNumber: user.phoneNumber,
      userWhatsappNumber: user.whatsappNumber,
    })
    .from(transaction)
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(inArray(transaction.operator, ["MANUAL_CREDIT", "MANUAL_DEBIT"]))
    .orderBy(desc(transaction.createdAt));

  const rows: FundingLedgerRow[] = bankLedger.map((tx) => ({
    id: tx.id,
    createdAt: tx.createdAt.toISOString(),
    amount: tx.amount,
    operator: tx.operator,
    apiMessage: tx.apiMessage,
    user: {
      name: tx.userName,
      email: tx.userEmail,
      phoneNumber: tx.userPhoneNumber,
      whatsappNumber: tx.userWhatsappNumber,
    },
  }));

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Funding
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage user balances and funding operations.
        </p>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="min-w-0">
          <FundingControls users={usersList} />
        </div>

        <AdminTableCard
          description="Manual credits and debits applied by administrators."
          headerAction={<FundingDownloadButton data={rows} />}
          title="Funding history"
        >
          {rows.length === 0 ? (
            <AdminTableEmpty message="No funding actions recorded yet." />
          ) : (
            <Table>
              <Table.ScrollContainer className="max-h-[min(70vh,720px)]">
                <Table.Content
                  aria-label="Funding history"
                  className="min-w-[720px]"
                >
                  <Table.Header>
                    <Table.Column isRowHeader>Time</Table.Column>
                    <Table.Column>User</Table.Column>
                    <Table.Column>Phone</Table.Column>
                    <Table.Column>Email</Table.Column>
                    <Table.Column>Action</Table.Column>
                    <Table.Column>Notes</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {rows.map((tx) => {
                      const isCredit = tx.operator === "MANUAL_CREDIT";

                      return (
                        <Table.Row key={tx.id}>
                          <Table.Cell>
                            <div className="flex flex-col text-sm">
                              <span className="text-foreground">
                                {new Date(tx.createdAt).toLocaleDateString("en-IN")}
                              </span>
                              <span className="text-xs text-muted">
                                {new Date(tx.createdAt).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </Table.Cell>
                          <Table.Cell className="max-w-[140px] truncate font-medium">
                            {tx.user.name}
                          </Table.Cell>
                          <Table.Cell className="max-w-[120px] truncate text-sm text-muted">
                            {getDisplayPhone(tx.user) ?? "—"}
                          </Table.Cell>
                          <Table.Cell className="max-w-[160px] truncate text-sm text-muted">
                            {getDisplayEmail(tx.user.email) ?? "—"}
                          </Table.Cell>
                          <Table.Cell>
                            <Chip
                              color={isCredit ? "success" : "danger"}
                              size="sm"
                              variant="soft"
                            >
                              {isCredit ? "+" : "−"}
                              <Money amount={tx.amount} />
                            </Chip>
                          </Table.Cell>
                          <Table.Cell className="max-w-[180px] truncate text-xs text-muted">
                            <span title={tx.apiMessage || "No remarks"}>
                              {tx.apiMessage || "No remarks"}
                            </span>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </AdminTableCard>
      </div>
    </div>
  );
}

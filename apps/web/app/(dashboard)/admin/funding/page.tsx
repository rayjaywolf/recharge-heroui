import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { Chip, Table } from "@heroui/react";
import { db, fundRequest, transaction, user } from "@repo/db";

import { AdminFundRequestsTable } from "@/components/admin/admin-fund-requests-table";
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
import { getDisplayPhone } from "@/lib/phone";
import { formatTableDateTime } from "@/lib/utils";

export default async function AdminFundingPage() {
  const usersListRaw = await db
    .select({
      id: user.id,
      name: user.name,
      storeName: user.storeName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      whatsappNumber: user.whatsappNumber,
      balance: user.balance,
      role: user.role,
    })
    .from(user)
    .where(inArray(user.role, ["RETAILER", "DISTRIBUTOR"]));

  const usersList = usersListRaw
    .map((u) => ({
      ...u,
      name: u.storeName || u.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const bankLedger = await db
    .select({
      id: transaction.id,
      createdAt: transaction.createdAt,
      amount: transaction.amount,
      operator: transaction.operator,
      apiMessage: transaction.apiMessage,
      userName: user.name,
      userStoreName: user.storeName,
      userEmail: user.email,
      userPhoneNumber: user.phoneNumber,
      userWhatsappNumber: user.whatsappNumber,
    })
    .from(transaction)
    .innerJoin(user, eq(transaction.userId, user.id))
    .where(inArray(transaction.operator, ["MANUAL_CREDIT", "MANUAL_DEBIT"]))
    .orderBy(desc(transaction.createdAt));

  const pendingDirectRequests = await db
    .select({
      id: fundRequest.id,
      amount: fundRequest.amount,
      remarks: fundRequest.remarks,
      createdAt: fundRequest.createdAt,
      retailerName: user.name,
      retailerStoreName: user.storeName,
    })
    .from(fundRequest)
    .innerJoin(user, eq(fundRequest.retailerId, user.id))
    .where(
      and(
        isNull(fundRequest.distributorId),
        eq(fundRequest.status, "PENDING"),
      ),
    )
    .orderBy(desc(fundRequest.createdAt));

  const rows: FundingLedgerRow[] = bankLedger.map((tx) => ({
    id: tx.id,
    createdAt: tx.createdAt.toISOString(),
    amount: tx.amount,
    operator: tx.operator,
    apiMessage: tx.apiMessage,
    user: {
      name: tx.userStoreName || tx.userName,
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

      <AdminFundRequestsTable
        requests={pendingDirectRequests.map((request) => ({
          id: request.id,
          retailerName: request.retailerStoreName || request.retailerName,
          amount: request.amount,
          remarks: request.remarks,
          createdAt: request.createdAt.toISOString(),
        }))}
      />

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
                    <Table.Column>Action</Table.Column>
                    <Table.Column>Notes</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {rows.map((tx) => {
                      const isCredit = tx.operator === "MANUAL_CREDIT";

                      return (
                        <Table.Row key={tx.id} className="whitespace-nowrap">
                          <Table.Cell className="whitespace-nowrap text-sm text-muted">
                            {formatTableDateTime(tx.createdAt)}
                          </Table.Cell>
                          <Table.Cell className="max-w-[140px] truncate font-medium">
                            {tx.user.name}
                          </Table.Cell>
                          <Table.Cell className="max-w-[120px] truncate text-sm text-muted">
                            {getDisplayPhone(tx.user) ?? "—"}
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

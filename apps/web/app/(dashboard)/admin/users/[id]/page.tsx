import { and, asc, count, eq, notInArray, sum } from "drizzle-orm";
import {
  ArrowLeft,
  ArrowRightLeft,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Card, Chip, Link as HeroLink, Table } from "@heroui/react";
import { commissionRule, db, retailerCommissionOverride, transaction, user } from "@repo/db";
import { getUserEarnings } from "@repo/server/user-earnings";
import { RECHARGE_EXCLUDED_OPERATORS } from "@/lib/transaction-filters";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import {
  RetailerCommissionOverridesTable,
  type RetailerCommissionRuleRow,
} from "@/components/admin/retailer-commission-overrides-table";
import { Money } from "@/components/money";
import { StatCard } from "@/components/admin/stat-card";
import { TransactionStatusChip } from "@/components/admin/transaction-status-chip";
import { formatInr } from "@/lib/format-money";
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone";
import { formatRechargeProvider } from "@/lib/recharge-provider";
import { transactionLabel } from "@/lib/transaction-label";
import { formatTableDateTime } from "@/lib/utils";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const found = await db.query.user.findFirst({
    where: eq(user.id, id),
    with: {
      distributor: { columns: { id: true, name: true } },
      retailers: { columns: { id: true } },
      transactions: {
        orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
        limit: 20,
      },
    },
  });

  if (!found) notFound();

  const rechargeFilter = notInArray(transaction.operator, [
    ...RECHARGE_EXCLUDED_OPERATORS,
  ]);

  const successRechargeFilter = and(
    eq(transaction.userId, id),
    eq(transaction.status, "SUCCESS"),
    rechargeFilter,
  );

  const [[volumeRow], [txCountRow], lifetimeEarnings] = await Promise.all([
    db
      .select({ total: sum(transaction.amount) })
      .from(transaction)
      .where(successRechargeFilter),
    db.select({ total: count() }).from(transaction).where(successRechargeFilter),
    getUserEarnings(db, id),
  ]);

  const allTimeVolume = Number(volumeRow?.total ?? 0);
  const transactionCount = txCountRow?.total ?? 0;

  const accountStatusLabel =
    found.accountStatus === "SUSPENDED"
      ? "Suspended"
      : found.accountStatus === "PENDING"
        ? "Pending"
        : found.accountStatus === "REJECTED"
          ? "Rejected"
          : "Active";
  const accountStatusColor =
    found.accountStatus === "SUSPENDED" || found.accountStatus === "REJECTED"
      ? "danger"
      : found.accountStatus === "PENDING"
        ? "warning"
        : "success";

  const contactPhone = getDisplayPhone(found);
  const contactEmail = getDisplayEmail(found.email);
  const memberSince = found.createdAt.toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });

  let commissionOverrideRows: RetailerCommissionRuleRow[] = [];
  if (found.role === "RETAILER") {
    const [globalRules, overrides] = await Promise.all([
      db.select().from(commissionRule).orderBy(asc(commissionRule.operator)),
      db
        .select()
        .from(retailerCommissionOverride)
        .where(eq(retailerCommissionOverride.userId, id)),
    ]);

    const overrideByOperator = new Map(
      overrides.map((row) => [row.operator, row]),
    );

    commissionOverrideRows = globalRules.map((rule) => {
      const override = overrideByOperator.get(rule.operator);
      const effective = override
        ? {
            providerMargin: override.providerMargin,
            adminMargin: override.adminMargin,
            distributorMargin: override.distributorMargin,
            retailerMargin: override.retailerMargin,
          }
        : {
            providerMargin: rule.providerMargin,
            adminMargin: rule.adminMargin,
            distributorMargin: rule.distributorMargin,
            retailerMargin: rule.retailerMargin,
          };

      return {
        operator: rule.operator,
        defaultRuleId: rule.id,
        default: {
          providerMargin: rule.providerMargin,
          adminMargin: rule.adminMargin,
          distributorMargin: rule.distributorMargin,
          retailerMargin: rule.retailerMargin,
        },
        override: override
          ? {
              id: override.id,
              providerMargin: override.providerMargin,
              adminMargin: override.adminMargin,
              distributorMargin: override.distributorMargin,
              retailerMargin: override.retailerMargin,
              updatedAt: override.updatedAt.toISOString(),
            }
          : null,
        effective,
        isOverridden: Boolean(override),
      };
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <HeroLink
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
          href="/admin/users"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to users
        </HeroLink>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {found.name}
          </h1>
          <Chip size="sm" variant="secondary">
            {found.role}
          </Chip>
          <Chip color={accountStatusColor} size="sm" variant="soft">
            {accountStatusLabel}
          </Chip>
        </div>
        <p className="mt-1 text-sm text-muted">
          Account overview and recent activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Available wallet balance"
          icon={Wallet}
          title="Balance"
          value={formatInr(found.balance)}
        />
        <StatCard
          description="Lifetime commission earnings"
          icon={Wallet}
          title="Earnings"
          value={formatInr(lifetimeEarnings, { fractionDigits: 2 })}
        />
        <StatCard
          description={`All-time volume with ${transactionCount} transactions`}
          icon={ArrowRightLeft}
          title="Volume"
          value={formatInr(allTimeVolume)}
        />
        {found.role === "DISTRIBUTOR" ? (
          <StatCard
            description="Retailers under this distributor"
            icon={Users}
            title="Retailers"
            value={String(found.retailers.length)}
          />
        ) : (
          <StatCard
            description={
              found.accountStatus === "SUSPENDED"
                ? "Access blocked"
                : "Account in good standing"
            }
            highlight={found.accountStatus === "SUSPENDED" ? "danger" : "default"}
            icon={ShieldAlert}
            title="Status"
            value={found.accountStatus === "SUSPENDED" ? "Suspended" : "Active"}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card variant="default">
          <Card.Header>
            <Card.Title>Contact</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-muted">Phone</p>
              <p className="font-medium text-foreground">{contactPhone ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Email</p>
              <p className="font-medium text-foreground">{contactEmail ?? "—"}</p>
            </div>
            {found.whatsappNumber ? (
              <div>
                <p className="text-xs font-medium text-muted">WhatsApp</p>
                <p className="font-medium text-foreground">{found.whatsappNumber}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-medium text-muted">Member since</p>
              <p className="font-medium text-foreground">{memberSince}</p>
            </div>
          </Card.Content>
        </Card>

        <Card variant="default">
          <Card.Header>
            <Card.Title>Profile</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-3 text-sm">
            {found.role === "RETAILER" && found.distributor ? (
              <div>
                <p className="text-xs font-medium text-muted">Distributor</p>
                <HeroLink
                  className="font-medium"
                  href={`/admin/users/${found.distributor.id}`}
                >
                  {found.distributor.name}
                </HeroLink>
              </div>
            ) : null}
            {found.address ? (
              <div>
                <p className="text-xs font-medium text-muted">Address</p>
                <p className="font-medium text-foreground">{found.address}</p>
              </div>
            ) : null}
            {found.state || found.pincode ? (
              <div>
                <p className="text-xs font-medium text-muted">Location</p>
                <p className="font-medium text-foreground">
                  {[found.state, found.pincode].filter(Boolean).join(" · ")}
                </p>
              </div>
            ) : null}
            {found.storeName ? (
              <div>
                <p className="text-xs font-medium text-muted">Store name</p>
                <p className="font-medium text-foreground">{found.storeName}</p>
              </div>
            ) : null}
            {found.businessType ? (
              <div>
                <p className="text-xs font-medium text-muted">Business type</p>
                <p className="font-medium text-foreground">{found.businessType}</p>
              </div>
            ) : null}
            {found.panNumber ? (
              <div>
                <p className="text-xs font-medium text-muted">PAN</p>
                <p className="font-mono text-xs text-foreground">{found.panNumber}</p>
              </div>
            ) : null}
            {found.gstNumber ? (
              <div>
                <p className="text-xs font-medium text-muted">GST</p>
                <p className="font-mono text-xs text-foreground">{found.gstNumber}</p>
              </div>
            ) : null}
            {!found.distributor &&
            !found.address &&
            !found.state &&
            !found.pincode &&
            !found.businessType &&
            !found.panNumber &&
            !found.gstNumber ? (
              <p className="text-muted">No additional profile details on file.</p>
            ) : null}
          </Card.Content>
        </Card>
      </div>

      {found.role === "RETAILER" ? (
        <RetailerCommissionOverridesTable
          initialRules={commissionOverrideRows}
          retailerId={found.id}
          retailerName={found.storeName || found.name}
        />
      ) : null}

      <AdminTableCard
        description="Latest wallet and recharge activity for this user."
        headerAction={
          contactPhone || found.name ? (
            <HeroLink
              className="text-sm font-medium"
              href={`/admin/transactions?search=${encodeURIComponent(contactPhone ?? found.name)}`}
            >
              View in ledger
            </HeroLink>
          ) : undefined
        }
        title="Recent transactions"
      >
        {found.transactions.length === 0 ? (
          <AdminTableEmpty message="No transactions for this user yet." />
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content
                aria-label="User transactions"
                className="min-w-[720px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Date</Table.Column>
                  <Table.Column>Type</Table.Column>
                  <Table.Column>Amount</Table.Column>
                  <Table.Column>API</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column>Reference</Table.Column>
                </Table.Header>
                <Table.Body>
                  {found.transactions.map((tx) => {
                    const label = transactionLabel(tx.operator, tx.targetPhone);

                    return (
                      <Table.Row key={tx.id} className="whitespace-nowrap">
                        <Table.Cell className="whitespace-nowrap text-sm text-muted">
                          {formatTableDateTime(tx.createdAt)}
                        </Table.Cell>
                        <Table.Cell className="max-w-[220px]">
                          <span
                            className="block truncate text-sm font-semibold"
                            title={
                              label.sub
                                ? `${label.title} · ${label.sub}`
                                : label.title
                            }
                          >
                            {label.sub
                              ? `${label.title} · ${label.sub}`
                              : label.title}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="font-semibold">
                          <Money amount={tx.amount} />
                        </Table.Cell>
                        <Table.Cell className="text-sm">
                          {[
                            "MANUAL_CREDIT",
                            "MANUAL_DEBIT",
                            "FUNDS_SENT",
                            "FUNDS_RECEIVED",
                          ].includes(tx.operator)
                            ? "—"
                            : formatRechargeProvider(tx.provider)}
                        </Table.Cell>
                        <Table.Cell>
                          <TransactionStatusChip status={tx.status} />
                        </Table.Cell>
                        <Table.Cell className="font-mono text-xs text-muted">
                          {tx.apiReferenceId ?? tx.id}
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
  );
}

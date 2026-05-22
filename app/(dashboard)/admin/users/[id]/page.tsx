import { ArrowLeft, User as UserIcon, Wallet, ShieldAlert, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, Chip, Link as HeroLink, Table } from "@heroui/react";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { StatCard } from "@/components/admin/stat-card";
import { TransactionStatusChip } from "@/components/admin/transaction-status-chip";
import { prisma } from "@/lib/auth";
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone";
import { formatRechargeProvider } from "@/lib/recharge-provider";

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function transactionLabel(operator: string, targetPhone: string) {
  if (operator === "MANUAL_CREDIT") {
    return { title: "Wallet top-up", sub: null as string | null };
  }
  if (operator === "MANUAL_DEBIT") {
    return { title: "Wallet debit", sub: null };
  }
  if (operator === "FUNDS_SENT") {
    return { title: "Funds sent", sub: null };
  }
  if (operator === "FUNDS_RECEIVED") {
    return { title: "Funds received", sub: null };
  }
  return { title: operator, sub: targetPhone };
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      distributor: { select: { id: true, name: true } },
      _count: { select: { transactions: true, retailers: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!user) notFound();

  const contactPhone = getDisplayPhone(user);
  const contactEmail = getDisplayEmail(user.email);
  const memberSince = user.createdAt.toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });

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
            {user.name}
          </h1>
          <Chip size="sm" variant="secondary">
            {user.role}
          </Chip>
          <Chip
            color={user.isSuspended ? "danger" : "success"}
            size="sm"
            variant="soft"
          >
            {user.isSuspended ? "Suspended" : "Active"}
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
          value={formatInr(user.balance)}
        />
        <StatCard
          description="Lifetime commission earnings"
          icon={Wallet}
          title="Earnings"
          value={formatInr(Math.round(user.earnings))}
        />
        <StatCard
          description="All-time transaction count"
          icon={UserIcon}
          title="Transactions"
          value={String(user._count.transactions)}
        />
        {user.role === "DISTRIBUTOR" ? (
          <StatCard
            description="Retailers under this distributor"
            icon={Users}
            title="Retailers"
            value={String(user._count.retailers)}
          />
        ) : (
          <StatCard
            description={user.isSuspended ? "Access blocked" : "Account in good standing"}
            highlight={user.isSuspended ? "danger" : "default"}
            icon={ShieldAlert}
            title="Status"
            value={user.isSuspended ? "Suspended" : "Active"}
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
            {user.whatsappNumber ? (
              <div>
                <p className="text-xs font-medium text-muted">WhatsApp</p>
                <p className="font-medium text-foreground">{user.whatsappNumber}</p>
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
            {user.role === "RETAILER" && user.distributor ? (
              <div>
                <p className="text-xs font-medium text-muted">Distributor</p>
                <HeroLink
                  className="font-medium"
                  href={`/admin/users/${user.distributor.id}`}
                >
                  {user.distributor.name}
                </HeroLink>
              </div>
            ) : null}
            {user.address ? (
              <div>
                <p className="text-xs font-medium text-muted">Address</p>
                <p className="font-medium text-foreground">{user.address}</p>
              </div>
            ) : null}
            {user.state || user.pincode ? (
              <div>
                <p className="text-xs font-medium text-muted">Location</p>
                <p className="font-medium text-foreground">
                  {[user.state, user.pincode].filter(Boolean).join(" · ")}
                </p>
              </div>
            ) : null}
            {user.businessType ? (
              <div>
                <p className="text-xs font-medium text-muted">Business type</p>
                <p className="font-medium text-foreground">{user.businessType}</p>
              </div>
            ) : null}
            {user.panNumber ? (
              <div>
                <p className="text-xs font-medium text-muted">PAN</p>
                <p className="font-mono text-xs text-foreground">{user.panNumber}</p>
              </div>
            ) : null}
            {user.gstNumber ? (
              <div>
                <p className="text-xs font-medium text-muted">GST</p>
                <p className="font-mono text-xs text-foreground">{user.gstNumber}</p>
              </div>
            ) : null}
            {!user.distributor &&
            !user.address &&
            !user.state &&
            !user.pincode &&
            !user.businessType &&
            !user.panNumber &&
            !user.gstNumber ? (
              <p className="text-muted">No additional profile details on file.</p>
            ) : null}
          </Card.Content>
        </Card>
      </div>

      <AdminTableCard
        description="Latest wallet and recharge activity for this user."
        headerAction={
          contactPhone || user.name ? (
            <HeroLink
              className="text-sm font-medium"
              href={`/admin/transactions?search=${encodeURIComponent(contactPhone ?? user.name)}`}
            >
              View in ledger
            </HeroLink>
          ) : undefined
        }
        title="Recent transactions"
      >
        {user.transactions.length === 0 ? (
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
                  {user.transactions.map((tx) => {
                    const label = transactionLabel(tx.operator, tx.targetPhone);

                    return (
                      <Table.Row key={tx.id}>
                        <Table.Cell className="whitespace-nowrap text-sm text-muted">
                          {tx.createdAt.toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </Table.Cell>
                        <Table.Cell>
                          <span className="block font-semibold">{label.title}</span>
                          {label.sub ? (
                            <span className="text-xs text-muted">{label.sub}</span>
                          ) : null}
                        </Table.Cell>
                        <Table.Cell className="font-semibold">
                          {formatInr(tx.amount)}
                        </Table.Cell>
                        <Table.Cell className="text-sm">
                          {["MANUAL_CREDIT", "MANUAL_DEBIT", "FUNDS_SENT", "FUNDS_RECEIVED"].includes(
                            tx.operator
                          )
                            ? "—"
                            : formatRechargeProvider(tx.provider)}
                        </Table.Cell>
                        <Table.Cell>
                          <TransactionStatusChip status={tx.status} />
                        </Table.Cell>
                        <Table.Cell className="min-w-[200px] font-mono text-xs text-muted">
                          <span className="block break-all">
                            {tx.apiReferenceId ?? tx.id}
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
  );
}

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Card, Chip } from "@heroui/react";
import { HandCoins, Users, Wallet } from "lucide-react";

import { db, user } from "@repo/db";

import { auth } from "@/lib/auth";
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone";
import { formatInr } from "@/lib/format-money";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { MpinForm } from "@/components/profile/mpin-form";

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) notFound();

  const found = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    with: {
      retailers: { columns: { id: true } },
    },
  });

  if (!found) notFound();

  const contactEmail = getDisplayEmail(found.email);
  const contactPhone = getDisplayPhone(found);

  const memberSince = found.createdAt.toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {found.name}
          </h1>
          <Chip size="sm" variant="secondary">
            {found.role}
          </Chip>
          <Chip
            color={found.accountStatus === "SUSPENDED" ? "danger" : "success"}
            size="sm"
            variant="soft"
          >
            {found.accountStatus === "SUSPENDED" ? "Suspended" : "Active"}
          </Chip>
          {found.role !== "ADMIN" ? (
            found.accountStatus === "REJECTED" ? (
              <Chip color="danger" size="sm" variant="soft">
                Rejected
              </Chip>
            ) : found.accountStatus === "PENDING" ? (
              <Chip color="warning" size="sm" variant="soft">
                Pending approval
              </Chip>
            ) : null
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted">
          Your account details and wallet summary.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card variant="default">
          <Card.Header className="flex flex-row items-center justify-between pb-0">
            <Card.Title className="text-sm font-medium text-muted">
              Balance
            </Card.Title>
            <Wallet className="size-4 text-muted" aria-hidden />
          </Card.Header>
          <Card.Content className="pt-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                {formatInr(found.balance)}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted">Available wallet balance</p>
          </Card.Content>
        </Card>

        <Card variant="default">
          <Card.Header className="flex flex-row items-center justify-between pb-0">
            <Card.Title className="text-sm font-medium text-muted">
              Earnings
            </Card.Title>
            <HandCoins className="size-4 text-muted" aria-hidden />
          </Card.Header>
          <Card.Content className="pt-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                {formatInr(Math.round(found.earnings))}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted">
              Lifetime commission earnings
            </p>
          </Card.Content>
        </Card>

        {found.role === "DISTRIBUTOR" ? (
          <Card variant="default">
            <Card.Header className="flex flex-row items-center justify-between pb-0">
              <Card.Title className="text-sm font-medium text-muted">
                Retailers
              </Card.Title>
              <Users className="size-4 text-muted" aria-hidden />
            </Card.Header>
            <Card.Content className="pt-2">
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                {found.retailers?.length ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted">
                Retailers under this distributor.
              </p>
            </Card.Content>
          </Card>
        ) : null}
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
              <p className="font-medium text-foreground">
                {contactEmail ?? "—"}
              </p>
            </div>
            {found.whatsappNumber ? (
              <div>
                <p className="text-xs font-medium text-muted">WhatsApp</p>
                <p className="font-medium text-foreground">
                  {found.whatsappNumber}
                </p>
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
            {found.businessType ? (
              <div>
                <p className="text-xs font-medium text-muted">Business type</p>
                <p className="font-medium text-foreground">{found.businessType}</p>
              </div>
            ) : null}
            {found.distributorId ? (
              <div>
                <p className="text-xs font-medium text-muted">
                  Distributor ID
                </p>
                <p className="font-mono text-xs text-foreground">
                  {found.distributorId}
                </p>
              </div>
            ) : null}
            {!found.address &&
            !found.state &&
            !found.pincode &&
            !found.businessType &&
            !found.distributorId ? (
              <p className="text-muted">No additional profile details on file.</p>
            ) : null}
          </Card.Content>
        </Card>
      </div>

      <ProfileSettingsForm currentName={found.name} />

      {found.role !== "ADMIN" ? (
        <Card variant="default">
          <Card.Header>
            <Card.Title>MPIN</Card.Title>
            <Card.Description>
              Set or change your 4-digit MPIN. Your account password is required.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <MpinForm submitLabel="Update MPIN" />
          </Card.Content>
        </Card>
      ) : null}
    </div>
  );
}


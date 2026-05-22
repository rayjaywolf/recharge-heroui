"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Chip, Table, toast } from "@heroui/react";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone";

export type PendingUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  whatsappNumber: string | null;
  aadharNumber: string | null;
  panNumber: string | null;
  gstNumber: string | null;
  businessType: string | null;
  address: string | null;
  pincode: string | null;
  state: string | null;
  createdAt: string;
};

function formatBusinessType(type: string | null): string {
  if (!type) return "N/A";
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function ApprovalsTable({ initialData }: { initialData: PendingUser[] }) {
  const [data, setData] = useState(initialData);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  const handleApprove = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Approval failed");

      setData((prev) => prev.filter((u) => u.id !== userId));
      toast(resJson.message || "User approved successfully.", {
        variant: "success",
      });
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error approving user", {
        variant: "danger",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/users/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Rejection failed");

      setData((prev) => prev.filter((u) => u.id !== userId));
      toast(resJson.message || "User rejected.", { variant: "default" });
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error rejecting user", {
        variant: "danger",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (data.length === 0) {
    return (
      <AdminTableCard>
        <AdminTableEmpty message="No pending approvals." />
      </AdminTableCard>
    );
  }

  return (
    <AdminTableCard>
      <Table>
        <Table.ScrollContainer>
        <Table.Content
          aria-label="Pending approvals"
          className="min-w-[960px]"
        >
          <Table.Header>
            <Table.Column isRowHeader>Applicant</Table.Column>
            <Table.Column>Phone</Table.Column>
            <Table.Column>Email</Table.Column>
            <Table.Column>Business / location</Table.Column>
            <Table.Column>KYC</Table.Column>
            <Table.Column>Role</Table.Column>
            <Table.Column className="text-end">Actions</Table.Column>
          </Table.Header>
          <Table.Body>
            {data.map((user) => {
              const phone = getDisplayPhone(user);
              const displayEmail = getDisplayEmail(user.email);
              const isBusy = busyId === user.id;

              return (
                <Table.Row key={user.id}>
                  <Table.Cell className="font-semibold">{user.name}</Table.Cell>
                  <Table.Cell className="text-sm text-muted">
                    {phone ?? "—"}
                  </Table.Cell>
                  <Table.Cell className="text-sm text-muted">
                    {displayEmail ?? "—"}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="font-medium text-foreground">
                      {formatBusinessType(user.businessType)}
                    </div>
                    {user.address ? (
                      <div className="line-clamp-1 text-sm text-muted">
                        {user.address}
                      </div>
                    ) : null}
                    <div className="text-xs text-muted">
                      {[user.pincode, user.state].filter(Boolean).join(" · ") ||
                        "—"}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="space-y-0.5 font-mono text-xs text-muted">
                      <div>PAN: {user.panNumber ?? "—"}</div>
                      <div>Aadhar: {user.aadharNumber ?? "—"}</div>
                      <div>GST: {user.gstNumber || "N/A"}</div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" variant="secondary">
                      {user.role}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        isDisabled={isBusy}
                        size="sm"
                        variant="primary"
                        onPress={() => handleApprove(user.id)}
                      >
                        <CheckCircle2 className="size-4" aria-hidden />
                        Approve
                      </Button>
                      <Button
                        isDisabled={isBusy}
                        size="sm"
                        variant="danger"
                        onPress={() => handleReject(user.id)}
                      >
                        <XCircle className="size-4" aria-hidden />
                        Reject
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
    </AdminTableCard>
  );
}

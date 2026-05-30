"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Chip } from "@heroui/react";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { Money } from "@/components/money";
import { apiFetch } from "@/lib/api-client";
import { notifyNotificationsSync } from "@/lib/notification-sync";
import { formatTableDateTime } from "@/lib/utils";

export type DistributorFundRequestRow = {
  id: string;
  retailerName: string;
  amount: number;
  remarks: string | null;
  createdAt: string;
};

export function DistributorFundRequestsTable({
  requests,
}: {
  requests: DistributorFundRequestRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/distributor/fund-requests/${id}/${action}`,
        { method: "POST" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not update fund request.");
        return;
      }
      notifyNotificationsSync();
      router.refresh();
    } catch {
      setError("Could not update fund request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminTableCard
      description="Review and respond to retailer wallet fund requests."
      title={`Pending requests (${requests.length})`}
    >
      {error ? (
        <p className="mb-3 text-sm text-danger">{error}</p>
      ) : null}
      {requests.length === 0 ? (
        <AdminTableEmpty message="No pending fund requests." />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-lg border border-separator p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {request.retailerName}
                  </p>
                  <p className="text-sm text-muted">
                    {request.remarks || "No remarks provided."}
                  </p>
                  <p className="text-xs text-muted">
                    {formatTableDateTime(request.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Money
                    amount={request.amount}
                    className="text-base font-semibold text-foreground"
                    fractionDigits={0}
                  />
                  <Chip color="warning" size="sm" variant="soft">
                    PENDING
                  </Chip>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  isDisabled={busyId !== null}
                  size="sm"
                  variant="primary"
                  onPress={() => void handleAction(request.id, "approve")}
                >
                  {busyId === request.id ? "Working…" : "Approve"}
                </Button>
                <Button
                  className="text-danger"
                  isDisabled={busyId !== null}
                  size="sm"
                  variant="secondary"
                  onPress={() => void handleAction(request.id, "reject")}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminTableCard>
  );
}

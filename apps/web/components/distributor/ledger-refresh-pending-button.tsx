"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button, toast } from "@heroui/react";

import { apiFetch } from "@/lib/api-client";

export function LedgerRefreshPendingButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/recharge/sync-pending", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not refresh pending recharges");
      }

      const { checked, updated, succeeded, failed, stillPending, errors } =
        data as {
          checked: number;
          updated: number;
          succeeded: number;
          failed: number;
          stillPending: number;
          errors?: Array<{ transactionId: string; message: string }>;
        };

      if (checked === 0) {
        toast("No pending RealRobo recharges to check.", { variant: "accent" });
      } else if (updated === 0 && (errors?.length ?? 0) === 0) {
        toast(
          `${stillPending} recharge${stillPending === 1 ? "" : "s"} still pending at RealRobo.`,
          { variant: "accent" },
        );
      } else {
        const parts: string[] = [];
        if (succeeded > 0) parts.push(`${succeeded} succeeded`);
        if (failed > 0) parts.push(`${failed} failed`);
        if (stillPending > 0) parts.push(`${stillPending} still pending`);
        toast(
          parts.length > 0
            ? `Updated ${updated} of ${checked}: ${parts.join(", ")}.`
            : `Checked ${checked} pending recharge${checked === 1 ? "" : "s"}.`,
          { variant: succeeded > 0 && failed === 0 ? "success" : "accent" },
        );
      }

      if (errors && errors.length > 0) {
        toast(
          `${errors.length} status check${errors.length === 1 ? "" : "s"} failed.`,
          { variant: "danger" },
        );
      }

      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Could not refresh pending recharges",
        { variant: "danger" },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className="gap-1.5"
      isPending={loading}
      variant="secondary"
      onPress={handleRefresh}
    >
      <RefreshCw className="size-4 shrink-0" aria-hidden />
      Refresh status
    </Button>
  );
}

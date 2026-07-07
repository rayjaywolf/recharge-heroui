"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button, toast } from "@heroui/react";

import { apiFetch } from "@/lib/api-client";

export function LedgerRefreshPendingButton({
  endpoint = "/api/recharge/sync-pending",
}: {
  endpoint?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const isRefreshingRef = useRef(false);

  const handleRefresh = async (silent = false) => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    if (!silent) setLoading(true);

    try {
      const res = await apiFetch(endpoint, {
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

      // Stop polling if there are no more pending recharges
      setHasPending(stillPending > 0);

      // Only refresh the page if transaction status actually changed
      if (updated > 0 || (errors?.length ?? 0) > 0) {
        router.refresh();
      }

      if (!silent) {
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
      }
    } catch (err) {
      if (!silent) {
        toast(
          err instanceof Error ? err.message : "Could not refresh pending recharges",
          { variant: "danger" },
        );
      }
    } finally {
      isRefreshingRef.current = false;
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // Check once immediately on mount to see if we have pending transactions
    const checkOnMount = async () => {
      try {
        const res = await apiFetch(endpoint, { method: "POST" });
        const data = await res.json();
        if (res.ok) {
          const { stillPending, updated, errors } = data as {
            stillPending: number;
            updated: number;
            errors?: Array<any>;
          };
          setHasPending(stillPending > 0);
          if (updated > 0 || (errors?.length ?? 0) > 0) {
            router.refresh();
          }
        }
      } catch (_) {
        // Ignore mount check errors
      }
    };
    void checkOnMount();
  }, [endpoint]);

  useEffect(() => {
    if (!hasPending) return;

    const interval = setInterval(() => {
      void handleRefresh(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [endpoint, hasPending]);

  return (
    <Button
      className="gap-1.5"
      isPending={loading}
      variant="secondary"
      onPress={() => handleRefresh(false)}
    >
      <RefreshCw className="size-4 shrink-0" aria-hidden />
      Refresh status
    </Button>
  );
}

"use client";

import { useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Button,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";

import { apiFetch } from "@/lib/api-client";

const STATUS_OPTIONS = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"] as const;

export function AdminTransactionDetailActions({
  transactionId,
  initialStatus,
}: {
  transactionId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await apiFetch(
        `/api/admin/transactions/${transactionId}/refresh-status`,
        {
          method: "POST",
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to refresh status.");
      toast(data?.message || "Status refreshed.", { variant: "success" });
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Unable to refresh transaction.",
        { variant: "danger" },
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualUpdate = async () => {
    if (saving) return;
    if (!status) {
      toast("Please select a status.", { variant: "warning" });
      return;
    }
    if (!message.trim()) {
      toast("Please enter a message for this status update.", {
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(
        `/api/admin/transactions/${transactionId}/manual-status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            message: message.trim(),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update status.");
      toast(data?.message || "Transaction updated.", { variant: "success" });
      router.refresh();
      setMessage("");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Unable to update transaction.",
        { variant: "danger" },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          isDisabled={refreshing}
          isLoading={refreshing}
          onPress={handleRefresh}
          startContent={<RefreshCw className="size-4" />}
          variant="secondary"
        >
          Refresh status
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          value={status ?? undefined}
          name="manualStatus"
          placeholder="Select status"
          onChange={(value) => setStatus(value != null ? String(value) : null)}
        >
          <Label>Manual status</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {STATUS_OPTIONS.map((option) => (
                <ListBox.Item id={option} key={option} textValue={option}>
                  {option}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <TextField isRequired name="manualMessage">
          <Label>Status message</Label>
          <TextArea
            placeholder="Explain why this status was updated manually..."
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </TextField>
      </div>

      <Button
        isDisabled={saving}
        isLoading={saving}
        onPress={handleManualUpdate}
        startContent={<Save className="size-4" />}
        variant="primary"
      >
        Save manual status
      </Button>
    </div>
  );
}

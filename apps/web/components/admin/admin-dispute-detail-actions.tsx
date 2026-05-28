"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { AlertDialog, Button, Label, TextArea, TextField, toast } from "@heroui/react";

import { apiFetch } from "@/lib/api-client";

export function AdminDisputeDetailActions({
  disputeId,
  isResolved,
  initialNote,
}: {
  disputeId: string;
  isResolved: boolean;
  initialNote: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleResolve = async () => {
    if (isResolved || saving) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ adminNote: note.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to resolve dispute.");
      }
      toast(data?.message || "Dispute resolved.", { variant: "success" });
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to resolve dispute.", {
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-separator p-4">
      <TextField name="adminNote">
        <Label>Resolution note</Label>
        <TextArea
          rows={4}
          placeholder="Write your internal/customer-facing resolution note..."
          value={note}
          variant="secondary"
          onChange={(e) => setNote(e.target.value)}
        />
      </TextField>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          isDisabled={isResolved || saving}
          variant="primary"
          onPress={() => setConfirmOpen(true)}
        >
          <CheckCheck className="size-4" aria-hidden />
          {isResolved
            ? "Resolved"
            : saving
              ? "Marking as resolved..."
              : "Mark as resolved"}
        </Button>
      </div>

      <AlertDialog>
        <AlertDialog.Backdrop isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-md">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="warning" />
                <AlertDialog.Heading>Mark dispute as resolved?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p className="text-sm text-muted">
                  This will close the dispute and show your note to the distributor.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button slot="close" variant="tertiary" onPress={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  isDisabled={saving}
                  variant="primary"
                  onPress={async () => {
                    setConfirmOpen(false);
                    await handleResolve();
                  }}
                >
                  Confirm resolve
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}

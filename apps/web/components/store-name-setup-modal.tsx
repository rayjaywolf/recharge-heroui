"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input, Label, Modal, Spinner, TextField, toast } from "@heroui/react";

import { apiFetch } from "@/lib/api-client";

type StoreNameSetupModalProps = {
  open: boolean;
  onCompleted?: () => void;
};

export function StoreNameSetupModal({ open, onCompleted }: StoreNameSetupModalProps) {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    const trimmed = storeName.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      toast("Store name must be between 2 and 100 characters.", { variant: "danger" });
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/profile/set-store-name", {
        method: "POST",
        body: JSON.stringify({ storeName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to set store name.");
      }

      toast("Store name set successfully.", { variant: "success" });
      onCompleted?.();
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to set store name.", {
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.Header>
              <Modal.Heading>Set your Store Name</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <p className="text-left text-sm text-muted">
                To continue using the platform, please configure your business/store name.
              </p>
              <Form onSubmit={handleSubmit}>
                <div className="space-y-4 w-full">
                  <TextField isRequired name="storeName">
                    <Label>Store/Business Name</Label>
                    <Input
                      autoFocus
                      placeholder="e.g. Rajesh Telecom"
                      value={storeName}
                      variant="secondary"
                      onChange={(e) => setStoreName(e.target.value)}
                    />
                  </TextField>
                  <Button fullWidth isDisabled={loading} type="submit" variant="primary">
                    {loading ? <Spinner size="sm" /> : null}
                    Save & Continue
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

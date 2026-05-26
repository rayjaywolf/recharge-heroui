"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Description,
  Form,
  Input,
  Label,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";

import { apiFetch } from "@/lib/api-client";

export function DistributorFundForm({
  retailerId,
  disabled,
}: {
  retailerId: string;
  disabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const isSubmitting = useRef(false);
  const router = useRouter();

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  const handleFund = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (disabled || isSubmitting.current) return;

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const remarks = String(formData.get("remarks") ?? "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      toast("Enter a valid amount.", { variant: "danger" });
      return;
    }

    isSubmitting.current = true;
    setLoading(true);

    try {
      const res = await apiFetch("/api/distributor/fund", {
        method: "POST",
        body: JSON.stringify({
          userId: retailerId,
          amount,
          remarks: remarks || undefined,
          idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to transfer funds");
      }

      toast(data.message || "Transfer successful.", { variant: "success" });
      e.currentTarget.reset();
      setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Transfer failed.", {
        variant: "danger",
      });
      setIdempotencyKey(crypto.randomUUID());
    } finally {
      isSubmitting.current = false;
      setLoading(false);
    }
  };

  return (
    <Card variant="default">
      <Card.Header>
        <Card.Title>Transfer funds</Card.Title>
        <Card.Description>
          Instantly transfer wallet balance to this retailer.
        </Card.Description>
      </Card.Header>
      <Form onSubmit={handleFund}>
        <Card.Content className="space-y-4">
          {disabled ? (
            <Description>
              Funding is disabled until this retailer is approved and active.
            </Description>
          ) : null}
          <TextField isRequired name="amount" type="number">
            <Label>Amount (₹)</Label>
            <Input
              isDisabled={disabled}
              min={1}
              placeholder="e.g. 500"
              variant="secondary"
            />
          </TextField>
          <TextField name="remarks">
            <Label>Remarks (optional)</Label>
            <Input
              isDisabled={disabled}
              placeholder="Payment reference"
              variant="secondary"
            />
          </TextField>
        </Card.Content>
        <Card.Footer className="mt-4">
          <Button
            fullWidth
            isDisabled={disabled || loading}
            type="submit"
            variant="primary"
          >
            {loading ? <Spinner size="sm" /> : null}
            Transfer funds
          </Button>
        </Card.Footer>
      </Form>
    </Card>
  );
}

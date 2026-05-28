"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Form, Input, Label, Spinner, TextField, toast } from "@heroui/react";

import { apiFetch } from "@/lib/api-client";

export function RetailerFundRequestForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get("amount"));
    const remarks = String(formData.get("remarks") ?? "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      toast("Enter a valid amount greater than zero.", { variant: "danger" });
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/retailer/fund-request", {
        method: "POST",
        body: JSON.stringify({
          amount,
          remarks: remarks || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create fund request.");
      }
      toast(data?.message || "Fund request submitted.", { variant: "success" });
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to create request.", {
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="default">
      <Card.Header>
        <Card.Title>Request funds</Card.Title>
        <Card.Description>
          Ask your distributor to add balance to your wallet.
        </Card.Description>
      </Card.Header>
      <Form onSubmit={handleSubmit}>
        <Card.Content className="space-y-4">
          <TextField isRequired name="amount" type="number">
            <Label>Amount (₹)</Label>
            <Input min={1} placeholder="e.g. 500" variant="secondary" />
          </TextField>
          <TextField name="remarks">
            <Label>Remarks (optional)</Label>
            <Input placeholder="Payment note or urgency" variant="secondary" />
          </TextField>
        </Card.Content>
        <Card.Footer className="mt-4">
          <Button isDisabled={loading} type="submit" variant="primary">
            {loading ? <Spinner size="sm" /> : null}
            Submit request
          </Button>
        </Card.Footer>
      </Form>
    </Card>
  );
}

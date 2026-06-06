"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Autocomplete,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Label,
  ListBox,
  SearchField,
  Spinner,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";

import { Money } from "@/components/money";
import { apiFetch } from "@/lib/api-client";
import { formatInr } from "@/lib/format-money";
import { formatEnumLabel, operatorLabel } from "@/lib/transaction-label";
import { formatTableDateTime } from "@/lib/utils";

export type RetailerSupportTransactionOption = {
  id: string;
  targetPhone: string;
  operator: string;
  amount: number;
  status: string;
  apiReferenceId: string | null;
  createdAt: string;
};

export function RetailerSupportForm({
  transactions,
  onSubmitted,
}: {
  transactions: RetailerSupportTransactionOption[];
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAllRecharges, setShowAllRecharges] = useState(false);
  const [loading, setLoading] = useState(false);

  const baseOptions = useMemo(
    () =>
      showAllRecharges
        ? transactions
        : transactions.filter((tx) => tx.status !== "SUCCESS"),
    [showAllRecharges, transactions],
  );

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseOptions;
    return baseOptions.filter((tx) => {
      const amountFormatted = formatInr(tx.amount).toLowerCase();
      const composed = [
        tx.operator,
        tx.targetPhone,
        tx.apiReferenceId ?? "",
        tx.id,
        String(tx.amount),
        amountFormatted,
        amountFormatted.replace(/[₹,\s]/g, ""),
      ]
        .join(" ")
        .toLowerCase();
      return composed.includes(q);
    });
  }, [baseOptions, search]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject || !selectedTx || !trimmedMessage) {
      toast("Subject, transaction, and message are required.", {
        variant: "danger",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/retailer/disputes", {
        method: "POST",
        body: JSON.stringify({
          subject: trimmedSubject,
          transactionId: selectedTx,
          message: trimmedMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit dispute.");
      }

      toast(data?.message || "Dispute submitted.", { variant: "success" });
      setSubject("");
      setMessage("");
      setSelectedTx(null);
      setSearch("");
      onSubmitted?.();
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to submit dispute.", {
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="default">
      <Card.Header>
        <Card.Title>Raise a dispute</Card.Title>
        <Card.Description>
          Submit recharge issues to admin support for review and resolution.
        </Card.Description>
      </Card.Header>
      <Form onSubmit={handleSubmit}>
        <Card.Content className="space-y-4">
          <TextField isRequired name="subject">
            <Label>Subject</Label>
            <Input
              placeholder="e.g. Recharge failed but amount debited"
              value={subject}
              variant="secondary"
              onChange={(e) => setSubject(e.target.value)}
            />
          </TextField>

          <Autocomplete
            value={selectedTx}
            variant="secondary"
            onChange={(value) => setSelectedTx(value != null ? String(value) : null)}
          >
            <Label>Transaction</Label>
            <Autocomplete.Trigger>
              <Autocomplete.Value />
              <Autocomplete.ClearButton onClick={() => setSelectedTx(null)} />
              <Autocomplete.Indicator />
            </Autocomplete.Trigger>
            <Autocomplete.Popover>
              <div className="border-b border-separator px-3 py-2">
                <SearchField className="w-full !px-0" variant="secondary">
                  <SearchField.Group className="w-full">
                    <SearchField.SearchIcon />
                    <SearchField.Input
                      placeholder="Search transaction..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search ? <SearchField.ClearButton /> : null}
                  </SearchField.Group>
                </SearchField>
              </div>
              <ListBox>
                {filteredOptions.map((tx) => (
                  <ListBox.Item
                    key={tx.id}
                    id={tx.id}
                    textValue={`${operatorLabel(tx.operator)} ${tx.targetPhone} ${tx.apiReferenceId ?? ""} ${tx.id}`}
                  >
                    <div className="flex w-full min-w-0 flex-1 items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {operatorLabel(tx.operator)} · {tx.targetPhone}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {formatTableDateTime(tx.createdAt)} · {formatEnumLabel(tx.status)}
                          {tx.apiReferenceId ? ` · Ref: ${tx.apiReferenceId}` : ""}
                        </p>
                      </div>
                      <Money
                        amount={tx.amount}
                        className="shrink-0 text-sm tabular-nums"
                      />
                    </div>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Autocomplete.Popover>
          </Autocomplete>

          <Checkbox
            isSelected={showAllRecharges}
            variant="secondary"
            onChange={(isSelected) => setShowAllRecharges(Boolean(isSelected))}
          >
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content>
              <Label>Show all recharges</Label>
            </Checkbox.Content>
          </Checkbox>

          <TextField isRequired name="message">
            <Label>Message</Label>
            <TextArea
              rows={4}
              placeholder="Describe the issue in detail..."
              value={message}
              variant="secondary"
              onChange={(e) => setMessage(e.target.value)}
            />
          </TextField>
        </Card.Content>
        <Card.Footer className="mt-4">
          <Button isDisabled={loading} type="submit" variant="primary">
            {loading ? <Spinner size="sm" /> : null}
            Submit dispute
          </Button>
        </Card.Footer>
      </Form>
    </Card>
  );
}

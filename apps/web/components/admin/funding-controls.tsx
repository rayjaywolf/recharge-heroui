"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToDot,
  ArrowUpFromDot,
  Landmark,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Autocomplete,
  Button,
  Card,
  Input,
  Label,
  ListBox,
  SearchField,
  Spinner,
  Surface,
  Tabs,
  TextField,
  toast,
} from "@heroui/react";

import { Money } from "@/components/money";
import { apiFetch } from "@/lib/api-client";
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone";

export type FundingUserOption = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  balance: number;
  role: string;
};

export function FundingControls({ users }: { users: FundingUserOption[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("credit");
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedUser = users.find((u) => u.id === userId);
  const isCredit = activeTab === "credit";

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const contact =
        getDisplayPhone(user) ?? getDisplayEmail(user.email) ?? "";
      const composed = [user.name, user.role, user.email, contact]
        .join(" ")
        .toLowerCase();
      return composed.includes(q);
    });
  }, [search, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      toast("Select a user.", { variant: "danger" });
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast("Enter a valid amount.", { variant: "danger" });
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/api/admin/fund", {
        method: "POST",
        body: JSON.stringify({
          userId,
          amount: parsedAmount,
          actionType: activeTab,
          remarks: remarks.trim() === "" ? undefined : remarks.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Funding request failed.", { variant: "danger" });
        return;
      }

      toast(data.message || "Transaction committed successfully.", {
        variant: "success",
      });
      setAmount("");
      setRemarks("");
      router.refresh();
    } catch {
      toast("An unexpected error occurred.", { variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <Card.Header className="gap-4 pb-0">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => {
            if (key != null) setActiveTab(String(key));
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Funding action" className="w-full">
              <Tabs.Tab className="flex-1" id="credit">
                <span className="inline-flex items-center gap-2">
                  <ArrowDownToDot className="size-4 text-success" aria-hidden />
                  Add
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab className="flex-1" id="debit">
                <span className="inline-flex items-center gap-2">
                  <ArrowUpFromDot className="size-4 text-danger" aria-hidden />
                  Remove
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        <div>
          <Card.Title>{isCredit ? "Add funds" : "Remove funds"}</Card.Title>
          <Card.Description className="mt-1">
            {isCredit
              ? "Add money to a user's wallet."
              : "Remove money from a user's wallet."}
          </Card.Description>
        </div>
      </Card.Header>

      <Card.Content>
        <form className="grid gap-5" id="funding-form" onSubmit={handleSubmit}>
          <Autocomplete
            placeholder="Choose a user…"
            value={userId}
            variant="secondary"
            onChange={(value) => setUserId(value != null ? String(value) : null)}
          >
            <Label>Select user</Label>
            <Autocomplete.Trigger>
              <Autocomplete.Value />
              <Autocomplete.ClearButton onClick={() => setUserId(null)} />
              <Autocomplete.Indicator />
            </Autocomplete.Trigger>
            <Autocomplete.Popover>
              <div className="border-b border-separator p-2">
                <SearchField variant="secondary">
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input
                      placeholder="Search by name, role, email, or phone…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search ? <SearchField.ClearButton /> : null}
                  </SearchField.Group>
                </SearchField>
              </div>
              <ListBox>
                {filteredUsers.length === 0 ? (
                  <ListBox.Item id="empty" isDisabled textValue="No users">
                    {users.length === 0
                      ? "No users available"
                      : "No users match your search"}
                  </ListBox.Item>
                ) : (
                  filteredUsers.map((user) => {
                    const contact =
                      getDisplayPhone(user) ??
                      getDisplayEmail(user.email) ??
                      "—";
                    const label = `${user.name} (${user.role}) · ${contact}`;
                    return (
                      <ListBox.Item
                        key={user.id}
                        id={user.id}
                        textValue={label}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {user.name}{" "}
                            <span className="font-normal text-muted">
                              ({user.role})
                            </span>
                          </p>
                          <p className="truncate text-xs text-muted">
                            {contact}
                          </p>
                        </div>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    );
                  })
                )}
              </ListBox>
            </Autocomplete.Popover>
          </Autocomplete>

          {selectedUser ? (
            <Surface className="p-3" variant="tertiary">
              <p className="text-xs text-muted">
                Current balance:{" "}
                <Money
                  amount={selectedUser.balance}
                  className="font-semibold text-foreground"
                />
              </p>
            </Surface>
          ) : null}

          <TextField isRequired name="amount">
            <Label>Amount (₹)</Label>
            <Input
              inputMode="numeric"
              min={1}
              placeholder="5000"
              type="number"
              value={amount}
              variant="secondary"
              onChange={(e) => setAmount(e.target.value)}
            />
          </TextField>

          <TextField name="remarks">
            <Label>Notes (optional)</Label>
            <Input
              placeholder="e.g. Paid via UPI on a specific date…"
              value={remarks}
              variant="secondary"
              onChange={(e) => setRemarks(e.target.value)}
            />
          </TextField>
        </form>
      </Card.Content>

      <Card.Footer className="mt-4">
        <Button
          className="w-full gap-2"
          form="funding-form"
          isPending={loading}
          type="submit"
          variant={isCredit ? "primary" : "danger"}
        >
          {loading ? (
            <Spinner color="current" size="sm" />
          ) : (
            <Landmark className="size-4" aria-hidden />
          )}
          {isCredit ? "Add funds" : "Remove funds"}
        </Button>
      </Card.Footer>
    </Card>
  );
}

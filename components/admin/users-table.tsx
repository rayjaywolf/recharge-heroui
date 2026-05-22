"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  Button,
  Chip,
  Description,
  Label,
  ListBox,
  Modal,
  SearchField,
  Select,
  Table,
  toast,
  useOverlayState,
} from "@heroui/react";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  role: string;
  balance: number;
  isSuspended: boolean;
  createdAt: string;
  distributorId: string | null;
  distributor: { name: string } | null;
  _count: { transactions: number };
};

type DistributorOption = { id: string; name: string };

const ROLE_OPTIONS = [
  { id: "RETAILER", label: "Retailer" },
  { id: "DISTRIBUTOR", label: "Distributor" },
  { id: "ADMIN", label: "Admin" },
] as const;

const NO_DISTRIBUTOR = "none";

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function UsersTable({
  title,
  initialData,
  distributors,
  hideDistributorCol = false,
}: {
  title: string;
  initialData: AdminUserRow[];
  distributors: DistributorOption[];
  hideDistributorCol?: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUserRow | null>(null);
  const [configTarget, setConfigTarget] = useState<AdminUserRow | null>(null);
  const [configRole, setConfigRole] = useState<string>("RETAILER");
  const [configDistributorId, setConfigDistributorId] = useState<string | null>(
    null
  );
  const suspendDialog = useOverlayState();
  const configModal = useOverlayState();
  const adminConfirmDialog = useOverlayState();
  const router = useRouter();

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const filteredData = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;

    return data.filter((user) => {
      const phone = getDisplayPhone(user);
      const email = getDisplayEmail(user.email);
      return (
        user.name.toLowerCase().includes(q) ||
        (email?.toLowerCase().includes(q) ?? false) ||
        (phone?.includes(q) ?? false)
      );
    });
  }, [data, query]);

  const toggleSuspension = async (
    userId: string,
    currentlySuspended: boolean
  ) => {
    setBusyId(userId);

    try {
      const res = await fetch("/api/admin/retailer/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error("Failed to toggle status");

      setData((prev) =>
        prev.map((r) =>
          r.id === userId ? { ...r, isSuspended: !currentlySuspended } : r
        )
      );
      toast(currentlySuspended ? "User restored." : "User suspended.", {
        variant: "success",
      });
      router.refresh();
    } catch {
      toast("Failed to update access status.", { variant: "danger" });
    } finally {
      setBusyId(null);
    }
  };

  const requestSuspend = (user: AdminUserRow) => {
    setSuspendTarget(user);
    suspendDialog.open();
  };

  const confirmSuspend = async () => {
    if (!suspendTarget) return;
    await toggleSuspension(suspendTarget.id, false);
    suspendDialog.close();
    setSuspendTarget(null);
  };

  const openConfig = (user: AdminUserRow) => {
    setConfigTarget(user);
    setConfigRole(user.role);
    setConfigDistributorId(user.distributorId);
    configModal.open();
  };

  const submitConfig = async () => {
    if (!configTarget) return;

    const distributorId =
      configRole === "RETAILER" &&
      configDistributorId &&
      configDistributorId !== NO_DISTRIBUTOR
        ? configDistributorId
        : null;

    setBusyId(configTarget.id);
    try {
      const res = await fetch("/api/admin/users/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: configTarget.id,
          role: configRole,
          distributorId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update user");

      toast(json.message || "User updated successfully.", {
        variant: "success",
      });
      configModal.close();
      setConfigTarget(null);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error updating user", {
        variant: "danger",
      });
    } finally {
      setBusyId(null);
    }
  };

  const saveConfig = () => {
    if (!configTarget) return;

    if (configRole === "ADMIN" && configTarget.role !== "ADMIN") {
      adminConfirmDialog.open();
      return;
    }

    void submitConfig();
  };

  const confirmAdminRole = async () => {
    adminConfirmDialog.close();
    await submitConfig();
  };

  return (
    <AdminTableCard
      headerAction={
        <SearchField className="w-full max-w-sm">
          <Label className="sr-only">Search users</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder="Search by name, phone, or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? <SearchField.ClearButton /> : null}
          </SearchField.Group>
        </SearchField>
      }
      title={title}
    >
      {filteredData.length === 0 ? (
        <AdminTableEmpty message="No users match your search." />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label={title}
              className="min-w-[820px]"
            >
              <Table.Header>
                <Table.Column isRowHeader>Name</Table.Column>
                <Table.Column>Phone</Table.Column>
                <Table.Column>Email</Table.Column>
                {!hideDistributorCol ? (
                  <Table.Column>Distributor</Table.Column>
                ) : null}
                <Table.Column>Balance</Table.Column>
                <Table.Column>Transactions</Table.Column>
                <Table.Column>Status</Table.Column>
                <Table.Column className="text-end">Actions</Table.Column>
              </Table.Header>
              <Table.Body>
                {filteredData.map((user) => {
                  const phone = getDisplayPhone(user);
                  const displayEmail = getDisplayEmail(user.email);
                  const isBusy = busyId === user.id;

                  return (
                    <Table.Row
                      key={user.id}
                      className={`cursor-pointer ${user.isSuspended ? "opacity-70" : ""}`}
                      onAction={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <Table.Cell className="font-semibold text-foreground">
                        {user.name}
                      </Table.Cell>
                      <Table.Cell className="text-sm text-muted">
                        {phone ?? "—"}
                      </Table.Cell>
                      <Table.Cell className="text-sm text-muted">
                        {displayEmail ?? "—"}
                      </Table.Cell>
                      {!hideDistributorCol ? (
                        <Table.Cell className="text-sm text-muted">
                          {user.distributor?.name ?? "—"}
                        </Table.Cell>
                      ) : null}
                      <Table.Cell className="font-semibold">
                        {formatInr(user.balance)}
                      </Table.Cell>
                      <Table.Cell className="text-sm text-muted">
                        {user._count.transactions} total
                      </Table.Cell>
                      <Table.Cell>
                        <Chip
                          color={user.isSuspended ? "danger" : "success"}
                          size="sm"
                          variant="soft"
                        >
                          {user.isSuspended ? "Suspended" : "Active"}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell
                        className="[&:has(button)]:cursor-default"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            isDisabled={isBusy}
                            size="sm"
                            variant="secondary"
                            onPress={() => openConfig(user)}
                          >
                            <Settings className="size-3.5" aria-hidden />
                            Config
                          </Button>
                          <Button
                            isDisabled={isBusy}
                            size="sm"
                            variant={user.isSuspended ? "secondary" : "danger"}
                            onPress={() =>
                              user.isSuspended
                                ? toggleSuspension(user.id, true)
                                : requestSuspend(user)
                            }
                          >
                            {user.isSuspended ? (
                              "Restore"
                            ) : (
                              <>
                                <ShieldAlert
                                  className="size-3.5"
                                  aria-hidden
                                />
                                Suspend
                              </>
                            )}
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      <Modal>
        <Modal.Backdrop
          isOpen={configModal.isOpen}
          onOpenChange={(open) => {
            configModal.setOpen(open);
            if (!open) setConfigTarget(null);
          }}
        >
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Configure user</Modal.Heading>
                <Description>
                  Update role and hierarchy for{" "}
                  <span className="font-medium text-foreground">
                    {configTarget?.name}
                  </span>
                  .
                </Description>
              </Modal.Header>
              <Modal.Body className="space-y-4">
                <Select
                  placeholder="Select role"
                  value={configRole}
                  onChange={(value) => {
                    const next = value != null ? String(value) : "RETAILER";
                    setConfigRole(next);
                    if (next !== "RETAILER") {
                      setConfigDistributorId(null);
                    }
                  }}
                >
                  <Label>Role</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {ROLE_OPTIONS.map((opt) => (
                        <ListBox.Item
                          key={opt.id}
                          id={opt.id}
                          textValue={opt.label}
                        >
                          {opt.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                {configRole === "RETAILER" ? (
                  <Select
                    placeholder="Assign distributor (optional)"
                    value={configDistributorId ?? NO_DISTRIBUTOR}
                    onChange={(value) => {
                      const next =
                        value != null ? String(value) : NO_DISTRIBUTOR;
                      setConfigDistributorId(
                        next === NO_DISTRIBUTOR ? null : next
                      );
                    }}
                  >
                    <Label>Distributor</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item
                          id={NO_DISTRIBUTOR}
                          textValue="No distributor"
                        >
                          No distributor
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        {distributors.map((d) => (
                          <ListBox.Item
                            key={d.id}
                            id={d.id}
                            textValue={d.name}
                          >
                            {d.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                ) : null}

                {configRole === "ADMIN" ? (
                  <p className="text-sm text-muted">
                    Admin users have full platform access. Assign this role only
                    to trusted operators.
                  </p>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  slot="close"
                  variant="secondary"
                  onPress={configModal.close}
                >
                  Cancel
                </Button>
                <Button
                  isPending={busyId === configTarget?.id}
                  variant="primary"
                  onPress={saveConfig}
                >
                  Save changes
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={adminConfirmDialog.isOpen}
          onOpenChange={(open) => adminConfirmDialog.setOpen(open)}
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-md">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="warning" />
                <AlertDialog.Heading>Grant admin access?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p className="text-sm text-muted">
                  <strong className="text-foreground">
                    {configTarget?.name}
                  </strong>{" "}
                  will receive full platform admin privileges, including user
                  management and funding controls.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  slot="close"
                  variant="tertiary"
                  onPress={adminConfirmDialog.close}
                >
                  Cancel
                </Button>
                <Button
                  isPending={busyId === configTarget?.id}
                  variant="danger"
                  onPress={confirmAdminRole}
                >
                  Grant admin
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={suspendDialog.isOpen}
          onOpenChange={(open) => {
            suspendDialog.setOpen(open);
            if (!open) setSuspendTarget(null);
          }}
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-md">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="warning" />
                <AlertDialog.Heading>Suspend user?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p className="text-sm text-muted">
                  <strong className="text-foreground">
                    {suspendTarget?.name}
                  </strong>{" "}
                  will lose access to the platform until you restore their
                  account. They will not be able to sign in or perform
                  recharges while suspended.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  slot="close"
                  variant="tertiary"
                  onPress={suspendDialog.close}
                >
                  Cancel
                </Button>
                <Button
                  isPending={busyId === suspendTarget?.id}
                  variant="danger"
                  onPress={confirmSuspend}
                >
                  Suspend user
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </AdminTableCard>
  );
}

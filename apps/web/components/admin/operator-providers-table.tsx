"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Label,
  ListBox,
  Select,
  Table,
  toast,
} from "@heroui/react";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { apiFetch } from "@/lib/api-client";
import { BACKUP_NONE, type BackupSlot } from "@/lib/recharge-providers";
import { PROVIDER_LABELS, type RechargeProvider } from "@/lib/recharge-config";

export type OperatorProviderRow = {
  id: string;
  operator: string;
  provider: string;
  backupProvider: string | null;
  backupProvider2: string | null;
};

const PROVIDER_OPTIONS: { id: RechargeProvider; label: string }[] = [
  { id: "REALROBO", label: PROVIDER_LABELS.REALROBO },
  { id: "MROBOTICS", label: PROVIDER_LABELS.MROBOTICS },
  { id: "A1TOPUP", label: PROVIDER_LABELS.A1TOPUP },
  { id: "TEST", label: PROVIDER_LABELS.TEST },
];

async function readApiError(res: Response, fallback: string) {
  try {
    const body = await res.json();
    const message =
      body && typeof body === "object" && "error" in body
        ? String(body.error)
        : "";
    return message || fallback;
  } catch {
    return fallback;
  }
}

function backupSelectValue(value: string | null) {
  return value ?? BACKUP_NONE;
}

function backupOptionsExcluding(primaryProvider: string) {
  return PROVIDER_OPTIONS.filter((opt) => opt.id !== primaryProvider);
}

function BackupProviderSelect({
  operator,
  label,
  value,
  primaryProvider,
  isDisabled,
  onChange,
}: {
  operator: string;
  label: string;
  value: string;
  primaryProvider: string;
  isDisabled: boolean;
  onChange: (value: string) => void;
}) {
  const options = backupOptionsExcluding(primaryProvider);
  const selectValue =
    value === primaryProvider ? BACKUP_NONE : value;

  return (
    <Select
      aria-label={`${label} for ${operator}`}
      className="max-w-xs"
      isDisabled={isDisabled}
      placeholder="Select API"
      value={selectValue}
      onChange={(v) => {
        if (v != null) onChange(String(v));
      }}
    >
      <Label className="sr-only">{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id={BACKUP_NONE} textValue="No backup">
            No backup
            <ListBox.ItemIndicator />
          </ListBox.Item>
          {options.map((opt) => (
            <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
              {opt.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function PrimaryApiCard({
  rows,
  savedRows,
  setRows,
  setSavedRows,
}: {
  rows: OperatorProviderRow[];
  savedRows: OperatorProviderRow[];
  setRows: React.Dispatch<React.SetStateAction<OperatorProviderRow[]>>;
  setSavedRows: React.Dispatch<React.SetStateAction<OperatorProviderRow[]>>;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.operator.localeCompare(b.operator)),
    [rows]
  );

  const savedByOperator = useMemo(
    () => new Map(savedRows.map((r) => [r.operator, r])),
    [savedRows]
  );

  const hasChanges = useMemo(
    () =>
      rows.some((r) => {
        const saved = savedByOperator.get(r.operator);
        return saved != null && r.provider !== saved.provider;
      }),
    [rows, savedByOperator]
  );

  const handleSave = async () => {
    const dirty = rows.filter((r) => {
      const saved = savedByOperator.get(r.operator);
      return saved != null && r.provider !== saved.provider;
    });

    if (dirty.length === 0) return;

    setSaving(true);
    try {
      await Promise.all(
        dirty.map(async (r) => {
          const res = await apiFetch("/api/admin/operator-providers", {
            method: "PUT",
            body: JSON.stringify({
              operator: r.operator,
              provider: r.provider,
            }),
          });
          if (!res.ok) {
            throw new Error(
              await readApiError(res, "Failed to save primary API routing."),
            );
          }
        }),
      );
      setSavedRows((current) =>
        current.map((saved) => {
          const draft = dirty.find((d) => d.operator === saved.operator);
          return draft ? { ...saved, provider: draft.provider } : saved;
        })
      );
      toast("Primary API routing saved.", { variant: "success" });
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Failed to save primary API routing.",
        { variant: "danger" },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminTableCard
      description="Main gateway used for each operator. All new recharges try this API first."
      headerAction={
        <Button
          isDisabled={!hasChanges || sortedRows.length === 0}
          isPending={saving}
          variant="primary"
          onPress={handleSave}
        >
          Save
        </Button>
      }
      title="Primary API"
    >
      {sortedRows.length === 0 ? (
        <AdminTableEmpty message="No operators configured yet." />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Primary API" className="min-w-[480px]">
              <Table.Header>
                <Table.Column isRowHeader>Operator</Table.Column>
                <Table.Column>Primary API</Table.Column>
              </Table.Header>
              <Table.Body>
                {sortedRows.map((row) => (
                  <Table.Row key={`primary-${row.id}`}>
                    <Table.Cell className="font-semibold">
                      {row.operator}
                    </Table.Cell>
                    <Table.Cell>
                      <Select
                        aria-label={`Primary API for ${row.operator}`}
                        className="max-w-xs"
                        isDisabled={saving}
                        placeholder="Select API"
                        value={row.provider}
                        onChange={(v) => {
                          if (v == null) return;
                          const value = String(v);
                          setRows((current) =>
                            current.map((r) =>
                              r.operator === row.operator
                                ? {
                                    ...r,
                                    provider: value,
                                    backupProvider:
                                      r.backupProvider === value
                                        ? null
                                        : r.backupProvider,
                                    backupProvider2:
                                      r.backupProvider2 === value
                                        ? null
                                        : r.backupProvider2,
                                  }
                                : r
                            )
                          );
                        }}
                      >
                        <Label className="sr-only">Primary API</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {PROVIDER_OPTIONS.map((opt) => (
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
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </AdminTableCard>
  );
}

function BackupApisCard({
  rows,
  savedRows,
  setRows,
  setSavedRows,
}: {
  rows: OperatorProviderRow[];
  savedRows: OperatorProviderRow[];
  setRows: React.Dispatch<React.SetStateAction<OperatorProviderRow[]>>;
  setSavedRows: React.Dispatch<React.SetStateAction<OperatorProviderRow[]>>;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.operator.localeCompare(b.operator)),
    [rows]
  );

  const savedByOperator = useMemo(
    () => new Map(savedRows.map((r) => [r.operator, r])),
    [savedRows]
  );

  const hasChanges = useMemo(
    () =>
      rows.some((r) => {
        const saved = savedByOperator.get(r.operator);
        if (!saved) return false;
        return (
          r.backupProvider !== saved.backupProvider ||
          r.backupProvider2 !== saved.backupProvider2
        );
      }),
    [rows, savedByOperator]
  );

  const handleSave = async () => {
    const updates: { operator: string; slot: BackupSlot; value: string }[] = [];

    for (const r of rows) {
      const saved = savedByOperator.get(r.operator);
      if (!saved) continue;

      const backup1 = backupSelectValue(r.backupProvider);
      const savedBackup1 = backupSelectValue(saved.backupProvider);
      if (backup1 !== savedBackup1) {
        updates.push({ operator: r.operator, slot: 1, value: backup1 });
      }

      const backup2 = backupSelectValue(r.backupProvider2);
      const savedBackup2 = backupSelectValue(saved.backupProvider2);
      if (backup2 !== savedBackup2) {
        updates.push({ operator: r.operator, slot: 2, value: backup2 });
      }
    }

    if (updates.length === 0) return;

    setSaving(true);
    try {
      await Promise.all(
        updates.map(async (u) => {
          const res = await apiFetch("/api/admin/operator-providers/backup", {
            method: "PUT",
            body: JSON.stringify({
              operator: u.operator,
              backup: u.value,
              slot: u.slot,
            }),
          });
          if (!res.ok) {
            throw new Error(
              await readApiError(res, "Failed to save backup API routing."),
            );
          }
        }),
      );
      setSavedRows((current) =>
        current.map((saved) => {
          const draft = rows.find((r) => r.operator === saved.operator);
          if (!draft) return saved;
          return {
            ...saved,
            backupProvider: draft.backupProvider,
            backupProvider2: draft.backupProvider2,
          };
        })
      );
      toast("Backup API routing saved.", { variant: "success" });
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Failed to save backup API routing.",
        { variant: "danger" },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminTableCard
      description="Fallback gateways if the primary API fails. Recharge retries backup 1, then backup 2."
      headerAction={
        <Button
          isDisabled={!hasChanges || sortedRows.length === 0}
          isPending={saving}
          variant="primary"
          onPress={handleSave}
        >
          Save
        </Button>
      }
      title="Backup APIs"
    >
      {sortedRows.length === 0 ? (
        <AdminTableEmpty message="No operators configured yet." />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Backup APIs" className="min-w-[720px]">
              <Table.Header>
                <Table.Column isRowHeader>Operator</Table.Column>
                <Table.Column>Backup API 1</Table.Column>
                <Table.Column>Backup API 2</Table.Column>
              </Table.Header>
              <Table.Body>
                {sortedRows.map((row) => {
                  const backup1 = backupSelectValue(row.backupProvider);
                  const backup2 = backupSelectValue(row.backupProvider2);

                  return (
                    <Table.Row key={`backup-${row.id}`}>
                      <Table.Cell className="font-semibold">
                        {row.operator}
                      </Table.Cell>
                      <Table.Cell>
                        <BackupProviderSelect
                          isDisabled={saving}
                          label="Backup API 1"
                          operator={row.operator}
                          primaryProvider={row.provider}
                          value={backup1}
                          onChange={(v) => {
                            const backupValue = v === BACKUP_NONE ? null : v;
                            setRows((current) =>
                              current.map((r) =>
                                r.operator === row.operator
                                  ? { ...r, backupProvider: backupValue }
                                  : r
                              )
                            );
                          }}
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <BackupProviderSelect
                          isDisabled={saving}
                          label="Backup API 2"
                          operator={row.operator}
                          primaryProvider={row.provider}
                          value={backup2}
                          onChange={(v) => {
                            const backupValue = v === BACKUP_NONE ? null : v;
                            setRows((current) =>
                              current.map((r) =>
                                r.operator === row.operator
                                  ? { ...r, backupProvider2: backupValue }
                                  : r
                              )
                            );
                          }}
                        />
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </AdminTableCard>
  );
}

export function OperatorProvidersTable({
  initialRows,
}: {
  initialRows: OperatorProviderRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [savedRows, setSavedRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
    setSavedRows(initialRows);
  }, [initialRows]);

  return (
    <div className="space-y-6">
      <PrimaryApiCard
        rows={rows}
        savedRows={savedRows}
        setRows={setRows}
        setSavedRows={setSavedRows}
      />

      <BackupApisCard
        rows={rows}
        savedRows={savedRows}
        setRows={setRows}
        setSavedRows={setSavedRows}
      />
    </div>
  );
}

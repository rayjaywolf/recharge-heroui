"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AlertDialog,
  Button,
  Description,
  Input,
  Label,
  Modal,
  Table,
  TextField,
  toast,
  useOverlayState,
} from "@heroui/react";

import {
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { apiFetch } from "@/lib/api-client";

export type CommissionRuleRow = {
  id: string;
  operator: string;
  providerMargin: number;
  adminMargin: number;
  distributorMargin: number;
  retailerMargin: number;
};

type MarginFields = {
  providerMargin: string;
  adminMargin: string;
  distributorMargin: string;
  retailerMargin: string;
};

const EMPTY_MARGINS: MarginFields = {
  providerMargin: "0",
  adminMargin: "0",
  distributorMargin: "0",
  retailerMargin: "0",
};

function parseMargins(fields: MarginFields) {
  return {
    providerMargin: parseFloat(fields.providerMargin) || 0,
    adminMargin: parseFloat(fields.adminMargin) || 0,
    distributorMargin: parseFloat(fields.distributorMargin) || 0,
    retailerMargin: parseFloat(fields.retailerMargin) || 0,
  };
}

function marginsMismatch(fields: MarginFields): boolean {
  const p = parseFloat(fields.providerMargin) || 0;
  const sum =
    (parseFloat(fields.adminMargin) || 0) +
    (parseFloat(fields.distributorMargin) || 0) +
    (parseFloat(fields.retailerMargin) || 0);
  return Math.abs(p - sum) > 0.001;
}

function MarginInputs({
  fields,
  onChange,
  idPrefix,
}: {
  fields: MarginFields;
  onChange: (next: MarginFields) => void;
  idPrefix: string;
}) {
  const set =
    (key: keyof MarginFields) => (value: string) =>
      onChange({ ...fields, [key]: value });

  const mismatch = marginsMismatch(fields);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name={`${idPrefix}-provider`}>
          <Label>Provider API (%)</Label>
          <Input
            inputMode="decimal"
            step="0.01"
            type="number"
            value={fields.providerMargin}
            variant="secondary"
            onChange={(e) => set("providerMargin")(e.target.value)}
          />
        </TextField>
        <TextField name={`${idPrefix}-admin`}>
          <Label>Admin (%)</Label>
          <Input
            inputMode="decimal"
            step="0.01"
            type="number"
            value={fields.adminMargin}
            variant="secondary"
            onChange={(e) => set("adminMargin")(e.target.value)}
          />
        </TextField>
        <TextField name={`${idPrefix}-distributor`}>
          <Label>Distributor (%)</Label>
          <Input
            inputMode="decimal"
            step="0.01"
            type="number"
            value={fields.distributorMargin}
            variant="secondary"
            onChange={(e) => set("distributorMargin")(e.target.value)}
          />
        </TextField>
        <TextField name={`${idPrefix}-retailer`}>
          <Label>Retailer (%)</Label>
          <Input
            inputMode="decimal"
            step="0.01"
            type="number"
            value={fields.retailerMargin}
            variant="secondary"
            onChange={(e) => set("retailerMargin")(e.target.value)}
          />
        </TextField>
      </div>
      {mismatch ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Margin mismatch</Alert.Title>
            <Alert.Description>
              Admin + distributor + retailer should equal the provider margin.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </div>
  );
}

export function CommissionRulesTable({
  initialRules,
}: {
  initialRules: CommissionRuleRow[];
}) {
  const router = useRouter();
  const createModal = useOverlayState();
  const editModal = useOverlayState();
  const deleteDialog = useOverlayState();

  const [rules, setRules] = useState(initialRules);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);
  const [newOperator, setNewOperator] = useState("");
  const [createMargins, setCreateMargins] = useState<MarginFields>(EMPTY_MARGINS);
  const [editingRule, setEditingRule] = useState<CommissionRuleRow | null>(null);
  const [editMargins, setEditMargins] = useState<MarginFields>(EMPTY_MARGINS);
  const [deleteTarget, setDeleteTarget] = useState<CommissionRuleRow | null>(null);

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.operator.localeCompare(b.operator)),
    [rules]
  );

  const openCreate = () => {
    setNewOperator("");
    setCreateMargins(EMPTY_MARGINS);
    createModal.open();
  };

  const openEdit = (rule: CommissionRuleRow) => {
    setEditingRule(rule);
    setEditMargins({
      providerMargin: rule.providerMargin.toString(),
      adminMargin: rule.adminMargin.toString(),
      distributorMargin: rule.distributorMargin.toString(),
      retailerMargin: rule.retailerMargin.toString(),
    });
    editModal.open();
  };

  const openDelete = (rule: CommissionRuleRow) => {
    setDeleteTarget(rule);
    deleteDialog.open();
  };

  const handleCreate = async () => {
    const operator = newOperator.trim();
    if (!operator) {
      toast("Enter an operator name.", { variant: "danger" });
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch("/api/admin/commissions", {
        method: "POST",
        body: JSON.stringify({
          operator,
          ...parseMargins(createMargins),
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      toast("Commission rule created.", { variant: "success" });
      createModal.close();
      router.refresh();
    } catch {
      toast("Failed to create rule. Operator name must be unique.", {
        variant: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingRule) return;

    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/commissions/${editingRule.id}`, {
        method: "PATCH",
        body: JSON.stringify(parseMargins(editMargins)),
      });
      if (!res.ok) throw new Error("Update failed");
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRule.id
            ? { ...r, ...parseMargins(editMargins) }
            : r
        )
      );
      toast("Commission rule updated.", { variant: "success" });
      editModal.close();
      setEditingRule(null);
      router.refresh();
    } catch {
      toast("Failed to update rule.", { variant: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/commissions/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast("Rule deleted.", { variant: "success" });
      deleteDialog.close();
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast("Failed to delete rule.", { variant: "danger" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" variant="primary" onPress={openCreate}>
          <Plus className="size-4" aria-hidden />
          Add operator
        </Button>
      </div>

      {sortedRules.length === 0 ? (
        <AdminTableEmpty message="No commission rules defined yet." />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Commission rules"
              className="min-w-[720px]"
            >
                <Table.Header>
                  <Table.Column isRowHeader>Operator</Table.Column>
                  <Table.Column className="text-right">
                    Provider API (%)
                  </Table.Column>
                  <Table.Column className="text-right">Admin (%)</Table.Column>
                  <Table.Column className="text-right">
                    Distributor (%)
                  </Table.Column>
                  <Table.Column className="text-right">
                    Retailer (%)
                  </Table.Column>
                  <Table.Column className="text-right">Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                  {sortedRules.map((rule) => (
                    <Table.Row key={rule.id}>
                      <Table.Cell className="font-semibold">
                        {rule.operator}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {rule.providerMargin.toFixed(2)}%
                      </Table.Cell>
                      <Table.Cell className="text-right font-semibold">
                        {rule.adminMargin.toFixed(2)}%
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium">
                        {rule.distributorMargin.toFixed(2)}%
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium">
                        {rule.retailerMargin.toFixed(2)}%
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex justify-end gap-2">
                          <Button
                            aria-label={`Edit ${rule.operator}`}
                            isIconOnly
                            size="sm"
                            variant="secondary"
                            onPress={() => openEdit(rule)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            aria-label={`Delete ${rule.operator}`}
                            isIconOnly
                            size="sm"
                            variant="danger"
                            onPress={() => openDelete(rule)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      <Modal>
        <Modal.Backdrop
          isOpen={createModal.isOpen}
          onOpenChange={(open) => {
            createModal.setOpen(open);
            if (!open) setNewOperator("");
          }}
        >
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Add commission rule</Modal.Heading>
                <Description>
                  Set margins for a new operator. Percentages are cuts on each
                  transaction.
                </Description>
              </Modal.Header>
              <Modal.Body className="space-y-4">
                <TextField name="operator">
                  <Label>Operator name</Label>
                  <Input
                    placeholder="e.g. JIO, Airtel Prepaid"
                    value={newOperator}
                    variant="secondary"
                    onChange={(e) => setNewOperator(e.target.value)}
                  />
                </TextField>
                <MarginInputs
                  fields={createMargins}
                  idPrefix="create"
                  onChange={setCreateMargins}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button
                  slot="close"
                  variant="secondary"
                  onPress={createModal.close}
                >
                  Cancel
                </Button>
                <Button isPending={busy} variant="primary" onPress={handleCreate}>
                  Save rule
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal>
        <Modal.Backdrop
          isOpen={editModal.isOpen}
          onOpenChange={(open) => {
            editModal.setOpen(open);
            if (!open) setEditingRule(null);
          }}
        >
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>
                  Edit rule: {editingRule?.operator ?? ""}
                </Modal.Heading>
                <Description>
                  Update commission margins for this operator.
                </Description>
              </Modal.Header>
              <Modal.Body>
                <MarginInputs
                  fields={editMargins}
                  idPrefix="edit"
                  onChange={setEditMargins}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button
                  slot="close"
                  variant="secondary"
                  onPress={editModal.close}
                >
                  Cancel
                </Button>
                <Button isPending={busy} variant="primary" onPress={handleUpdate}>
                  Save changes
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={deleteDialog.isOpen}
          onOpenChange={(open) => {
            deleteDialog.setOpen(open);
            if (!open) setDeleteTarget(null);
          }}
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-md">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Delete commission rule?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p className="text-sm text-muted">
                  This removes the rule for{" "}
                  <strong className="text-foreground">
                    {deleteTarget?.operator}
                  </strong>
                  . Existing transactions are not changed.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  slot="close"
                  variant="tertiary"
                  onPress={deleteDialog.close}
                >
                  Cancel
                </Button>
                <Button
                  isPending={busy}
                  variant="danger"
                  onPress={handleDelete}
                >
                  Delete
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}

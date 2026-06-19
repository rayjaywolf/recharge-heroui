"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Button,
  Chip,
  Description,
  Modal,
  Table,
  toast,
  useOverlayState,
} from "@heroui/react";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import {
  CommissionMarginFields,
  EMPTY_MARGINS,
  marginsToFields,
  parseMargins,
  type MarginFields,
} from "@/components/admin/commission-margin-fields";
import { apiFetch } from "@/lib/api-client";

export type RetailerCommissionRuleRow = {
  operator: string;
  defaultRuleId: string;
  default: {
    providerMargin: number;
    adminMargin: number;
    distributorMargin: number;
    retailerMargin: number;
  };
  override: {
    id: string;
    providerMargin: number;
    adminMargin: number;
    distributorMargin: number;
    retailerMargin: number;
    updatedAt: string;
  } | null;
  effective: {
    providerMargin: number;
    adminMargin: number;
    distributorMargin: number;
    retailerMargin: number;
  };
  isOverridden: boolean;
};

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export function RetailerCommissionOverridesTable({
  retailerId,
  retailerName,
  initialRules,
}: {
  retailerId: string;
  retailerName: string;
  initialRules: RetailerCommissionRuleRow[];
}) {
  const router = useRouter();
  const editModal = useOverlayState();
  const [rules, setRules] = useState(initialRules);
  const [busy, setBusy] = useState(false);
  const [editingRule, setEditingRule] = useState<RetailerCommissionRuleRow | null>(
    null,
  );
  const [editMargins, setEditMargins] = useState<MarginFields>(EMPTY_MARGINS);

  useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.operator.localeCompare(b.operator)),
    [rules],
  );

  const openEdit = (rule: RetailerCommissionRuleRow) => {
    setEditingRule(rule);
    setEditMargins(
      marginsToFields(rule.isOverridden ? rule.effective : rule.default),
    );
    editModal.open();
  };

  const handleSave = async () => {
    if (!editingRule) return;

    setBusy(true);
    try {
      const payload = parseMargins(editMargins);
      const res = editingRule.override
        ? await apiFetch(
            `/api/admin/users/${retailerId}/commission-overrides/${editingRule.override.id}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            },
          )
        : await apiFetch(`/api/admin/users/${retailerId}/commission-overrides`, {
            method: "POST",
            body: JSON.stringify({
              operator: editingRule.operator,
              ...payload,
            }),
          });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Save failed");
      }

      toast(
        editingRule.override
          ? "Commission override updated."
          : "Commission override created.",
        { variant: "success" },
      );
      editModal.close();
      setEditingRule(null);
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to save override.",
        { variant: "danger" },
      );
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (rule: RetailerCommissionRuleRow) => {
    if (!rule.override) return;

    setBusy(true);
    try {
      const res = await apiFetch(
        `/api/admin/users/${retailerId}/commission-overrides/${rule.override.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Reset failed");
      toast("Reverted to default commission rule.", { variant: "success" });
      router.refresh();
    } catch {
      toast("Failed to reset override.", { variant: "danger" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminTableCard
        description={`Default rates come from global commission rules. Overrides here apply only to ${retailerName}.`}
        title="Commission overrides"
      >
        {sortedRules.length === 0 ? (
          <AdminTableEmpty message="No global commission rules configured yet." />
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Retailer commission overrides"
                className="min-w-[860px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Operator</Table.Column>
                  <Table.Column className="text-right">Default retailer</Table.Column>
                  <Table.Column className="text-right">Effective retailer</Table.Column>
                  <Table.Column className="text-right">Effective admin</Table.Column>
                  <Table.Column className="text-right">
                    Effective distributor
                  </Table.Column>
                  <Table.Column className="text-right">Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                  {sortedRules.map((rule) => (
                    <Table.Row key={rule.operator}>
                      <Table.Cell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {rule.operator}
                          {rule.isOverridden ? (
                            <Chip color="accent" size="sm" variant="soft">
                              Custom
                            </Chip>
                          ) : null}
                        </div>
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {formatPercent(rule.default.retailerMargin)}
                      </Table.Cell>
                      <Table.Cell className="text-right font-semibold">
                        {formatPercent(rule.effective.retailerMargin)}
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        {formatPercent(rule.effective.adminMargin)}
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        {formatPercent(rule.effective.distributorMargin)}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex justify-end gap-2">
                          <Button
                            aria-label={`Edit ${rule.operator} override`}
                            className="gap-1.5"
                            size="sm"
                            variant="secondary"
                            onPress={() => openEdit(rule)}
                          >
                            <Pencil className="size-4" aria-hidden />
                            {rule.isOverridden ? "Edit" : "Override"}
                          </Button>
                          {rule.isOverridden ? (
                            <Button
                              aria-label={`Reset ${rule.operator} to default`}
                              className="gap-1.5"
                              isDisabled={busy}
                              size="sm"
                              variant="tertiary"
                              onPress={() => handleReset(rule)}
                            >
                              <RotateCcw className="size-4" aria-hidden />
                              Reset
                            </Button>
                          ) : null}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </AdminTableCard>

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
                  {editingRule?.override ? "Edit override" : "Set override"}:{" "}
                  {editingRule?.operator ?? ""}
                </Modal.Heading>
                <Description>
                  These margins replace the global default for this retailer only.
                  Existing transactions are not changed.
                </Description>
              </Modal.Header>
              <Modal.Body>
                <CommissionMarginFields
                  fields={editMargins}
                  idPrefix="retailer-override"
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
                <Button isPending={busy} variant="primary" onPress={handleSave}>
                  Save override
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

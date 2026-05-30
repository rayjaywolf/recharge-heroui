"use client";

import { useMemo, useState } from "react";
import { Button, Label, Link, Modal, Spinner } from "@heroui/react";

import type { RechargePlanCategory, RechargePlanItem } from "@/lib/recharge-plans";

type RechargePlansPickerProps = {
  categories: RechargePlanCategory[];
  selectedAmount: number | null;
  loading?: boolean;
  awaitingSelection?: boolean;
  awaitingMessage?: string;
  onSelectAmount: (amount: number) => void;
};

type PlanDetailState = {
  plan: RechargePlanItem;
  categoryName: string;
};

function planKey(plan: RechargePlanItem) {
  return `${plan.amount}-${plan.validity}-${plan.description}`;
}

export function RechargePlansPicker({
  categories,
  selectedAmount,
  loading,
  awaitingSelection,
  awaitingMessage = "Enter a valid phone number and select operator and circle to view plans.",
  onSelectAmount,
}: RechargePlansPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detailPlan, setDetailPlan] = useState<PlanDetailState | null>(null);

  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories],
  );

  const resolvedCategory =
    activeCategory && categoryNames.includes(activeCategory)
      ? activeCategory
      : (categoryNames[0] ?? null);

  const activePlans =
    categories.find((c) => c.name === resolvedCategory)?.plans ?? [];

  const panelHeightClass = "h-[min(20rem,50dvh)]";
  const panelBodyClass = `flex ${panelHeightClass} items-center justify-center overflow-hidden rounded-lg border border-dashed border-default-200 px-4 text-center text-sm text-muted`;

  const handleUsePlanAmount = () => {
    if (!detailPlan) return;
    onSelectAmount(detailPlan.plan.amount);
    setDetailPlan(null);
  };

  return (
    <>
      {detailPlan ? (
        <Modal>
          <Modal.Backdrop
            isOpen
            onOpenChange={(open) => {
              if (!open) setDetailPlan(null);
            }}
          >
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-md">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>
                    ₹{detailPlan.plan.amount} recharge plan
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body className="space-y-4">
                  <dl className="grid gap-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Amount</dt>
                      <dd className="font-semibold tabular-nums">
                        ₹{detailPlan.plan.amount}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Validity</dt>
                      <dd className="text-right">{detailPlan.plan.validity}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Category</dt>
                      <dd className="text-right">{detailPlan.categoryName}</dd>
                    </div>
                    {detailPlan.plan.type ? (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Type</dt>
                        <dd className="text-right">{detailPlan.plan.type}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-muted">Description</dt>
                      <dd className="mt-1.5 whitespace-pre-wrap rounded-lg bg-surface-secondary px-3 py-2 text-foreground">
                        {detailPlan.plan.description}
                      </dd>
                    </div>
                  </dl>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onPress={() => setDetailPlan(null)}>
                    Close
                  </Button>
                  <Button variant="primary" onPress={handleUsePlanAmount}>
                    Use this amount
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="shrink-0">
          <Label className="text-sm font-medium">Recharge plans</Label>
          <p className="mt-0.5 text-xs text-muted">
            Select a plan to fill the amount, or enter it manually.
          </p>
        </div>

        {loading ? (
          <div className={`${panelBodyClass} gap-2`}>
            <Spinner size="sm" />
            Loading plans…
          </div>
        ) : awaitingSelection ? (
          <div className={panelBodyClass}>{awaitingMessage}</div>
        ) : categories.length === 0 ? (
          <div className={panelBodyClass}>
            No plans available for this operator and circle.
          </div>
        ) : (
          <>
            {categoryNames.length > 1 ? (
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {categoryNames.map((name) => (
                  <Button
                    key={name}
                    className="h-8 min-w-0 max-w-full px-2.5 text-xs"
                    size="sm"
                    variant={resolvedCategory === name ? "primary" : "secondary"}
                    onPress={() => setActiveCategory(name)}
                  >
                    <span className="truncate">{name}</span>
                  </Button>
                ))}
              </div>
            ) : null}

            <div
              className={`${panelHeightClass} overflow-y-auto rounded-lg border border-default-200 p-2`}
            >
              <ul className="grid gap-2 sm:grid-cols-1">
                {activePlans.map((plan) => {
                  const selected = selectedAmount === plan.amount;
                  const categoryName = resolvedCategory ?? "Plan";
                  return (
                    <li key={planKey(plan)}>
                      <div
                        className={`overflow-hidden rounded-lg border transition-colors ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-default-200 bg-surface"
                        }`}
                      >
                        <button
                          className="flex w-full flex-col gap-1 px-3 py-2.5 text-left text-sm hover:bg-default-50/80"
                          type="button"
                          onClick={() => onSelectAmount(plan.amount)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold tabular-nums">
                              ₹{plan.amount}
                            </span>
                            <span className="shrink-0 text-xs text-muted">
                              {plan.validity}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-xs text-foreground/80">
                            {plan.description}
                          </p>
                        </button>
                        <div className="flex justify-center border-t border-default-200/80 px-2 py-2">
                          <Link
                            className="text-xs font-medium"
                            onPress={() =>
                              setDetailPlan({ plan, categoryName })
                            }
                          >
                            View details
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}

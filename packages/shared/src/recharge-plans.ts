/** Normalized prepaid plan catalog (from planapi RDATA). */

export type RechargePlanItem = {
  amount: number;
  validity: string;
  description: string;
  type?: string;
};

export type RechargePlanCategory = {
  name: string;
  plans: RechargePlanItem[];
};

export type RechargePlansCatalog = {
  operator: string;
  circle: string;
  categories: RechargePlanCategory[];
};

export type RechargePlansApiResponse = {
  operator: string;
  circleCode: string | null;
  circleLabel: string | null;
  categories: RechargePlanCategory[];
  cached: boolean;
  fetchedAt: string;
  totalPlans: number;
};

type PlanapiPlanRow = {
  rs?: number | string;
  validity?: string;
  desc?: string;
  Type?: string;
};

/** Flatten planapi NewMobilePlans / Operatorplan RDATA into a stable catalog shape. */
export function normalizePlanapiPlansPayload(params: {
  operator: string;
  circle: string;
  rdata: Record<string, unknown> | null | undefined;
}): RechargePlansCatalog {
  const categories: RechargePlanCategory[] = [];
  const rdata = params.rdata ?? {};

  for (const [name, value] of Object.entries(rdata)) {
    if (!Array.isArray(value)) continue;

    const plans: RechargePlanItem[] = [];
    for (const raw of value) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as PlanapiPlanRow;
      const amount = Number(row.rs);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      plans.push({
        amount: Math.round(amount),
        validity: String(row.validity ?? "").trim() || "—",
        description: String(row.desc ?? "").trim() || name,
        type: row.Type ? String(row.Type) : undefined,
      });
    }

    if (plans.length > 0) {
      plans.sort((a, b) => a.amount - b.amount);
      categories.push({ name, plans });
    }
  }

  categories.sort((a, b) => a.name.localeCompare(b.name));

  return {
    operator: params.operator,
    circle: params.circle,
    categories,
  };
}

export function countPlansInCatalog(catalog: RechargePlansCatalog): number {
  return catalog.categories.reduce((sum, cat) => sum + cat.plans.length, 0);
}

/** Normalized prepaid plan catalog (from planapi RDATA). */

export type RechargePlanItem = {
  amount: number;
  validity: string;
  description: string;
  data?: string;
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
  data?: string;
  Data?: string;
  Type?: string;
};

/** Short data label for list UIs (parsed from planapi desc when needed). */
export function extractPlanDataLabel(plan: RechargePlanItem): string | undefined {
  const explicit = plan.data?.trim();
  if (explicit) return explicit;

  const desc = plan.description.trim();
  if (!desc) return undefined;

  const dataColon = desc.match(/\bData\s*:\s*([^|]+)/i);
  if (dataColon?.[1]?.trim()) return dataColon[1].trim();

  const getData = desc.match(
    /(?:Get\s+)?(\d+(?:\.\d+)?\s*(?:GB|MB)\s*Data[^.|\n]*)/i,
  );
  if (getData?.[1]?.trim()) return getData[1].trim();

  const gbPerDay = desc.match(/(\d+(?:\.\d+)?\s*(?:GB|MB)\s*\/\s*day)/i);
  if (gbPerDay?.[1]?.trim()) return gbPerDay[1].trim();

  const gbData = desc.match(/(\d+(?:\.\d+)?\s*(?:GB|MB)\s*(?:4G\/5G\s*)?[Dd]ata)/i);
  if (gbData?.[1]?.trim()) return gbData[1].trim();

  const unlimited = desc.match(/Unlimited\s+(?:5G\s+)?[Dd]ata[^).\n|]*/i);
  if (unlimited?.[0]?.trim()) return unlimited[0].trim();

  const unlimitedLower = desc.match(/[Uu]nlimited\s+data[^.]*/);
  if (unlimitedLower?.[0]?.trim()) return unlimitedLower[0].trim();

  return undefined;
}

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

      const description = String(row.desc ?? "").trim() || name;
      const item: RechargePlanItem = {
        amount: Math.round(amount),
        validity: String(row.validity ?? "").trim() || "—",
        description,
        data:
          String(row.data ?? row.Data ?? "").trim() ||
          extractPlanDataLabel({
            amount: Math.round(amount),
            validity: String(row.validity ?? "").trim() || "—",
            description,
          }),
        type: row.Type ? String(row.Type) : undefined,
      };
      plans.push(item);
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

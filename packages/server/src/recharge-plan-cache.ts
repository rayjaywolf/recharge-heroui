import {
  countPlansInCatalog,
  normalizePlanapiPlansPayload,
  type RechargePlansApiResponse,
  type RechargePlansCatalog,
} from "@repo/shared/recharge-plans";
import {
  mapInternalOperatorToPlanapiOpCode,
  resolvePlanapiCircleCode,
} from "@repo/shared/planapi-mapping";
import { createId, db, rechargePlanCache } from "@repo/db";
import { and, eq } from "drizzle-orm";

import { fetchPlanapiMobilePlans, isPlanapiConfigured } from "./planapi";

const DEFAULT_TTL_HOURS = 48;

function plansTtlMs(): number {
  const raw = process.env.PLANAPI_PLANS_TTL_HOURS?.trim();
  const hours = raw ? Number(raw) : DEFAULT_TTL_HOURS;
  if (!Number.isFinite(hours) || hours <= 0) {
    return DEFAULT_TTL_HOURS * 60 * 60 * 1000;
  }
  return hours * 60 * 60 * 1000;
}

export function isRechargePlansEnabled(): boolean {
  return isPlanapiConfigured();
}

export async function getRechargePlansForPair(params: {
  operatorLabel: string;
  internalCircleCode: string | null;
  circleLabel: string | null;
  planapiOpCode?: string | null;
  planapiCircleCode?: string | null;
  planapiCircleName?: string | null;
}): Promise<RechargePlansApiResponse | null> {
  if (!isPlanapiConfigured()) return null;

  const planapiOpCode =
    String(params.planapiOpCode ?? "").trim() ||
    mapInternalOperatorToPlanapiOpCode(params.operatorLabel);
  const planapiCircleCode = resolvePlanapiCircleCode({
    planapiCircleCode: params.planapiCircleCode,
    planapiCircleName: params.planapiCircleName,
    internalCircleCode: params.internalCircleCode,
  });

  if (!planapiOpCode || !planapiCircleCode) return null;

  const now = new Date();
  const existing = await db
    .select()
    .from(rechargePlanCache)
    .where(
      and(
        eq(rechargePlanCache.planapiOperatorCode, planapiOpCode),
        eq(rechargePlanCache.planapiCircleCode, planapiCircleCode),
      ),
    )
    .limit(1);

  const row = existing[0];
  if (row && row.expiresAt > now) {
    const catalog = JSON.parse(row.payload) as RechargePlansCatalog;
    return toApiResponse({
      catalog,
      operatorLabel: params.operatorLabel,
      internalCircleCode: params.internalCircleCode,
      circleLabel: params.circleLabel ?? row.circleLabel,
      cached: true,
      fetchedAt: row.fetchedAt,
    });
  }

  const raw = await fetchPlanapiMobilePlans({
    operatorCode: planapiOpCode,
    circleCode: planapiCircleCode,
  });

  const catalog = normalizePlanapiPlansPayload({
    operator: raw.operator || params.operatorLabel,
    circle: raw.circle || params.circleLabel || "",
    rdata: raw.rdata,
  });

  const fetchedAt = now;
  const expiresAt = new Date(fetchedAt.getTime() + plansTtlMs());
  const payload = JSON.stringify(catalog);

  if (row) {
    await db
      .update(rechargePlanCache)
      .set({
        operatorLabel: params.operatorLabel,
        circleLabel: params.circleLabel ?? raw.circle ?? "",
        payload,
        fetchedAt,
        expiresAt,
      })
      .where(eq(rechargePlanCache.id, row.id));
  } else {
    await db.insert(rechargePlanCache).values({
      id: createId(),
      planapiOperatorCode: planapiOpCode,
      planapiCircleCode: planapiCircleCode,
      operatorLabel: params.operatorLabel,
      circleLabel: params.circleLabel ?? raw.circle ?? "",
      payload,
      fetchedAt,
      expiresAt,
    });
  }

  return toApiResponse({
    catalog,
    operatorLabel: params.operatorLabel,
    internalCircleCode: params.internalCircleCode,
    circleLabel: params.circleLabel ?? raw.circle ?? null,
    cached: false,
    fetchedAt,
  });
}

function toApiResponse(params: {
  catalog: RechargePlansCatalog;
  operatorLabel: string;
  internalCircleCode: string | null;
  circleLabel: string | null;
  cached: boolean;
  fetchedAt: Date;
}): RechargePlansApiResponse {
  return {
    operator: params.operatorLabel,
    circleCode: params.internalCircleCode,
    circleLabel: params.circleLabel,
    categories: params.catalog.categories,
    cached: params.cached,
    fetchedAt: params.fetchedAt.toISOString(),
    totalPlans: countPlansInCatalog(params.catalog),
  };
}

import { createId, db, operatorLookupCache } from "@repo/db";
import type { CircleOption } from "@repo/shared/recharge-config";
import { normalizePhoneNumber, validatePhoneNumber } from "@repo/shared/phone";
import { eq } from "drizzle-orm";

import {
  fetchPlanapiOperatorLookup,
  isPlanapiConfigured,
  lookupMobileOperatorAndCircleFromPlanapi,
  type PlanapiOperatorLookupResult,
  type PlanapiRawResponse,
} from "./planapi";

const DEFAULT_TTL_HOURS = 168;

function operatorLookupTtlMs(): number {
  const raw = process.env.PLANAPI_OPERATOR_LOOKUP_TTL_HOURS?.trim();
  const hours = raw ? Number(raw) : DEFAULT_TTL_HOURS;
  if (!Number.isFinite(hours) || hours <= 0) {
    return DEFAULT_TTL_HOURS * 60 * 60 * 1000;
  }
  return hours * 60 * 60 * 1000;
}

async function getCachedPlanapiResponse(
  phone: string,
): Promise<PlanapiRawResponse | null> {
  const now = new Date();
  const rows = await db
    .select()
    .from(operatorLookupCache)
    .where(eq(operatorLookupCache.phone, phone))
    .limit(1);

  const row = rows[0];
  if (!row || row.expiresAt <= now) return null;

  try {
    return JSON.parse(row.payload) as PlanapiRawResponse;
  } catch {
    return null;
  }
}

async function saveCachedPlanapiResponse(
  phone: string,
  planapi: PlanapiRawResponse,
): Promise<void> {
  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt.getTime() + operatorLookupTtlMs());
  const payload = JSON.stringify(planapi);

  const existing = await db
    .select({ id: operatorLookupCache.id })
    .from(operatorLookupCache)
    .where(eq(operatorLookupCache.phone, phone))
    .limit(1);

  const row = existing[0];
  if (row) {
    await db
      .update(operatorLookupCache)
      .set({ payload, fetchedAt, expiresAt })
      .where(eq(operatorLookupCache.id, row.id));
  } else {
    await db.insert(operatorLookupCache).values({
      id: createId(),
      phone,
      payload,
      fetchedAt,
      expiresAt,
    });
  }
}

export async function lookupMobileOperatorAndCircleCached(params: {
  phone: string;
  configuredOperators: string[];
  circlesByProvider: Record<string, CircleOption[]>;
  operatorProviders: Record<string, string>;
}): Promise<PlanapiOperatorLookupResult & { lookupCached: boolean }> {
  const normalized = normalizePhoneNumber(params.phone);
  if (!validatePhoneNumber(normalized)) {
    throw new Error("Enter a valid 10-digit Indian mobile number.");
  }

  if (!isPlanapiConfigured()) {
    throw new Error("Operator lookup is not configured on the server.");
  }

  const resolve = (planapi: PlanapiRawResponse) =>
    lookupMobileOperatorAndCircleFromPlanapi({
      planapi,
      configuredOperators: params.configuredOperators,
      circlesByProvider: params.circlesByProvider,
      operatorProviders: params.operatorProviders,
    });

  const cached = await getCachedPlanapiResponse(normalized);
  if (cached) {
    try {
      return { ...resolve(cached), lookupCached: true };
    } catch {
      await db
        .delete(operatorLookupCache)
        .where(eq(operatorLookupCache.phone, normalized));
    }
  }

  const planapi = await fetchPlanapiOperatorLookup(normalized);
  const errorCode = String(planapi.ERROR ?? "").trim();
  if (errorCode === "0") {
    await saveCachedPlanapiResponse(normalized, planapi);
  }

  return { ...resolve(planapi), lookupCached: false };
}

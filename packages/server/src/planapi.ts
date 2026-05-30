import {
  mapPlanapiCircleCode,
  mapPlanapiOperatorKey,
  matchConfiguredCircle,
  matchConfiguredOperator,
} from "@repo/shared/planapi-mapping";
import type { CircleOption } from "@repo/shared/recharge-config";
import { normalizePhoneNumber, validatePhoneNumber } from "@repo/shared/phone";

export type PlanapiOperatorLookupResult = {
  operator: string;
  circleCode: string | null;
  circleLabel: string | null;
  planapi: {
    operator: string;
    opCode: string;
    circle: string;
    circleCode: string;
    message: string;
  };
};

export type PlanapiRawResponse = {
  ERROR?: string;
  STATUS?: string;
  Mobile?: string;
  Operator?: string;
  OpCode?: string | null;
  Circle?: string;
  CircleCode?: string | null;
  Message?: string;
};

export function isPlanapiConfigured(): boolean {
  return Boolean(
    process.env.PLANAPI_USER_ID?.trim() &&
      process.env.PLANAPI_API_PASSWORD?.trim(),
  );
}

export async function fetchPlanapiOperatorLookup(
  phone: string,
): Promise<PlanapiRawResponse> {
  const userId = process.env.PLANAPI_USER_ID?.trim();
  const password = process.env.PLANAPI_API_PASSWORD?.trim();
  if (!userId || !password) {
    throw new Error("Planapi credentials are not configured.");
  }

  const url = new URL("https://planapi.in/api/Mobile/OperatorFetchNew");
  url.searchParams.set("ApiUserID", userId);
  url.searchParams.set("ApiPassword", password);
  url.searchParams.set("Mobileno", phone);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Planapi request failed (${response.status}).`);
  }

  const data = (await response.json()) as PlanapiRawResponse;
  return data;
}

export function resolveOperatorLookupFromPlanapi(params: {
  planapi: PlanapiRawResponse;
  configuredOperators: string[];
  circlesForOperator: CircleOption[];
}): PlanapiOperatorLookupResult | null {
  const errorCode = String(params.planapi.ERROR ?? "").trim();
  if (errorCode !== "0") {
    return null;
  }

  const planapiOperator = String(params.planapi.Operator ?? "").trim();
  const planapiOpCode = String(params.planapi.OpCode ?? "").trim();
  const planapiCircle = String(params.planapi.Circle ?? "").trim();
  const planapiCircleCode = String(params.planapi.CircleCode ?? "").trim();

  const internalKey = mapPlanapiOperatorKey(planapiOpCode, planapiOperator);
  const operator = matchConfiguredOperator(
    internalKey,
    params.configuredOperators,
  );
  if (!operator) return null;

  const internalCircle = mapPlanapiCircleCode(
    planapiCircleCode,
    planapiCircle,
  );
  const allowedCodes = params.circlesForOperator.map((c) => c.code);
  const circleCode = matchConfiguredCircle(internalCircle, allowedCodes);
  const circleLabel =
    circleCode != null
      ? (params.circlesForOperator.find((c) => c.code === circleCode)?.label ??
        planapiCircle)
      : null;

  return {
    operator,
    circleCode,
    circleLabel,
    planapi: {
      operator: planapiOperator,
      opCode: planapiOpCode,
      circle: planapiCircle,
      circleCode: planapiCircleCode,
      message: String(params.planapi.Message ?? "").trim(),
    },
  };
}

export function lookupMobileOperatorAndCircleFromPlanapi(params: {
  planapi: PlanapiRawResponse;
  configuredOperators: string[];
  circlesByProvider: Record<string, CircleOption[]>;
  operatorProviders: Record<string, string>;
}): PlanapiOperatorLookupResult {
  const errorCode = String(params.planapi.ERROR ?? "").trim();
  if (errorCode !== "0") {
    const message =
      String(params.planapi.Message ?? "").trim() ||
      "Could not detect operator for this number.";
    throw new Error(message);
  }

  const internalKey = mapPlanapiOperatorKey(
    String(params.planapi.OpCode ?? ""),
    String(params.planapi.Operator ?? ""),
  );
  const operator = matchConfiguredOperator(
    internalKey,
    params.configuredOperators,
  );
  if (!operator) {
    const detected =
      String(params.planapi.Operator ?? "").trim() || internalKey;
    throw new Error(
      `Detected ${detected}, but no matching operator is configured for recharge.`,
    );
  }

  const provider = params.operatorProviders[operator] ?? "TEST";
  const circlesForOperator = params.circlesByProvider[provider] ?? [];

  const resolved = resolveOperatorLookupFromPlanapi({
    planapi: params.planapi,
    configuredOperators: params.configuredOperators,
    circlesForOperator,
  });

  if (!resolved) {
    throw new Error("Could not map operator lookup to your recharge settings.");
  }

  return resolved;
}

/** Uncached lookup — prefer {@link lookupMobileOperatorAndCircleCached}. */
export async function lookupMobileOperatorAndCircle(params: {
  phone: string;
  configuredOperators: string[];
  circlesByProvider: Record<string, CircleOption[]>;
  operatorProviders: Record<string, string>;
}): Promise<PlanapiOperatorLookupResult> {
  const normalized = normalizePhoneNumber(params.phone);
  if (!validatePhoneNumber(normalized)) {
    throw new Error("Enter a valid 10-digit Indian mobile number.");
  }

  if (!isPlanapiConfigured()) {
    throw new Error("Operator lookup is not configured on the server.");
  }

  const planapi = await fetchPlanapiOperatorLookup(normalized);
  return lookupMobileOperatorAndCircleFromPlanapi({
    planapi,
    configuredOperators: params.configuredOperators,
    circlesByProvider: params.circlesByProvider,
    operatorProviders: params.operatorProviders,
  });
}

type PlanapiMobilePlansRaw = {
  ERROR?: string;
  STATUS?: string;
  Operator?: string;
  Circle?: string;
  RDATA?: Record<string, unknown>;
  Message?: string;
};

export async function fetchPlanapiMobilePlans(params: {
  operatorCode: string;
  circleCode: string;
}): Promise<{
  operator: string;
  circle: string;
  rdata: Record<string, unknown>;
}> {
  const userId = process.env.PLANAPI_USER_ID?.trim();
  const password = process.env.PLANAPI_API_PASSWORD?.trim();
  if (!userId || !password) {
    throw new Error("Planapi credentials are not configured.");
  }

  const url = new URL("https://planapi.in/api/Mobile/NewMobilePlans");
  url.searchParams.set("apimember_id", userId);
  url.searchParams.set("api_password", password);
  url.searchParams.set("operatorcode", params.operatorCode);
  url.searchParams.set("cricle", params.circleCode);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Planapi plans request failed (${response.status}).`);
  }

  const data = (await response.json()) as PlanapiMobilePlansRaw;
  const errorCode = String(data.ERROR ?? "").trim();
  if (errorCode !== "0") {
    const message =
      String(data.Message ?? "").trim() || "Could not load recharge plans.";
    throw new Error(message);
  }

  return {
    operator: String(data.Operator ?? "").trim(),
    circle: String(data.Circle ?? "").trim(),
    rdata: data.RDATA ?? {},
  };
}
